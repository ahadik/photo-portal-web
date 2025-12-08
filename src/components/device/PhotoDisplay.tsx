import { useState, useEffect } from 'react'
import { PhotoEntry } from '../../types'
import { getPhotoDownloadUrl } from '../../services/api'

interface PhotoDisplayProps {
  photo: PhotoEntry | null
  isLoading?: boolean
}

/**
 * PhotoDisplay component renders a single photo with proper fill behavior.
 * Uses CSS object-fit: cover and centering to satisfy "Photo Fill" requirement.
 * Uses Firebase Storage SDK to get authenticated download URLs.
 */
export default function PhotoDisplay({ photo, isLoading }: PhotoDisplayProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  // Fetch authenticated download URL when photo changes
  useEffect(() => {
    if (!photo) {
      setImageUrl(null)
      setImageError(null)
      return
    }

    let cancelled = false

    async function loadImageUrl() {
      try {
        setImageError(null)
        const url = await getPhotoDownloadUrl(photo.id)
        if (!cancelled) {
          setImageUrl(url)
        }
      } catch (error: any) {
        console.error('Failed to load photo URL:', error)
        if (!cancelled) {
          setImageError(error.message || 'Failed to load image')
        }
      }
    }

    loadImageUrl()

    return () => {
      cancelled = true
    }
  }, [photo])

  if (isLoading || !photo) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
        }}
      >
        <div style={{ color: '#fff', fontSize: '1.5rem' }}>Loading...</div>
      </div>
    )
  }

  if (imageError) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          flexDirection: 'column',
        }}
      >
        <div style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>
          Error loading photo
        </div>
        <div style={{ color: '#888', fontSize: '0.875rem' }}>{imageError}</div>
      </div>
    )
  }

  if (!imageUrl) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
        }}
      >
        <div style={{ color: '#fff', fontSize: '1.5rem' }}>Loading image...</div>
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        overflow: 'hidden',
      }}
    >
      <img
        src={imageUrl}
        alt={photo.location?.name || 'Photo'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
        loading="eager"
        onError={() => {
          setImageError('Failed to display image')
        }}
      />
    </div>
  )
}
