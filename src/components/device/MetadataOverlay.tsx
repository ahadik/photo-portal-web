import { PhotoEntry } from '../../types'

interface MetadataOverlayProps {
  photo: PhotoEntry | null
}

/**
 * MetadataOverlay displays photo metadata (capture time/date and location)
 * in a chrome overlay at the bottom of the screen.
 */
export default function MetadataOverlay({ photo }: MetadataOverlayProps) {
  if (!photo) return null

  // Format capture date/time nicely
  const formatCaptureDate = (capturedAt: string | null): string => {
    if (!capturedAt) return 'Date unknown'
    
    try {
      const date = new Date(capturedAt)
      // Format as: "Monday, January 1, 2024 at 3:45 PM"
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }
      return date.toLocaleString('en-US', options)
    } catch (err) {
      return 'Date unknown'
    }
  }

  // Get location name or show placeholder
  const locationName = photo.location?.name || 'Location unknown'

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1rem 2rem',
        zIndex: 1000,
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {/* Capture date/time */}
        <div
          style={{
            color: '#fff',
            fontSize: '1rem',
            fontWeight: '500',
          }}
        >
          {formatCaptureDate(photo.capturedAt)}
        </div>

        {/* Location */}
        <div
          style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.875rem',
          }}
        >
          📍 {locationName}
        </div>
      </div>
    </div>
  )
}
