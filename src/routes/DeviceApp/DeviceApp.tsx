import { useEffect, useState, useRef, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import { fetchPhotosIndex, fetchMessagesIndex } from '~/services/api'
import { PhotoEntry, MessageEntry } from '~/types'
import { config } from '~/config'
import {
  syncReadMessageCache,
  getReadMessageIds,
  markMessageRead,
  getActiveLocationFilter,
  setActiveLocationFilter,
  clearActiveLocationFilter,
  LocationFilterBounds,
} from '~/services/cache'
import { photoUrlStore } from '~/services/photoUrlStore'
import { PhotoUrlProvider } from '~/contexts/PhotoUrlContext'
import Slideshow, { SlideshowRef } from '~/components/device/Slideshow'
import MessageOverlay from '~/components/device/MessageOverlay'
import VirtualOverlay, { VirtualButtonEvent } from '~/components/device/VirtualOverlay'
import MapView, { type MapViewRef } from '~/components/device/MapView'
import DebugPanel from '~/components/device/DebugPanel'
import Login from '~/components/admin/Login'
import WrongAccount from '~/components/WrongAccount'
import { useGPIO } from '~/hooks/useGPIO'
import { useAuthUser } from '~/hooks/useAuthUser'

import './DeviceApp.css'

function DeviceApp() {
  const { user, loading, error } = useAuthUser()
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [photosLoading, setPhotosLoading] = useState(true)
  const [messages, setMessages] = useState<MessageEntry[]>([])
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false) // Track if there's a new message waiting (glowing state)
  const [activeMessage, setActiveMessage] = useState<MessageEntry | null>(null)
  const [showMetadata, setShowMetadata] = useState(false)
  const [showVirtualControls, setShowVirtualControls] = useState(false)
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [mapViewEnabled, setMapViewEnabled] = useState(false)
  const [mapZoomLevel, setMapZoomLevel] = useState<number>(2) // Initial zoom level matching MapView default
  const [activeLocationFilter, setActiveLocationFilterState] = useState<LocationFilterBounds | null>(null)
  const [currentPhotoId, setCurrentPhotoId] = useState<string | null>(null) // Track current photo ID even when slideshow is not rendered
  const slideshowRef = useRef<SlideshowRef>(null)
  const mapViewRef = useRef<MapViewRef>(null)
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialLoad = useRef(true)
  const sendEventRef = useRef<((event: { type: string; value?: unknown }) => void) | null>(null)
  const hasCenteredOnPhotoRef = useRef(false) // Track if we've already centered on photo when switching to map view
  const [virtualButtonEvents, setVirtualButtonEvents] = useState<VirtualButtonEvent[]>([])
  const [remoteEvents, setRemoteEvents] = useState<Array<{ type: string; data?: unknown }>>([])

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
  const { setLedOn, setLedOff, virtualMode, sendEvent, connected, wsMessages } = useGPIO({
    onMapToggle: (value) => {
      setMapViewEnabled(value === 'ON')
    },
    onMetadataToggle: (value) => {
      setShowMetadata(value === 'ON')
    },
    onSelectButton: () => {
      void handleMessageButton()
    },
    onZoomDial: handleZoomDialChange,
  })

  // Store sendEvent in ref for use in callbacks
  useEffect(() => {
    sendEventRef.current = sendEvent as (event: { type: string; value?: unknown }) => void
  }, [sendEvent])

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
        // Only clear the loading state on initial load to avoid disrupting slideshow.
        // Subsequent failures retry on the next poll.
        if (isInitialLoad.current) {
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

  const previousMessageIdsRef = useRef<Set<string> | null>(null)

  // Fetch messages and track unread state
  const loadMessages = useCallback(async () => {
    try {
      const messagesData = await fetchMessagesIndex()
      const currentMessages = messagesData.messages || []

      // Detect newly arrived messages (skip on the very first load)
      const previousIds = previousMessageIdsRef.current
      const currentIds = new Set(currentMessages.map(m => m.id))
      const hasNew = previousIds !== null && currentMessages.some(m => !previousIds.has(m.id))
      previousMessageIdsRef.current = currentIds

      setMessages(currentMessages)

      // Broadcast MESSAGE_WAITING event if there's a new message
      if (hasNew) {
        setHasNewMessage(true)
        if (sendEventRef.current) {
          sendEventRef.current({ type: 'MESSAGE_WAITING', value: true })
        }
        // Track remote event for debug panel
        setRemoteEvents((prev) => [...prev, { type: 'MESSAGE_WAITING', data: true }])
      }

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
      setHasNewMessage(false)
      setMessages([])
      previousMessageIdsRef.current = null
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
  // Handle 'd' key press to toggle debug panel
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Toggle virtual controls on 'v'
      if (e.key === 'v' || e.key === 'V') {
        setShowVirtualControls((prev) => !prev)
      }

      // Toggle debug panel on 'd'
      if (e.key === 'd' || e.key === 'D') {
        setShowDebugPanel((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Handle message button press
  // In Slideshow mode: show most recent message
  // In Map view: set geo filter to current view
  const handleMessageButton = async () => {
    if (mapViewEnabled) {
      // Map view: set bounding box filter
      // At zoom level 2 and below, clear filter instead (entire world view)
      if (mapZoomLevel <= 2) {
        try {
          await clearActiveLocationFilter()
          setActiveLocationFilterState(null)
        } catch (err) {
          console.error('Failed to clear location filter:', err)
        }
        return
      }
      
      if (!mapViewRef.current) return
      
      const bounds = mapViewRef.current.getCurrentBounds() as LocationFilterBounds | null
      if (!bounds) return
      
      try {
        await setActiveLocationFilter(bounds)
        setActiveLocationFilterState(bounds)
      } catch (err) {
        console.error('Failed to set location filter:', err)
      }
    } else {
      // Slideshow mode: show most recent message
      // If a message is already showing, clear it and resume slideshow
      if (activeMessage) {
        setActiveMessage(null)
        // Clear any existing timeout
        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current)
          messageTimeoutRef.current = null
        }
        // Resume slideshow
        if (slideshowRef.current) {
          slideshowRef.current.resume()
        }
        return
      }

      if (messages.length === 0) return

      try {
        // If a bounding box filter is active, clear it first
        if (activeLocationFilter) {
          try {
            await clearActiveLocationFilter()
            setActiveLocationFilterState(null)
          } catch (err) {
            console.error('Failed to clear location filter:', err)
          }
        }

        // Find most recent message (sorted by sentAt, descending)
        const sortedMessages = [...messages].sort(
          (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
        )

        if (sortedMessages.length === 0) return

        const messageToShow = sortedMessages[0]

        // If there's a new message waiting, broadcast MESSAGE_READ event
        if (hasNewMessage) {
          if (sendEventRef.current) {
            sendEventRef.current({ type: 'MESSAGE_READ' })
          }
          setHasNewMessage(false)
          // Track remote event for debug panel
          setRemoteEvents((prev) => [...prev, { type: 'MESSAGE_READ' }])
        }

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
  }

  // Cleanup message timeout on unmount
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current)
      }
    }
  }, [])

  // Load active location filter from cache, and schedule its expiry (12 hours from setAt)
  useEffect(() => {
    const FILTER_TTL_MS = 12 * 60 * 60 * 1000
    let expireTimeoutId: ReturnType<typeof setTimeout> | null = null

    async function loadFilter() {
      try {
        const filter = await getActiveLocationFilter()
        if (!filter) {
          setActiveLocationFilterState(null)
          return
        }

        const setAtTime = new Date(filter.setAt).getTime()
        const ageMs = Date.now() - setAtTime

        if (ageMs >= FILTER_TTL_MS) {
          await clearActiveLocationFilter()
          setActiveLocationFilterState(null)
          return
        }

        setActiveLocationFilterState(filter.bounds)
        // Schedule a single timeout to clear the filter when it expires
        expireTimeoutId = setTimeout(() => {
          void (async () => {
            await clearActiveLocationFilter()
            setActiveLocationFilterState(null)
          })()
        }, FILTER_TTL_MS - ageMs)
      } catch (err) {
        console.error('Failed to load location filter:', err)
      }
    }
    void loadFilter()

    return () => {
      if (expireTimeoutId) clearTimeout(expireTimeoutId)
    }
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

  // Center map on current photo when FIRST switching to map view
  useEffect(() => {
    if (!mapViewEnabled) {
      // Reset the flag when switching away from map view
      hasCenteredOnPhotoRef.current = false
      return
    }
    
    // Only center if we haven't already centered for this map view session
    if (hasCenteredOnPhotoRef.current) return
    
    // Wait a bit for the map to initialize before centering
    const timeoutId = setTimeout(() => {
      const mapView = mapViewRef.current
      if (!mapView) return
      
      // Mark that we've centered so we don't do it again
      hasCenteredOnPhotoRef.current = true
      
      // Use stored current photo ID (from before switching to map view)
      // Only allow zoom to be set if local server is NOT connected (hardware controls zoom when connected)
      const allowZoom = !connected
      
      if (!currentPhotoId) {
        // No current photo, center on San Francisco
        mapView.centerOnCoordinates(37.7749, -122.4194, 10, allowZoom)
        return
      }

      // Find the photo in the photos array
      const currentPhoto = photos.find(p => p.id === currentPhotoId)
      if (!currentPhoto) {
        // Photo not found, center on San Francisco
        mapView.centerOnCoordinates(37.7749, -122.4194, 10, allowZoom)
        return
      }

      // If photo has location, center on it; otherwise center on San Francisco
      if (currentPhoto.location) {
        mapView.centerOnCoordinates(
          currentPhoto.location.lat,
          currentPhoto.location.lon,
          10,
          allowZoom
        )
      } else {
        // Photo exists but has no location data, center on San Francisco
        mapView.centerOnCoordinates(37.7749, -122.4194, 10, allowZoom)
      }
    }, 100) // Small delay to ensure map is initialized
    
    return () => clearTimeout(timeoutId)
  }, [mapViewEnabled, photos, connected, currentPhotoId])

  // Handle virtual button events
  const handleVirtualButtonEvent = (event: VirtualButtonEvent) => {
    console.log('Virtual button event:', event)
    // Track virtual button event for debug panel
    setVirtualButtonEvents((prev) => [...prev, event])
    
    switch (event.type) {
      case 'MAP_TOGGLE':
        setMapViewEnabled(event.value === 'ON')
        break
      case 'METADATA_TOGGLE':
        setShowMetadata(event.value === 'ON')
        break
      case 'SELECT_BUTTON':
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
        <Login title="Photo Portal Device Access" />
      </div>
    )
  }

  // Block users signed in with the wrong account before they hit a Storage
  // permission error. Skipped if VITE_DEVICE_EMAIL is unset (server rules still apply).
  if (config.deviceEmail && user.email !== config.deviceEmail) {
    return (
      <div className='device-app'>
        <WrongAccount expected="device" actualEmail={user.email} />
      </div>
    )
  }

  return (
    <PhotoUrlProvider>
      <div className="device-app">
        <div className={`device-app__content ${showDebugPanel ? 'device-app__content--debug-open' : ''}`}>
          <div className="device-app__content-frame">
            <Routes>
              <Route path="/" element={
                mapViewEnabled ? (
                  <MapView 
                    ref={mapViewRef}
                    photos={photos} 
                    zoomLevel={mapZoomLevel}
                    activeLocationFilter={activeLocationFilter}
                    showMetadata={showMetadata}
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
                      onPhotoChange={setCurrentPhotoId}
                    />
                  </div>
                )
              } />
            </Routes>
          </div>
          
          {/* Virtual button overlay for testing without hardware */}
          {showVirtualControls && (
            <VirtualOverlay
              onEvent={handleVirtualButtonEvent}
              onClose={() => setShowVirtualControls(false)}
              hasNewMessage={hasNewMessage}
              showMetadata={showMetadata}
              mapViewEnabled={mapViewEnabled}
              zoomLevel={mapZoomLevel}
              onZoomChange={handleZoomDialChange}
              serverConnected={connected}
            />
          )}
        </div>

        {/* Debug panel */}
        <DebugPanel
          isOpen={showDebugPanel}
          onClose={() => {
            setShowDebugPanel(false)
            // Clear events when panel closes
            setVirtualButtonEvents([])
            setRemoteEvents([])
          }}
          serverConnected={connected}
          virtualButtonEvents={virtualButtonEvents}
          wsMessages={wsMessages as Array<{ direction: 'in' | 'out'; type: string; data?: unknown }>}
          remoteEvents={remoteEvents}
        />
      </div>
    </PhotoUrlProvider>
  )
}

export default DeviceApp
