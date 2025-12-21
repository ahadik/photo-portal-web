import { useEffect, useState, useRef, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import { auth } from '~/services/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import { fetchPhotosIndex, fetchMessagesIndex } from '~/services/api'
import { PhotoEntry, MessageEntry } from '~/types'
import { config } from '~/config'
import { syncReadMessageCache, getReadMessageIds, markMessageRead, getActiveLocationFilter, setActiveLocationFilter, clearActiveLocationFilter, toggleLike, getLikedPhotoIds } from '~/services/cache'
import { photoUrlStore } from '~/services/photoUrlStore'
import { PhotoUrlProvider } from '~/contexts/PhotoUrlContext'
import Slideshow, { SlideshowRef } from '~/components/device/Slideshow'
import MessageOverlay from '~/components/device/MessageOverlay'
import VirtualOverlay, { VirtualButtonEvent } from '~/components/device/VirtualOverlay'
import MapView, { type MapViewRef } from '~/components/device/MapView'
import Login from '~/components/admin/Login'
import { useGPIO } from '~/hooks/useGPIO'

import './DeviceApp.css'

// Define type to avoid 'any' union type error
type LocationFilterBounds = {
  north: number
  south: number
  east: number
  west: number
}

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
  const [mapZoomLevel, setMapZoomLevel] = useState<number>(2) // Initial zoom level matching MapView default
  const [activeLocationFilter, setActiveLocationFilterState] = useState<LocationFilterBounds | null>(null)
  const [, setLikedPhotoIds] = useState<string[]>([]) // Track liked photos (may be used for UI feedback later)
  const slideshowRef = useRef<SlideshowRef>(null)
  const mapViewRef = useRef<MapViewRef>(null)
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialLoad = useRef(true)

  // Handle GPIO ZOOM_DIAL events (when useGPIO is implemented)
  // This will be called by useGPIO hook when ZOOM_DIAL events are received
  // Receives normalized value (0.0-1.0) from GPIO service and converts to zoom level (1-11)
  // Also handles zoom levels directly from VirtualOverlay (1-11)
  const handleZoomDialChange = useCallback((value: number) => {
    // Only update zoom if map view is enabled
    if (mapViewEnabled) {
      let zoomLevel: number
      // GPIO sends normalized (0.0-1.0), VirtualOverlay sends zoom levels (1-11)
      if (value <= 1.0) {
        // Normalized value from GPIO: convert to zoom level
        const clampedNormalized = Math.max(0.0, Math.min(1.0, value))
        zoomLevel = config.minZoomLevel + (clampedNormalized * (config.maxZoomLevel - config.minZoomLevel))
      } else {
        // Already a zoom level from VirtualOverlay: clamp to valid range
        zoomLevel = Math.max(config.minZoomLevel, Math.min(config.maxZoomLevel, value))
      }
      setMapZoomLevel(zoomLevel)
    }
  }, [mapViewEnabled])

  // GPIO integration
  const { setLedOn, setLedOff, virtualMode } = useGPIO({
    onLikeButton: () => {
      void handleSelectButton()
    },
    onMapToggle: (value) => {
      setMapViewEnabled(value === 'ON')
    },
    onMetadataToggle: () => {
      handleMetadataToggle()
    },
    onMessageButton: () => {
      void handleMessageButton()
    },
    onZoomDial: handleZoomDialChange,
  })

  // Show virtual controls by default when in virtual mode
  useEffect(() => {
    if (virtualMode && !showVirtualControls) {
      setShowVirtualControls(true)
    }
  }, [virtualMode, showVirtualControls])

  // Control LED based on unread messages
  useEffect(() => {
    if (hasUnreadMessages) {
      setLedOn()
    } else {
      setLedOff()
    }
  }, [hasUnreadMessages, setLedOn, setLedOff])

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

  // Fetch photos and photo URLs (blocking on initial load, incremental on updates)
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
        const newPhotos = photosData.photos || []
        
        if (isInitialLoad.current) {
          // Initial load: fetch ALL URLs (blocking)
          console.log('Initial load: fetching URLs for all photos...')
          await photoUrlStore.fetchAllPhotoUrls(newPhotos)
          console.log('Initial load: all URLs fetched')
          setPhotos(newPhotos)
          isInitialLoad.current = false
          setPhotosLoading(false)
        } else {
          // Incremental update: only fetch URLs for new photos
          console.log('Incremental update: checking for new photos...')
          await photoUrlStore.fetchNewPhotoUrls(newPhotos)
          setPhotos(newPhotos)
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

  // Load active location filter from cache and check expiration
  useEffect(() => {
    async function loadFilter() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const filter = await getActiveLocationFilter() as { bounds: LocationFilterBounds; setAt: string } | null
        if (filter) {
          // Check if filter is expired (>12 hours)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          const setAtTime = new Date(filter.setAt).getTime()
          const now = Date.now()
          const twelveHours = 12 * 60 * 60 * 1000
          
          if (now - setAtTime > twelveHours) {
            // Filter expired, clear it
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await clearActiveLocationFilter()
            setActiveLocationFilterState(null)
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            setActiveLocationFilterState(filter.bounds)
          }
        } else {
          setActiveLocationFilterState(null)
        }
      } catch (err) {
        console.error('Failed to load location filter:', err)
      }
    }
    void loadFilter()
    
    // Check for expiration periodically (every hour)
    const intervalId = setInterval(() => {
      void loadFilter()
    }, 60 * 60 * 1000)
    
    return () => clearInterval(intervalId)
  }, [])

  // Load liked photo IDs from cache
  useEffect(() => {
    async function loadLikedPhotos() {
      try {
        const liked = await getLikedPhotoIds()
        setLikedPhotoIds(liked)
      } catch (err) {
        console.error('Failed to load liked photos:', err)
      }
    }
    void loadLikedPhotos()
  }, [])

  // Filter photos based on bounding box
  const filterPhotosByBoundingBox = useCallback((photosToFilter: PhotoEntry[], bounds: LocationFilterBounds | null): PhotoEntry[] => {
    if (!bounds) return photosToFilter
    
    const { south, north, west, east } = bounds
    
    return photosToFilter.filter(photo => {
      if (!photo.location) return false
      return (
        photo.location.lat >= south &&
        photo.location.lat <= north &&
        photo.location.lon >= west &&
        photo.location.lon <= east
      )
    })
  }, [])

  // Handle Select button (like in slideshow, filter in mapview)
  const handleSelectButton = async () => {
    if (mapViewEnabled) {
      // Map view: set bounding box filter
      // At zoom level 2 and below, clear filter instead (entire world view)
      if (mapZoomLevel <= 2) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          await clearActiveLocationFilter()
          setActiveLocationFilterState(null)
        } catch (err) {
          console.error('Failed to clear location filter:', err)
        }
        return
      }
      
      if (!mapViewRef.current) return
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const bounds = mapViewRef.current.getCurrentBounds() as LocationFilterBounds | null
      if (!bounds) return
      
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await setActiveLocationFilter(bounds)
        setActiveLocationFilterState(bounds)
      } catch (err) {
        console.error('Failed to set location filter:', err)
      }
    } else {
      // Slideshow: toggle like for current photo
      if (!slideshowRef.current) return
      
      const currentPhotoId = slideshowRef.current.getCurrentPhotoId()
      if (!currentPhotoId) return
      
      try {
        const isLiked = await toggleLike(currentPhotoId)
        // Update liked state
        if (isLiked) {
          setLikedPhotoIds(prev => [...prev, currentPhotoId])
        } else {
          setLikedPhotoIds(prev => prev.filter(id => id !== currentPhotoId))
        }
      } catch (err) {
        console.error('Failed to toggle like:', err)
      }
    }
  }

  // Handle metadata toggle
  const handleMetadataToggle = () => {
    setShowMetadata((prev) => !prev)
  }

  // Handle virtual button events
  const handleVirtualButtonEvent = (event: VirtualButtonEvent) => {
    console.log('Virtual button event:', event)
    switch (event.type) {
      case 'LIKE_BUTTON':
        void handleSelectButton()
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
      case 'ZOOM_DIAL':
        // Only update zoom if map view is enabled
        if (mapViewEnabled) {
          // VirtualOverlay sends zoom levels directly (1-11), GPIO sends normalized (0.0-1.0)
          // Check if value is normalized (0.0-1.0) or already a zoom level (>= 1.0)
          let zoomLevel: number
          if (event.value <= 1.0) {
            // Normalized value from GPIO: convert to zoom level
            const clampedNormalized = Math.max(0.0, Math.min(1.0, event.value))
            zoomLevel = config.minZoomLevel + (clampedNormalized * (config.maxZoomLevel - config.minZoomLevel))
          } else {
            // Already a zoom level from VirtualOverlay: clamp to valid range
            zoomLevel = Math.max(config.minZoomLevel, Math.min(config.maxZoomLevel, event.value))
          }
          setMapZoomLevel(zoomLevel)
        }
        break
    }
  }

  // Get filtered photos for slideshow (map shows all photos)
  const slideshowPhotos = filterPhotosByBoundingBox(photos, activeLocationFilter)

  if (loading) {
    return (
      <div className='device-app'>
        <div>Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='device-app device-app--error'>
        <h2>Authentication Error</h2>
        <p>{error.message}</p>
        <p>Check the browser console for more details.</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className='device-app'>
        <Login />
      </div>
    )
  }

  return (
    <PhotoUrlProvider>
      <div className='device-app'>
        <Routes>
          <Route path="/" element={
            mapViewEnabled ? (
              <MapView 
                ref={mapViewRef}
                photos={photos} 
                zoomLevel={mapZoomLevel}
                activeLocationFilter={activeLocationFilter}
              />
            ) : photosLoading ? (
              <div className='device-app__status-message'>
                <p>Loading photos and URLs...</p>
              </div>
            ) : (
              <div className='device-app__slideshow-container'>
                <Slideshow
                  ref={slideshowRef}
                  photos={slideshowPhotos}
                  messageOverlay={activeMessage ? <MessageOverlay message={activeMessage} /> : null}
                  showMetadata={showMetadata}
                  fadeDuration={config.fadeDuration}
                />
              </div>
            )
          } />
        </Routes>
        
        {/* Virtual button overlay for testing without hardware */}
        {showVirtualControls && (
          <VirtualOverlay
            onEvent={handleVirtualButtonEvent}
            onClose={() => setShowVirtualControls(false)}
            hasUnreadMessages={hasUnreadMessages}
            showMetadata={showMetadata}
            mapViewEnabled={mapViewEnabled}
            zoomLevel={mapZoomLevel}
            onZoomChange={handleZoomDialChange}
          />
        )}
      </div>
    </PhotoUrlProvider>
  )
}

export default DeviceApp
