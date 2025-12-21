import { useState, useEffect, useCallback } from 'react'
import { ref, uploadBytesResumable, listAll, getDownloadURL } from 'firebase/storage'
import { mediaStorage, dataStorage, processBatches, cleanupFailedBatches } from '~/services/firebase'
import classNames from 'classnames'

import './PhotoUploader.css';

interface UploadProgress {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'complete' | 'error'
  error?: string
}

interface ProcessingStatus {
  processId: string | null
  isProcessing: boolean
  error: string | null
  progress?: {
    completed: number
    total: number
  }
}

// Simple UUID generator
function generateUUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`
}

function PhotoUploader() {
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [dragging, setDragging] = useState(false)
  const [unprocessedBatches, setUnprocessedBatches] = useState<string[]>([])
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set())
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    processId: null,
    isProcessing: false,
    error: null,
  })

  // Check if any uploads are in progress
  const isUploading = uploads.some(u => u.status === 'uploading')

  // Check for unprocessed batches
  const checkForUnprocessedBatches = async () => {
    try {
      const uploadsRef = ref(mediaStorage, 'uploads/')
      const result = await listAll(uploadsRef)
      
      // Extract batch IDs from prefixes (directories)
      const batchIds: string[] = []
      const seenBatches = new Set<string>()
      
      for (const itemRef of result.prefixes) {
        const batchId = itemRef.name
        if (!seenBatches.has(batchId)) {
          seenBatches.add(batchId)
          batchIds.push(batchId)
        }
      }
      
      setUnprocessedBatches(batchIds)
    } catch (error) {
      console.error('Error checking for unprocessed batches:', error)
    }
  }

  // Check processing status
  const checkProcessingStatus = useCallback(async (processId: string) => {
    try {
      const logFilePath = `logs/${processId}.log`
      const logFileRef = ref(dataStorage, logFilePath)
      
      // Check if log file exists
      let logExists = false
      try {
        await getDownloadURL(logFileRef)
        logExists = true
      } catch {
        logExists = false
      }

      // Check if any batch directories still exist
      const uploadsRef = ref(mediaStorage, 'uploads/')
      const result = await listAll(uploadsRef)
      const batchDirsExist = result.prefixes.length > 0

      if (logExists && batchDirsExist) {
        // Still processing - try to parse log for progress
        try {
          const logUrl = await getDownloadURL(logFileRef)
          const logResponse = await fetch(logUrl)
          const logText = await logResponse.text()
          const lines = logText.trim().split('\n').filter(l => l)
          
          let totalPhotos = 0
          let completedPhotos = 0
          let hasError = false
          let errorMessage: string | null = null

          for (const line of lines) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const entry = JSON.parse(line) as { type?: string; totalPhotos?: number; error?: string }
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (entry.type === 'count') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                totalPhotos = entry.totalPhotos || 0
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              } else if (entry.type === 'complete' || entry.type === 'skip') {
                completedPhotos++
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              } else if (entry.type === 'error') {
                hasError = true
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                errorMessage = entry.error || 'Unknown error'
              }
            } catch {
              // Skip invalid JSON lines
            }
          }

          setProcessingStatus({
            processId,
            isProcessing: !hasError,
            error: hasError ? errorMessage : null,
            progress: totalPhotos > 0 ? { completed: completedPhotos, total: totalPhotos } : undefined,
          })
        } catch (parseError) {
          // Log exists but can't parse - assume still processing
          setProcessingStatus({
            processId,
            isProcessing: true,
            error: null,
          })
        }
      } else if (!logExists && !batchDirsExist) {
        // Complete - log deleted and directories cleaned up
        setProcessingStatus({
          processId: null,
          isProcessing: false,
          error: null,
        })
        // Refresh batch list
        await checkForUnprocessedBatches()
      } else if (!logExists && batchDirsExist) {
        // Error state - log missing but directories exist
        setProcessingStatus({
          processId,
          isProcessing: false,
          error: 'Processing failed to start',
        })
      }
    } catch (error) {
      console.error('Error checking processing status:', error)
    }
  }, [])

  const startUpload = async (file: File, batchId: string, uploadId: string) => {
    // Always use .jpg extension
    const uploadRef = ref(mediaStorage, `uploads/${batchId}/${uploadId}.jpg`)

    const uploadTask = uploadBytesResumable(uploadRef, file)

    // Use promise-based completion check as backup
    uploadTask.then(
      () => {
        // Upload completed successfully
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId ? { ...u, status: 'complete', progress: 100 } : u
          )
        )
      },
      (error) => {
        // Upload failed
        console.error(`Upload error for ${uploadId}:`, error)
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? { ...u, status: 'error', error: error.message }
              : u
          )
        )
      }
    )

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        
        // Only mark complete if state is actually 'success'
        const isComplete = snapshot.state === 'success'
        
        setUploads((prev) =>
          prev.map((u) => {
            if (u.id === uploadId) {
              return {
                ...u,
                progress,
                status: isComplete ? 'complete' : u.status,
              }
            }
            return u
          })
        )
      },
      (error) => {
        console.error(`Upload error for ${uploadId}:`, error)
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? { ...u, status: 'error', error: error.message }
              : u
          )
        )
      },
      () => {
        // Completion callback - explicitly mark as complete
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId ? { ...u, status: 'complete', progress: 100 } : u
          )
        )
      }
    )

    // Wait for upload to complete
    await uploadTask
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files) return

    // If uploads are in progress, don't allow new uploads
    if (isUploading) {
      alert('Please wait for current uploads to complete before starting new ones')
      return
    }

    // Generate batch ID for this set of files
    const batchId = generateUUID()
    const fileArray = Array.from(files)

    // Filter valid files and create upload entries
    const validFiles: Array<{file: File; uploadId: string}> = []
    fileArray.forEach((file) => {
      if (file.type.match(/^image\/(jpeg|jpg)$/i)) {
        const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        validFiles.push({ file, uploadId })
        
        const newUpload: UploadProgress = {
          id: uploadId,
          file,
          progress: 0,
          status: 'uploading',
        }
        setUploads((prev) => [...prev, newUpload])
      } else {
        alert(`${file.name} is not a JPEG image file. Only JPEG photos are allowed.`)
      }
    })

    // Process uploads with concurrency limit (3 at a time to avoid overwhelming connections)
    const CONCURRENT_UPLOADS = 3
    for (let i = 0; i < validFiles.length; i += CONCURRENT_UPLOADS) {
      const batch = validFiles.slice(i, i + CONCURRENT_UPLOADS)
      await Promise.all(
        batch.map(({ file, uploadId }) => startUpload(file, batchId, uploadId))
      )
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    void handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => {
    setDragging(false)
  }

  const handleProcessBatches = async () => {
    const batchesToProcess = unprocessedBatches.length === 1 
      ? unprocessedBatches 
      : Array.from(selectedBatches)
    
    if (batchesToProcess.length === 0) {
      alert('Please select at least one batch to process')
      return
    }

    // Set processing state immediately for UI feedback
    setProcessingStatus({
      processId: null, // Will be set when we get the response
      isProcessing: true,
      error: null,
    })
    setSelectedBatches(new Set())

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const result = await processBatches({ batchIds: batchesToProcess })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const data = result.data as { processId: string; status: string }
      
      // Update with processId to start polling
      setProcessingStatus({
        processId: data.processId,
        isProcessing: true,
        error: null,
      })
    } catch (error) {
      console.error('Error starting batch processing:', error)
      setProcessingStatus({
        processId: null,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to start processing',
      })
    }
  }

  const handleCleanup = async () => {
    const failedBatches = unprocessedBatches
    if (failedBatches.length === 0) {
      return
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      await cleanupFailedBatches({ batchIds: failedBatches })
      setProcessingStatus({
        processId: null,
        isProcessing: false,
        error: null,
      })
      void checkForUnprocessedBatches()
    } catch (error) {
      console.error('Error cleaning up batches:', error)
      alert('Failed to cleanup batches. Please try again.')
    }
  }

  const toggleBatchSelection = (batchId: string) => {
    setSelectedBatches((prev) => {
      const next = new Set(prev)
      if (next.has(batchId)) {
        next.delete(batchId)
      } else {
        next.add(batchId)
      }
      return next
    })
  }

  // Check for unprocessed batches on mount and periodically
  useEffect(() => {
    void checkForUnprocessedBatches()
    const interval = setInterval(() => {
      void checkForUnprocessedBatches()
    }, 60000) // Every 60 seconds
    return () => clearInterval(interval)
  }, [])

  // Check for unprocessed batches when uploads complete
  useEffect(() => {
    if (!isUploading && uploads.length > 0) {
      const allDone = uploads.every(u => u.status === 'complete' || u.status === 'error')
      if (allDone) {
        // Clear uploads after a delay and check for batches
        setTimeout(() => {
          setUploads([])
          void checkForUnprocessedBatches()
        }, 2000)
      }
    }
  }, [uploads, isUploading])

  // Poll processing status when processing is active
  useEffect(() => {
    if (!processingStatus.isProcessing) {
      return
    }

    // If we have a processId, poll immediately and then every 30 seconds
    if (processingStatus.processId) {
      void checkProcessingStatus(processingStatus.processId)
      const interval = setInterval(() => {
        if (processingStatus.processId) {
          void checkProcessingStatus(processingStatus.processId)
        }
      }, 30000) // Every 30 seconds

      return () => clearInterval(interval)
    }
    // If processing but no processId yet, wait a bit and check for batches
    // This handles the case where the function call is still in progress
    const timeout = setTimeout(() => {
      void checkForUnprocessedBatches()
    }, 2000)

    return () => clearTimeout(timeout)
  }, [processingStatus.isProcessing, processingStatus.processId, checkProcessingStatus])

  return (
    <div>
      <div
        className={classNames('photo-uploader__drop-area', { 
          'photo-uploader__drop-area--dragging': dragging,
          'photo-uploader__drop-area--disabled': isUploading || processingStatus.isProcessing
        })}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={isUploading || processingStatus.isProcessing ? { pointerEvents: 'none', opacity: 0.6 } : {}}
      >
        <p>Drag and drop JPEG photos here, or</p>
        <label className='photo-uploader__file-input-label'>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/jpg"
            onChange={(e) => { void handleFiles(e.target.files) }}
            disabled={isUploading || processingStatus.isProcessing}
            style={{ display: 'none' }}
          />
          select files
        </label>
        {isUploading && <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>Uploads in progress... Please wait.</p>}
        {processingStatus.isProcessing && <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>Processing in progress... Please wait.</p>}
      </div>

      {uploads.length > 0 && (
        <div className='photo-uploader__uploads'>
          <h3>Upload Progress</h3>
          {uploads.map((upload) => (
            <div key={upload.id} className='photo-uploader__upload'>
              <div className='photo-uploader__file-details'>
                <span>{upload.file.name}</span>
                <span>
                  {upload.status === 'uploading' && `${Math.round(upload.progress)}%`}
                  {upload.status === 'complete' && 'Complete'}
                  {upload.status === 'error' && `Error: ${upload.error}`}
                </span>
              </div>
              {upload.status === 'uploading' && (
                <div className='photo-uploader__upload-progress'>
                  <div className='photo-uploader__upload-progress-bar'
                    style={{
                      width: `${upload.progress}%`,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {unprocessedBatches.length > 0 && !processingStatus.isProcessing && (
        <div className='photo-uploader__batch-processing' style={{ marginTop: '20px', padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <h3>Unprocessed Batches</h3>
          {unprocessedBatches.length === 1 ? (
            <div>
              <p>1 batch ready to process</p>
              <button 
                onClick={() => { void handleProcessBatches() }}
                style={{ marginTop: '10px', padding: '10px 20px', fontSize: '16px' }}
              >
                Process Batch
              </button>
            </div>
          ) : (
            <div>
              <p>{unprocessedBatches.length} batches ready to process</p>
              <div style={{ marginTop: '10px' }}>
                {unprocessedBatches.map((batchId) => (
                  <label key={batchId} style={{ display: 'block', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      checked={selectedBatches.has(batchId)}
                      onChange={() => toggleBatchSelection(batchId)}
                      style={{ marginRight: '8px' }}
                    />
                    {batchId}
                  </label>
                ))}
              </div>
              <button
                onClick={() => { void handleProcessBatches() }}
                disabled={selectedBatches.size === 0}
                style={{ 
                  marginTop: '10px', 
                  padding: '10px 20px', 
                  fontSize: '16px',
                  opacity: selectedBatches.size === 0 ? 0.5 : 1,
                  cursor: selectedBatches.size === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                Process Selected Batches ({selectedBatches.size})
              </button>
            </div>
          )}
        </div>
      )}

      {processingStatus.isProcessing && (
        <div className='photo-uploader__processing-status' style={{ marginTop: '20px', padding: '20px', border: '1px solid #4CAF50', borderRadius: '4px', backgroundColor: '#f0f8f0' }}>
          <h3>Processing Photos</h3>
          {processingStatus.progress && (
            <div style={{ marginTop: '10px' }}>
              <p>Progress: {processingStatus.progress.completed} / {processingStatus.progress.total} photos</p>
              <div style={{ width: '100%', height: '20px', backgroundColor: '#e0e0e0', borderRadius: '4px', marginTop: '10px' }}>
                <div 
                  style={{ 
                    width: `${(processingStatus.progress.completed / processingStatus.progress.total) * 100}%`,
                    height: '100%',
                    backgroundColor: '#4CAF50',
                    borderRadius: '4px',
                    transition: 'width 0.3s'
                  }}
                />
              </div>
            </div>
          )}
          {!processingStatus.progress && <p>Processing started...</p>}
        </div>
      )}

      {processingStatus.error && !processingStatus.isProcessing && (
        <div className='photo-uploader__error-status' style={{ marginTop: '20px', padding: '20px', border: '1px solid #f44336', borderRadius: '4px', backgroundColor: '#ffebee' }}>
          <h3>Processing Error</h3>
          <p style={{ color: '#d32f2f' }}>{processingStatus.error}</p>
          <button
            onClick={() => { void handleCleanup() }}
            style={{ marginTop: '10px', padding: '10px 20px', fontSize: '16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Cleanup Failed Batches
          </button>
        </div>
      )}
    </div>
  )
}

export default PhotoUploader
