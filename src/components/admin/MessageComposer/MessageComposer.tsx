import { useState, useEffect } from 'react'
import { sendMessage } from '~/services/firebase'
import { fetchPhotosIndex } from '~/services/api'
import { PhotoEntry } from '~/types'

import './MessageComposer.css';

function MessageComposer() {
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>('')
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchPhotosIndex()
      .then((data) => setPhotos(data.photos || []))
      .catch((err) => console.error('Failed to load photos', err))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPhotoId || !messageText.trim()) {
      setError('Please select a photo and enter a message')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await sendMessage({ photoId: selectedPhotoId, text: messageText.trim() })
      setSuccess(true)
      setMessageText('')
      setSelectedPhotoId('')
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e) }}>
      <div className="input-block">
        <label htmlFor="photo-select">
          Select Photo
        </label>
        <select
          id="photo-select"
          value={selectedPhotoId}
          onChange={(e) => setSelectedPhotoId(e.target.value)}
        >
          <option value="">Choose a photo...</option>
          {photos.map((photo) => (
            <option key={photo.id} value={photo.id}>
              {photo.capturedAt
                ? new Date(photo.capturedAt).toLocaleDateString()
                : 'No date'} - {photo.location?.name || 'No location'}
            </option>
          ))}
        </select>
      </div>

      <div className="input-block">
        <label htmlFor="message-text">
          Message ({messageText.length}/280)
        </label>
        <textarea
          id="message-text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value.slice(0, 280))}
          rows={4}
          maxLength={280}
          required
        />
      </div>

      {error && (
        <div className='input-block__status--error'>
          {error}
        </div>
      )}

      {success && (
        <div className='input-block__status--success'>
          Message sent successfully!
        </div>
      )}

      <button
        className='button button--submit'
        type="submit"
        disabled={loading || !selectedPhotoId || !messageText.trim()}
      >
        {loading ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  )
}

export default MessageComposer
