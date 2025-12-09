import { useEffect, useState, useRef, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import { auth } from '../services/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import { fetchPhotosIndex, fetchMessagesIndex } from '../services/api'
import { PhotoEntry, MessageEntry } from '../types'
import { config } from '../config'
import { syncReadMessageCache, getReadMessageIds, markMessageRead } from '../services/cache'
import Slideshow, { SlideshowRef } from '../components/device/Slideshow'
import MessageOverlay from '../components/device/MessageOverlay'
import VirtualButtonOverlay, { VirtualButtonEvent } from '../components/device/VirtualButtonOverlay'
import MapView from '../components/device/MapView'
import Login from '../components/admin/Login'

function DeviceApp() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [photosLoading, setPhotosLoading] = useState(true)
  const [messages, setMessages] = useState<MessageEntry[]>([])
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const [activeMessage, setActiveMessage] = useState<MessageEntry | null>(null)
  const [showMetadata, setShowMetadata] = useState(false)
  const [showVirtualControls, setShowVirtualControls] = useState(false)
  const [mapViewEnabled, setMapViewEnabled] = useState(false)
  const slideshowRef = useRef<SlideshowRef>(null)
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialLoad = useRef(true)

  // Use Firebase's onAuthStateChanged directly (more reliable than react-firebase-hooks)
  useEffect(() => {
    setLoading(true)
    
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUser(user)
        setError(null)
        setLoading(false)
      },
      (error) => {
        console.error('Auth error:', error)
        setError(error)
        setLoading(false)
      }
    )

    // Check current user immediately (before waiting for listener)
    const currentUser = auth.currentUser
    if (currentUser) {
      setUser(currentUser)
      setLoading(false)
    }

    return () => unsubscribe()
  }, [])

  // Fetch photos and set up polling when user is authenticated
  useEffect(() => {
    if (!user) {
      // Reset state when user logs out
      setPhotos([])
      setPhotosLoading(true)
      isInitialLoad.current = true
      return
    }

    async function loadPhotos() {
      try {
        // Only show loading state on initial load
        if (isInitialLoad.current) {
          setPhotosLoading(true)
        }
        
        const photosData = await fetchPhotosIndex()
        setPhotos(photosData.photos || [])
        
        if (isInitialLoad.current) {
          isInitialLoad.current = false
          setPhotosLoading(false)
        }
      } catch (err) {
        console.error('Failed to load photos:', err)
        // Only set error on initial load to avoid disrupting slideshow
        if (isInitialLoad.current) {
          setError(err instanceof Error ? err : new Error('Failed to load photos'))
          setPhotosLoading(false)
        }
      }
    }

    // Load photos immediately
    void loadPhotos()

    // Set up polling interval (check for new content every minute)
    const intervalId = setInterval(() => {
      void loadPhotos()
    }, config.photoSyncInterval)

    // Cleanup interval on unmount or when user changes
    return () => {
      clearInterval(intervalId)
    }
  }, [user])

  // Fetch messages and track unread state
  const loadMessages = useCallback(async () => {
    try {
      const messagesData = await fetchMessagesIndex()
      const currentMessages = messagesData.messages || []
      setMessages(currentMessages)

      // Sync read message cache (marks all existing messages as read if cache is empty)
      const messageIds = currentMessages.map(m => m.id)
      await syncReadMessageCache(messageIds)

      // Check for unread messages
      const readMessageIds = await getReadMessageIds()
      const unreadMessages = currentMessages.filter(m => !readMessageIds.includes(m.id))
      setHasUnreadMessages(unreadMessages.length > 0)
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setHasUnreadMessages(false)
      setMessages([])
      return
    }

    // Load messages immediately
    void loadMessages()

    // Set up polling interval for messages (check every 30 seconds)
    const intervalId = setInterval(() => {
      void loadMessages()
    }, config.messageSyncInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [user, loadMessages])

  // Handle 'v' key press to toggle virtual controls overlay
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only toggle on 'v' key when on device route and user is authenticated
      if (e.key === 'v' || e.key === 'V') {
        // Ignore if typing in an input field
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return
        }
        setShowVirtualControls((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Handle message button press - show oldest unread message
  const handleMessageButton = async () => {
    if (!hasUnreadMessages || messages.length === 0) return

    try {
      // Get read message IDs
      const readMessageIds = await getReadMessageIds()
      
      // Find oldest unread message (sorted by sentAt)
      const unreadMessages = messages
        .filter(m => !readMessageIds.includes(m.id))
        .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())

      if (unreadMessages.length === 0) return

      const messageToShow = unreadMessages[0]

      // Mark message as read immediately
      await markMessageRead(messageToShow.id)

      // Refresh unread state after marking message as read
      await loadMessages()

      // Navigate slideshow to the photo referenced in the message
      if (slideshowRef.current) {
        slideshowRef.current.pause()
        slideshowRef.current.goToPhoto(messageToShow.photoId)
      }

      // Show message overlay
      setActiveMessage(messageToShow)

      // Clear any existing timeout
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current)
      }

      // Hide message after configured duration and advance slideshow
      messageTimeoutRef.current = setTimeout(() => {
        setActiveMessage(null)
        if (slideshowRef.current) {
          slideshowRef.current.resume()
          slideshowRef.current.goToNext()
        }
        messageTimeoutRef.current = null
      }, config.messageDisplayDuration)
    } catch (err) {
      console.error('Failed to handle message button:', err)
    }
  }

  // Cleanup message timeout on unmount
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current)
      }
    }
  }, [])

  // Handle metadata toggle
  const handleMetadataToggle = () => {
    setShowMetadata((prev) => !prev)
  }

  // Handle virtual button events
  const handleVirtualButtonEvent = (event: VirtualButtonEvent) => {
    console.log('Virtual button event:', event)
    switch (event.type) {
      case 'LIKE_BUTTON':
        // Will be handled by useLikes hook
        break
      case 'MAP_TOGGLE':
        setMapViewEnabled(event.value === 'ON')
        break
      case 'METADATA_TOGGLE':
        void handleMetadataToggle()
        break
      case 'MESSAGE_BUTTON':
        void handleMessageButton()
        break
    }
  }

  if (loading) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#000',
        color: '#fff',
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        backgroundColor: '#000',
        color: '#fff',
        padding: '2rem',
      }}>
        <h2>Authentication Error</h2>
        <p>{error.message}</p>
        <p>Check the browser console for more details.</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Login />
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Routes>
        <Route path="/" element={
          mapViewEnabled ? (
            <MapView photos={photos} />
          ) : photosLoading ? (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#000',
              color: '#fff',
              fontSize: '1.5rem',
            }}>
              Loading photos...
            </div>
          ) : (
            <Slideshow
              ref={slideshowRef}
              photos={photos}
              messageOverlay={activeMessage ? <MessageOverlay message={activeMessage} /> : null}
              showMetadata={showMetadata}
            />
          )
        } />
      </Routes>
      
      {/* Virtual button overlay for testing without hardware */}
      {showVirtualControls && (
        <VirtualButtonOverlay
          onEvent={handleVirtualButtonEvent}
          onClose={() => setShowVirtualControls(false)}
          hasUnreadMessages={hasUnreadMessages}
          showMetadata={showMetadata}
          mapViewEnabled={mapViewEnabled}
        />
      )}
    </div>
  )
}

export default DeviceApp
