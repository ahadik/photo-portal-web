import './MetadataOverlay.css';

interface MetadataOverlayProps {
  leftText?: string | null
  rightText?: string | null
}

/**
 * MetadataOverlay displays metadata in a chrome overlay at the bottom of the screen.
 * Uses a two-slot layout (left and right) for consistent display across Photo View and Map View.
 */
export default function MetadataOverlay({ leftText, rightText }: MetadataOverlayProps) {
  // Don't render if both slots are empty
  if (!leftText && !rightText) return null

  return (
    <div className='metadata-overlay'>
      <div className='metadata-overlay__content'>
        {leftText && (
          <p className='caption info'>
            {leftText}
          </p>
        )}
        {rightText && (
          <p className='caption info'>
            {rightText}
          </p>
        )}
      </div>
    </div>
  )
}
