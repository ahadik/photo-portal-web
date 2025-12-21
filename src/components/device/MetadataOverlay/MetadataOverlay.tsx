import { PhotoEntry } from '~/types'

import './MetadataOverlay.css';

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
      className='metadata-overlay'
    >
      
      <div
        className='metadata-overlay__content'
      >
        <p className='caption info'>
          {formatCaptureDate(photo.capturedAt)}
        </p>
        <p className='caption info'>
          {locationName}
        </p>
      </div>
    </div>
  )
}
