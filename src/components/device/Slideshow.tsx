import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'
import { PhotoEntry } from '../../types'
import PhotoDisplay from './PhotoDisplay'

interface SlideshowProps {
  photos: PhotoEntry[]
  slideInterval?: number // in milliseconds, default 10s
  messageOverlay?: React.ReactNode
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
 */
const Slideshow = forwardRef<SlideshowRef, SlideshowProps>(
  ({ photos, slideInterval = 10000, messageOverlay }, ref) => {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPaused, setIsPaused] = useState(false)
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // Minimum swipe distance (in pixels) to trigger navigation
  const minSwipeDistance = 50

  const currentPhoto = photos.length > 0 ? photos[currentIndex] : null

  // Auto-advance slideshow
  useEffect(() => {
    if (photos.length === 0 || isPaused) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length)
    }, slideInterval)

    return () => clearInterval(timer)
  }, [photos.length, isPaused, slideInterval])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length)
  }, [photos.length])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }, [photos.length])

  const goToPhoto = useCallback((photoId: string) => {
    const index = photos.findIndex(p => p.id === photoId)
    if (index >= 0) {
      setCurrentIndex(index)
    }
  }, [photos])

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
  }), [goToPhoto, goToNext])

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

  if (photos.length === 0) {
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
      <PhotoDisplay photo={currentPhoto} />
      
      {/* Message overlay */}
      {messageOverlay}
      
      {/* Optional: Show current photo index (can be removed or styled differently) */}
      {photos.length > 1 && (
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
          {currentIndex + 1} / {photos.length}
        </div>
      )}
    </div>
  )
})

Slideshow.displayName = 'Slideshow'

export default Slideshow
