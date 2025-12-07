import { useState } from 'react'
import { ref, uploadBytesResumable } from 'firebase/storage'
import { storage } from '../../services/firebase'
import { config } from '../../config'

interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'complete' | 'error'
  error?: string
}

function PhotoUploader() {
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [dragging, setDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!files) return

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`)
        return
      }

      const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const uploadRef = ref(storage, `${config.mediaBucket}/uploads/${uploadId}.jpg`)

      const uploadTask = uploadBytesResumable(uploadRef, file)

      const newUpload: UploadProgress = {
        file,
        progress: 0,
        status: 'uploading',
      }
      setUploads((prev) => [...prev, newUpload])

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          setUploads((prev) =>
            prev.map((u) =>
              u.file === file ? { ...u, progress } : u
            )
          )
        },
        (error) => {
          setUploads((prev) =>
            prev.map((u) =>
              u.file === file
                ? { ...u, status: 'error', error: error.message }
                : u
            )
          )
        },
        () => {
          setUploads((prev) =>
            prev.map((u) =>
              u.file === file ? { ...u, status: 'complete', progress: 100 } : u
            )
          )
        }
      )
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => {
    setDragging(false)
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${dragging ? '#039be5' : '#ccc'}`,
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: dragging ? '#f0f8ff' : '#fafafa',
          cursor: 'pointer',
        }}
      >
        <p>Drag and drop photos here, or</p>
        <label style={{ cursor: 'pointer', color: '#039be5', textDecoration: 'underline' }}>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFiles(e.target.files)}
            style={{ display: 'none' }}
          />
          select files
        </label>
      </div>

      {uploads.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Upload Progress</h3>
          {uploads.map((upload, idx) => (
            <div key={idx} style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>{upload.file.name}</span>
                <span>
                  {upload.status === 'uploading' && `${Math.round(upload.progress)}%`}
                  {upload.status === 'complete' && 'Complete'}
                  {upload.status === 'error' && `Error: ${upload.error}`}
                </span>
              </div>
              {upload.status === 'uploading' && (
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${upload.progress}%`,
                      height: '100%',
                      backgroundColor: '#039be5',
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PhotoUploader
