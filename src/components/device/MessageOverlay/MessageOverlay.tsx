import { MessageEntry } from '~/types'

import './MessageOverlay.css';

interface MessageOverlayProps {
  message: MessageEntry
}

/**
 * MessageOverlay displays a message text overlay at the top of a photo.
 */
export default function MessageOverlay({ message }: MessageOverlayProps) {
  return (
    <div
      className="message-overlay"
    >
      <div className="message-overlay__content">
        <div
          className="message-overlay__text"
        >
          <h1 className='message'>{message.text}</h1>
        </div>
      </div>
    </div>
  )
}
