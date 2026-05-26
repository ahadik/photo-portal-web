import { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useMemo, useRef } from 'react'
import { PhotoEntry } from '~/types'
import PhotoDisplay from '~/components/device/PhotoDisplay'
import MetadataOverlay from '~/components/device/MetadataOverlay'
import { getScreenOrientation, ScreenOrientation } from '~/utils/orientation'
import { createCompositions, PhotoComposition } from '~/utils/compositions'
import { formatCaptureDate } from '~/utils/dateFormat'

import './Slideshow.css'

interface SlideshowProps {
  photos: PhotoEntry[]
  slideInterval?: number // in milliseconds, default 10s
  messageOverlay?: React.ReactNode
  showMetadata?: boolean
  fadeDuration?: number // in milliseconds, default 1000ms
  onPhotoChange?: (photoId: string | null) => void
}

export interface SlideshowRef {
  goToPhoto: (photoId: string) => void
  goToNext: () => void
  pause: () => void
  resume: () => void
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Slideshow component manages photo display with automatic advancement.
 * Creates compositions, randomly orders them, and loops through them.
 * Supports manual navigation via swipe gestures (left/right).
 * Can be controlled externally via ref.
 * Detects screen orientation and creates compositions accordingly.
 */
const Slideshow = forwardRef<SlideshowRef, SlideshowProps>(
  ({ photos, slideInterval = 10000, messageOverlay, showMetadata = false, fadeDuration = 1000, onPhotoChange }, ref) => {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPaused, setIsPaused] = useState(false)
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)
    const [screenOrientation, setScreenOrientation] = useState<ScreenOrientation>('square')
    const previousPhotoIdsRef = useRef<string>('')
    const previousOrientationRef = useRef<ScreenOrientation>('square')
    const orderedCompositionsRef = useRef<PhotoComposition[]>([])

    // Detect screen orientation
    useEffect(() => {
      const updateOrientation = () => {
        const width = window.innerWidth
        const height = window.innerHeight
        const orientation = getScreenOrientation(width, height)
        setScreenOrientation(orientation)
      }

      // Initial calculation
      updateOrientation()

      // Update on resize
      window.addEventListener('resize', updateOrientation)
      return () => window.removeEventListener('resize', updateOrientation)
    }, [])

    // Create a stable key from photo IDs to detect actual changes
    const photoIdsKey = useMemo(() => {
      return photos.map(p => p.id).sort().join(',')
    }, [photos])

    // Create compositions and randomly shuffle them
    // Only re-shuffle when photo IDs actually change
    // On orientation change, re-create compositions but don't reset index
    const orderedCompositions = useMemo(() => {
      if (photos.length === 0) {
        orderedCompositionsRef.current = []
        previousPhotoIdsRef.current = ''
        previousOrientationRef.current = screenOrientation
        return []
      }
      
      // Check if photos actually changed
      const photosChanged = previousPhotoIdsRef.current !== photoIdsKey
      const orientationChanged = previousOrientationRef.current !== screenOrientation
      
      if (photosChanged) {
        // Photos changed: create new compositions and shuffle
        const compositions = createCompositions(photos, screenOrientation)
        const shuffled = shuffleArray(compositions)
        orderedCompositionsRef.current = shuffled
        previousPhotoIdsRef.current = photoIdsKey
        previousOrientationRef.current = screenOrientation
        return shuffled
      } else if (orientationChanged) {
        // Same photos but orientation changed: re-create compositions and shuffle
        // Don't reset index - let it continue from current position (will wrap if needed)
        const compositions = createCompositions(photos, screenOrientation)
        const shuffled = shuffleArray(compositions)
        orderedCompositionsRef.current = shuffled
        previousOrientationRef.current = screenOrientation
        return shuffled
      } else {
        // Nothing changed, return existing compositions to avoid unnecessary re-renders
        return orderedCompositionsRef.current
      }
    }, [photoIdsKey, screenOrientation, photos])

    // Reset to first composition only when photos actually change (not on orientation change)
    useEffect(() => {
      const photosChanged = previousPhotoIdsRef.current !== photoIdsKey
      if (photosChanged && previousPhotoIdsRef.current !== '') {
        // Photos changed (not initial load) - reset to start
        setCurrentIndex(0)
      }
    }, [photoIdsKey])

    // Reset index if out of bounds
    useEffect(() => {
      if (orderedCompositions.length > 0 && currentIndex >= orderedCompositions.length) {
        setCurrentIndex(0)
      }
    }, [orderedCompositions.length, currentIndex])

    const currentComposition = orderedCompositions.length > 0 ? orderedCompositions[currentIndex] : null
    // For metadata overlay, get the first photo from the composition
    const currentPhoto = currentComposition?.photos[0] || null

    const goToNext = useCallback(() => {
      setCurrentIndex((prev) => {
        if (orderedCompositions.length === 0) return prev
        return (prev + 1) % orderedCompositions.length
      })
    }, [orderedCompositions.length])

    const goToPrevious = useCallback(() => {
      setCurrentIndex((prev) => {
        if (orderedCompositions.length === 0) return prev
        return (prev - 1 + orderedCompositions.length) % orderedCompositions.length
      })
    }, [orderedCompositions.length])

    // Auto-advance slideshow
    useEffect(() => {
      if (orderedCompositions.length === 0 || isPaused) return

      const timer = setInterval(() => {
        goToNext()
      }, slideInterval)

      return () => clearInterval(timer)
    }, [orderedCompositions.length, isPaused, slideInterval, goToNext])

    const goToPhoto = useCallback((photoId: string) => {
      // Find the composition that contains this photo
      const index = orderedCompositions.findIndex(comp => 
        comp.photos.some(p => p.id === photoId)
      )
      if (index >= 0) {
        setCurrentIndex(index)
      }
    }, [orderedCompositions])

    const pause = useCallback(() => {
      setIsPaused(true)
    }, [])

    const resume = useCallback(() => {
      setIsPaused(false)
    }, [])

    // Notify parent when the displayed photo changes
    useEffect(() => {
      onPhotoChange?.(currentPhoto?.id ?? null)
    }, [currentPhoto, onPhotoChange])

    // Expose methods via ref for external control
    useImperativeHandle(ref, () => ({
      goToPhoto,
      goToNext,
      pause,
      resume,
    }), [goToPhoto, goToNext, pause, resume])

    // Touch event handlers for swipe gestures
    const onTouchStart = (e: React.TouchEvent) => {
      setTouchEnd(null)
      setTouchStart(e.targetTouches[0].clientX)
    }

    const onTouchMove = (e: React.TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX)
    }

    const onTouchEnd = () => {
      if (!touchStart || !touchEnd) return

      const minSwipeDistance = 50
      const distance = touchStart - touchEnd
      const isLeftSwipe = distance > minSwipeDistance
      const isRightSwipe = distance < -minSwipeDistance

      if (isLeftSwipe) {
        goToNext()
      } else if (isRightSwipe) {
        goToPrevious()
      }
    }

    // Keyboard navigation support (for development/testing)
    useEffect(() => {
      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
          goToPrevious()
        } else if (e.key === 'ArrowRight') {
          goToNext()
        } else if (e.key === ' ') {
          e.preventDefault()
          setIsPaused((prev) => !prev)
        }
      }

      window.addEventListener('keydown', handleKeyPress)
      return () => window.removeEventListener('keydown', handleKeyPress)
    }, [goToNext, goToPrevious])

    if (orderedCompositions.length === 0) {
      return (
        <div className="slideshow--no-photos">
          No photos available
        </div>
      )
    }

    return (
      <div
        className="slideshow"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <PhotoDisplay composition={currentComposition} fadeDuration={fadeDuration} />
        
        {/* Message overlay */}
        {messageOverlay}
        
        {/* Metadata overlay */}
        {showMetadata && currentPhoto && (
          <MetadataOverlay
            leftText={formatCaptureDate(currentPhoto.capturedAt)}
            rightText={currentPhoto.location?.name || 'Location unknown'}
          />
        )}
      </div>
    )
  }
)

Slideshow.displayName = 'Slideshow'

export default Slideshow
