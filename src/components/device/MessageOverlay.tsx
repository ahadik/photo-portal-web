import { MessageEntry } from '../../types'

interface MessageOverlayProps {
  message: MessageEntry
}

/**
 * MessageOverlay displays a message text overlay at the top of a photo.
 */
export default function MessageOverlay({ message }: MessageOverlayProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: '1.5rem 2rem',
        zIndex: 1000,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div
        style={{
          color: '#fff',
          fontSize: '1.25rem',
          lineHeight: '1.6',
          textAlign: 'center',
          maxWidth: '1200px',
          margin: '0 auto',
          wordWrap: 'break-word',
        }}
      >
        {message.text}
      </div>
    </div>
  )
}
