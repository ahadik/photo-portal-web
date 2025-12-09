import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { config } from '../../config'
import { PhotoEntry } from '../../types'
import { getThumbnailDownloadUrl } from '../../services/api'

interface MapViewProps {
  photos: PhotoEntry[]
}

/**
 * MapView component displays a full-screen MapBox map of the world.
 * Renders when Map View toggle is enabled.
 * Displays photo location pins for photos with location data.
 */
interface MarkerData {
  marker: mapboxgl.Marker
  photo: PhotoEntry
}

interface MarkersRef {
  markers: mapboxgl.Marker[]
  markerMap: Map<string, MarkerData>
}

export default function MapView({ photos }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<MarkersRef>({ markers: [], markerMap: new Map() })
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<string, string>>(new Map())

  // Fetch authenticated thumbnail URLs using Firebase API
  useEffect(() => {
    const photosWithLocation = photos.filter(photo => photo.location !== null)
    
    if (photosWithLocation.length === 0) {
      setThumbnailUrls(new Map())
      return
    }

    let cancelled = false

    async function fetchThumbnailUrls() {
      const urlMap = new Map<string, string>()
      
      // Fetch all thumbnail URLs in parallel using Firebase Storage API
      const promises = photosWithLocation.map(async (photo) => {
        try {
          // Use Firebase API to get authenticated download URL
          const url = await getThumbnailDownloadUrl(photo.id)
          if (!cancelled) {
            urlMap.set(photo.id, url)
          }
        } catch (error) {
          console.error(`Failed to load thumbnail for photo ${photo.id}:`, error)
          // Continue with other photos even if one fails
        }
      })

      await Promise.all(promises)
      
      if (!cancelled) {
        setThumbnailUrls(urlMap)
        
        // Update existing marker popups with the new authenticated URLs from Firebase
        urlMap.forEach((url, photoId) => {
          const markerData = markersRef.current.markerMap.get(photoId)
          if (markerData) {
            const popup = markerData.marker.getPopup()
            if (popup) {
              const popupContent = `
                <div style="text-align: center;">
                  <img 
                    src="${url}" 
                    alt="Photo thumbnail" 
                    style="max-width: 200px; max-height: 200px; border-radius: 4px;"
                  />
                  ${markerData.photo.location?.name ? `<div style="margin-top: 8px; font-size: 0.875rem; color: #333;">${markerData.photo.location.name}</div>` : ''}
                </div>
              `
              popup.setHTML(popupContent)
            }
          }
        })
      }
    }

    void fetchThumbnailUrls()

    return () => {
      cancelled = true
    }
  }, [photos])

  // Function to add markers for photos with location data
  const addMarkers = (mapInstance: mapboxgl.Map, photosData: PhotoEntry[], thumbUrls: Map<string, string>) => {
    // Remove existing markers
    markersRef.current.markers.forEach(marker => marker.remove())
    markersRef.current.markers = []
    markersRef.current.markerMap = new Map()

    // Filter photos to only those with location data
    const photosWithLocation = photosData.filter(photo => photo.location !== null)

    // Create markers for each photo
    photosWithLocation.forEach(photo => {
      if (!photo.location) return

      const { lon, lat } = photo.location
      const thumbUrl = thumbUrls.get(photo.id)

      // Create popup with photo thumbnail
      const popup = new mapboxgl.Popup({ offset: 25 })
      
      // Only show image if we have the authenticated URL from Firebase API
      const popupContent = thumbUrl
        ? `
          <div style="text-align: center;">
            <img 
              src="${thumbUrl}" 
              alt="Photo thumbnail" 
              style="max-width: 200px; max-height: 200px; border-radius: 4px;"
            />
            ${photo.location.name ? `<div style="margin-top: 8px; font-size: 0.875rem; color: #333;">${photo.location.name}</div>` : ''}
          </div>
        `
        : `
          <div style="text-align: center; padding: 1rem;">
            <div style="font-size: 0.875rem; color: #333;">Loading thumbnail...</div>
            ${photo.location.name ? `<div style="margin-top: 8px; font-size: 0.875rem; color: #333;">${photo.location.name}</div>` : ''}
          </div>
        `
      
      popup.setHTML(popupContent)

      // Create marker at photo location
      const marker = new mapboxgl.Marker()
        .setLngLat([lon, lat])
        .setPopup(popup)
        .addTo(mapInstance)

      markersRef.current.markers.push(marker)
      markersRef.current.markerMap.set(photo.id, { marker, photo })
    })
  }

  // Initialize map (only once)
  useEffect(() => {
    if (!mapContainer.current) return

    const mapboxToken = config.mapboxPublicToken
    if (!mapboxToken) {
      console.error('MapBox public token is not configured. Set VITE_MAPBOX_TOKEN environment variable.')
      return
    }

    // Set MapBox access token
    mapboxgl.accessToken = mapboxToken

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/ahadik/cmiy58cjz002a01sl6hfld8ku', // Default MapBox style
      center: [0, 0], // Center on world
      zoom: 2, // Zoom level to show entire world
      projection: 'mercator',
    })

    // Cleanup on unmount
    return () => {
      // Copy ref values for cleanup
      const currentMarkers = markersRef.current.markers
      const currentMap = map.current
      
      // Remove all markers
      currentMarkers.forEach(marker => marker.remove())
      
      // Reset refs (safe to do in cleanup)
      if (markersRef.current) {
        markersRef.current.markers = []
        markersRef.current.markerMap = new Map()
      }
      
      if (currentMap) {
        currentMap.remove()
        map.current = null
      }
    }
  }, [])

  // Update markers when photos or thumbnail URLs change or map loads
  useEffect(() => {
    if (!map.current) return

    // Wait for map to be loaded before adding markers
    if (map.current.loaded()) {
      addMarkers(map.current, photos, thumbnailUrls)
    } else {
      // If map isn't loaded yet, wait for load event
      map.current.once('load', () => {
        if (map.current) {
          addMarkers(map.current, photos, thumbnailUrls)
        }
      })
    }
  }, [photos, thumbnailUrls])

  const mapboxToken = config.mapboxPublicToken

  if (!mapboxToken) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          color: '#fff',
          fontSize: '1.5rem',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div>MapBox public token not configured</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>
          Set VITE_MAPBOX_TOKEN environment variable
        </div>
        <div style={{ fontSize: '0.75rem', opacity: 0.5, textAlign: 'center', maxWidth: '400px' }}>
          Note: This should be a separate public token with URL restrictions, not the server-side MAPBOX_TOKEN used for geocoding.
        </div>
      </div>
    )
  }

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    />
  )
}
