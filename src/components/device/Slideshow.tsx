import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'
import { PhotoEntry } from '../../types'
import PhotoDisplay from './PhotoDisplay'
import MetadataOverlay from './MetadataOverlay'
import { getScreenOrientation, ScreenOrientation } from '../../utils/orientation'
import { createCompositions, PhotoComposition } from '../../utils/compositions'

interface SlideshowProps {
  photos: PhotoEntry[]
  slideInterval?: number // in milliseconds, default 10s
  messageOverlay?: React.ReactNode
  showMetadata?: boolean
}

export interface SlideshowRef {
  goToPhoto: (photoId: string) => void
  goToNext: () => void
  pause: () => void
  resume: () => void
}

/**
 * Slideshow component manages photo display with automatic advancement.
 * Supports manual navigation via swipe gestures (left/right).
 * Can be controlled externally via ref.
 * Detects screen orientation and creates compositions accordingly.
 */
const Slideshow = forwardRef<SlideshowRef, SlideshowProps>(
  ({ photos, slideInterval = 10000, messageOverlay, showMetadata = false }, ref) => {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPaused, setIsPaused] = useState(false)
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)
    const [screenOrientation, setScreenOrientation] = useState<ScreenOrientation>('square')
    const [compositions, setCompositions] = useState<PhotoComposition[]>([])

  // Minimum swipe distance (in pixels) to trigger navigation
  const minSwipeDistance = 50

  // Detect screen orientation and update compositions when viewport changes
  useEffect(() => {
    const updateOrientation = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const orientation = getScreenOrientation(width, height)
      setScreenOrientation(orientation)
      
      // Create compositions based on current screen orientation
      const newCompositions = createCompositions(photos, orientation)
      setCompositions(newCompositions)
    }

    // Initial calculation
    updateOrientation()

    // Update on resize
    window.addEventListener('resize', updateOrientation)
    return () => window.removeEventListener('resize', updateOrientation)
  }, [photos])

  // Reset to first composition if current index is out of bounds when compositions change
  useEffect(() => {
    if (currentIndex >= compositions.length && compositions.length > 0) {
      setCurrentIndex(0)
    }
  }, [compositions.length, currentIndex])

  const currentComposition = compositions.length > 0 ? compositions[currentIndex] : null
  // For metadata overlay, get the first photo from the composition
  const currentPhoto = currentComposition?.photos[0] || null

  // Auto-advance slideshow
  useEffect(() => {
    if (compositions.length === 0 || isPaused) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % compositions.length)
    }, slideInterval)

    return () => clearInterval(timer)
  }, [compositions.length, isPaused, slideInterval])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % compositions.length)
  }, [compositions.length])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + compositions.length) % compositions.length)
  }, [compositions.length])

  const goToPhoto = useCallback((photoId: string) => {
    // Find the composition that contains this photo
    const index = compositions.findIndex(comp => 
      comp.photos.some(p => p.id === photoId)
    )
    if (index >= 0) {
      setCurrentIndex(index)
    }
  }, [compositions])

  const pause = useCallback(() => {
    setIsPaused(true)
  }, [])

  const resume = useCallback(() => {
    setIsPaused(false)
  }, [])

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

  if (compositions.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          color: '#fff',
          fontSize: '1.5rem',
        }}
      >
        No photos available
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        touchAction: 'pan-y',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <PhotoDisplay composition={currentComposition} />
      
      {/* Message overlay */}
      {messageOverlay}
      
      {/* Metadata overlay */}
      {showMetadata && <MetadataOverlay photo={currentPhoto} />}
      
      {/* Optional: Show current composition index (can be removed or styled differently) */}
      {compositions.length > 1 && !showMetadata && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#fff',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '0.875rem',
          }}
        >
          {currentIndex + 1} / {compositions.length}
        </div>
      )}
    </div>
  )
})

Slideshow.displayName = 'Slideshow'

export default Slideshow
