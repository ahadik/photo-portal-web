import { useState, useEffect, useRef } from 'react'
import { PhotoEntry } from '~/types'
import { usePhotoUrls } from '~/contexts/PhotoUrlContext'
import { PhotoComposition } from '~/utils/compositions'

import './PhotoDisplay.css'

interface PhotoDisplayProps {
  composition: PhotoComposition | null
  isLoading?: boolean
  fadeDuration?: number // in milliseconds, default 1000ms
}

/**
 * Hook to get image URLs from context
 */
function usePhotoUrl(photo: PhotoEntry | null): { url: string | null; error: string | null } {
  const { getPhotoUrl } = usePhotoUrls()
  
  if (!photo) {
    return { url: null, error: null }
  }

  const url = getPhotoUrl(photo.id)
  
  if (!url) {
    return { 
      url: null, 
      error: `Photo URL not available for ${photo.id}` 
    }
  }

  return { url, error: null }
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
        className='photo-display__frame photo-display__frame--single'
      >
        <h4>
          Error loading photo
        </h4>
        <p>{error}</p>
      </div>
    )
  }

  if (!url) {
    return (
      <div className='photo-display__frame photo-display__frame--single'>
        <h4>Loading image...</h4>
      </div>
    )
  }

  if (displayMode === 'full-bleed') {
    return (
      <div
        className='photo-display__frame photo-display__frame--single photo-display__frame--full-bleed'
      >
        <img
          src={url}
          alt={photo.location?.name || 'Photo'}
          loading="eager"
        />
      </div>
    )
  }

  // centered mode: photo is centered with margins so full photo is visible
  return (
    <div
      className='photo-display__frame photo-display__frame--single photo-display__frame--contained'
    >
      <img
        src={url}
        alt={photo.location?.name || 'Photo'}
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
      <div className='photo-display__frame photo-display__frame--pair'>
        <h4>
          Error loading photos
        </h4>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className='photo-display__frame photo-display__frame--pair'>
        <h4>Loading images...</h4>
      </div>
    )
  }

  if (displayMode === 'side-by-side') {
    return (
      <div className='photo-display__frame photo-display__frame--full-bleed photo-display__frame--side-by-side'>
        <div className='photo-display__container'>
          <img
            src={photo1Url.url!}
            alt={photos[0].location?.name || 'Photo 1'}
            loading="eager"
          />
        </div>
        <div className='photo-display__container'>
          <img
            src={photo2Url.url!}
            alt={photos[1].location?.name || 'Photo 2'}
            loading="eager"
          />
        </div>
      </div>
    )
  }

  // stacked mode
  return (
    <div
      className='photo-display__frame photo-display__frame--full-bleed photo-display__frame--stacked'
    >
      <div className='photo-display__container'>
        <img
          src={photo1Url.url!}
          alt={photos[0].location?.name || 'Photo 1'}
          loading="eager"
        />
      </div>
      <div className='photo-display__container'>
        <img
          src={photo2Url.url!}
          alt={photos[1].location?.name || 'Photo 2'}
          loading="eager"
        />
      </div>
    </div>
  )
}

/**
 * PhotoDisplay component renders a photo composition (single or pair) with proper display behavior.
 * Uses Firebase Storage SDK to get authenticated download URLs.
 * Implements cross-fade transitions between compositions.
 */
export default function PhotoDisplay({ composition, isLoading, fadeDuration = 1000 }: PhotoDisplayProps) {
  const [currentComposition, setCurrentComposition] = useState<PhotoComposition | null>(composition)
  const [nextComposition, setNextComposition] = useState<PhotoComposition | null>(null)
  const [currentOpacity, setCurrentOpacity] = useState(1)
  const [nextOpacity, setNextOpacity] = useState(0)
  const prevCompositionIdRef = useRef<string | null>(null)

  // Handle cross-fade transition when composition changes
  useEffect(() => {
    if (!composition) {
      setCurrentComposition(null)
      setNextComposition(null)
      setCurrentOpacity(1)
      setNextOpacity(0)
      prevCompositionIdRef.current = null
      return
    }

    // Create a unique ID for the composition based on photo IDs
    const compositionId = composition.photos.map(p => p.id).join('-')
    
    if (prevCompositionIdRef.current && prevCompositionIdRef.current !== compositionId) {
      // Cross-fade: fade out current, fade in next
      setNextComposition(composition)
      setNextOpacity(0)
      // Use requestAnimationFrame to ensure the new composition is rendered before starting fade
      let timer: NodeJS.Timeout | null = null
      let rafId2: number | null = null
      const rafId1 = requestAnimationFrame(() => {
        rafId2 = requestAnimationFrame(() => {
          setCurrentOpacity(0)
          setNextOpacity(1)
          // After fade completes, make next the current
          timer = setTimeout(() => {
            setCurrentComposition(composition)
            setNextComposition(null)
            setCurrentOpacity(1)
            setNextOpacity(0)
          }, fadeDuration)
        })
      })
      return () => {
        cancelAnimationFrame(rafId1)
        if (rafId2 !== null) cancelAnimationFrame(rafId2)
        if (timer) clearTimeout(timer)
      }
    } else {
      // First load or same composition - show immediately
      setCurrentComposition(composition)
      setNextComposition(null)
      setCurrentOpacity(1)
      setNextOpacity(0)
    }
    prevCompositionIdRef.current = compositionId
  }, [composition, fadeDuration])

  const renderComposition = (comp: PhotoComposition | null, opacity: number) => {
    if (!comp) return null

    if (comp.type === 'single') {
      return (
        <div
          key={comp.photos.map(p => p.id).join('-')}
          className='photo-display__mask'
          style={{
            opacity,
            transition: `opacity ${fadeDuration}ms ease-in-out`,
          }}
        >
          <SinglePhotoDisplay 
            photo={comp.photos[0]} 
            displayMode={comp.displayMode as 'full-bleed' | 'centered'}
          />
        </div>
      )
    }

    // comp.type === 'pair'
    return (
      <div
        key={comp.photos.map(p => p.id).join('-')}
        className='photo-display__mask'
        style={{
          opacity,
          transition: `opacity ${fadeDuration}ms ease-in-out`,
        }}
      >
        <PairPhotoDisplay 
          photos={[comp.photos[0], comp.photos[1]] as [PhotoEntry, PhotoEntry]}
          displayMode={comp.displayMode as 'side-by-side' | 'stacked'}
        />
      </div>
    )
  }

  if (isLoading || (!currentComposition && !nextComposition)) {
    return (
      <div className='photo-display photo-display--loading'>
        <h4>Loading...</h4>
      </div>
    )
  }

  return (
    <div className='photo-display photo-display--display'>
      {renderComposition(currentComposition, currentOpacity)}
      {renderComposition(nextComposition, nextOpacity)}
    </div>
  )
}
