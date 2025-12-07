import { useState, useEffect } from 'react'
import { sendMessage } from '../../services/firebase'
import { getPhotosJsonUrl } from '../../config'
import { PhotoEntry } from '../../types'

function MessageComposer() {
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>('')
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch(getPhotosJsonUrl())
      .then((res) => res.json())
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
    } catch (err: any) {
      setError(err.message || 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="photo-select" style={{ display: 'block', marginBottom: '0.5rem' }}>
          Select Photo
        </label>
        <select
          id="photo-select"
          value={selectedPhotoId}
          onChange={(e) => setSelectedPhotoId(e.target.value)}
          style={{ width: '100%', padding: '0.5rem' }}
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

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="message-text" style={{ display: 'block', marginBottom: '0.5rem' }}>
          Message ({messageText.length}/280)
        </label>
        <textarea
          id="message-text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value.slice(0, 280))}
          rows={4}
          maxLength={280}
          style={{ width: '100%', padding: '0.5rem' }}
          required
        />
      </div>

      {error && (
        <div style={{ padding: '0.5rem', marginBottom: '1rem', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '0.5rem', marginBottom: '1rem', backgroundColor: '#efe', color: '#0c0', borderRadius: '4px' }}>
          Message sent successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !selectedPhotoId || !messageText.trim()}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: '#039be5',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  )
}

export default MessageComposer
