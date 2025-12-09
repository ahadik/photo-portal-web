import { useState, useEffect } from 'react'
import { PhotoEntry } from '../../types'
import { getPhotoDownloadUrl } from '../../services/api'
import { PhotoComposition } from '../../utils/compositions'

interface PhotoDisplayProps {
  composition: PhotoComposition | null
  isLoading?: boolean
}

/**
 * Hook to load image URLs for photos
 */
function usePhotoUrl(photo: PhotoEntry | null): { url: string | null; error: string | null } {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  useEffect(() => {
    if (!photo) {
      setImageUrl(null)
      setImageError(null)
      return
    }

    let cancelled = false
    const photoId = photo.id

    async function loadImageUrl() {
      try {
        setImageError(null)
        const url = await getPhotoDownloadUrl(photoId)
        if (!cancelled) {
          setImageUrl(url)
        }
      } catch (error: unknown) {
        console.error('Failed to load photo URL:', error)
        if (!cancelled) {
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to load image'
          setImageError(errorMessage)
        }
      }
    }

    void loadImageUrl()

    return () => {
      cancelled = true
    }
  }, [photo])

  return { url: imageUrl, error: imageError }
}

/**
 * SinglePhotoDisplay renders a single photo with different display modes
 */
function SinglePhotoDisplay({ 
  photo, 
  displayMode 
}: { 
  photo: PhotoEntry
  displayMode: 'full-bleed' | 'centered'
}) {
  const { url, error } = usePhotoUrl(photo)

  if (error) {
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
        <div style={{ color: '#888', fontSize: '0.875rem' }}>{error}</div>
      </div>
    )
  }

  if (!url) {
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

  if (displayMode === 'full-bleed') {
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
          src={url}
          alt={photo.location?.name || 'Photo'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
          loading="eager"
        />
      </div>
    )
  }

  // centered mode: photo is centered with margins so full photo is visible
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
        src={url}
        alt={photo.location?.name || 'Photo'}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          objectPosition: 'center',
        }}
        loading="eager"
      />
    </div>
  )
}

/**
 * PairPhotoDisplay renders two photos side-by-side or stacked
 */
function PairPhotoDisplay({ 
  photos, 
  displayMode 
}: { 
  photos: [PhotoEntry, PhotoEntry]
  displayMode: 'side-by-side' | 'stacked'
}) {
  const photo1Url = usePhotoUrl(photos[0])
  const photo2Url = usePhotoUrl(photos[1])

  const isLoading = !photo1Url.url || !photo2Url.url
  const hasError = photo1Url.error || photo2Url.error

  if (hasError) {
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
          Error loading photos
        </div>
      </div>
    )
  }

  if (isLoading) {
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
        <div style={{ color: '#fff', fontSize: '1.5rem' }}>Loading images...</div>
      </div>
    )
  }

  if (displayMode === 'side-by-side') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: '#000',
          overflow: 'hidden',
        }}
      >
        <div style={{ width: '50%', height: '100%', overflow: 'hidden' }}>
          <img
            src={photo1Url.url!}
            alt={photos[0].location?.name || 'Photo 1'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
            loading="eager"
          />
        </div>
        <div style={{ width: '50%', height: '100%', overflow: 'hidden' }}>
          <img
            src={photo2Url.url!}
            alt={photos[1].location?.name || 'Photo 2'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
            loading="eager"
          />
        </div>
      </div>
    )
  }

  // stacked mode
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#000',
        overflow: 'hidden',
      }}
    >
      <div style={{ width: '100%', height: '50%', overflow: 'hidden' }}>
        <img
          src={photo1Url.url!}
          alt={photos[0].location?.name || 'Photo 1'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
          loading="eager"
        />
      </div>
      <div style={{ width: '100%', height: '50%', overflow: 'hidden' }}>
        <img
          src={photo2Url.url!}
          alt={photos[1].location?.name || 'Photo 2'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
          loading="eager"
        />
      </div>
    </div>
  )
}

/**
 * PhotoDisplay component renders a photo composition (single or pair) with proper display behavior.
 * Uses Firebase Storage SDK to get authenticated download URLs.
 */
export default function PhotoDisplay({ composition, isLoading }: PhotoDisplayProps) {
  if (isLoading || !composition) {
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

  if (composition.type === 'single') {
    return (
      <SinglePhotoDisplay 
        photo={composition.photos[0]} 
        displayMode={composition.displayMode as 'full-bleed' | 'centered'}
      />
    )
  }

  // composition.type === 'pair'
  return (
    <PairPhotoDisplay 
      photos={[composition.photos[0], composition.photos[1]] as [PhotoEntry, PhotoEntry]}
      displayMode={composition.displayMode as 'side-by-side' | 'stacked'}
    />
  )
}
