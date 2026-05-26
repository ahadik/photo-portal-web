import { useCallback, useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import mapboxgl from 'mapbox-gl'
import Supercluster from 'supercluster'
import { config } from '~/config'
import { PhotoEntry } from '~/types'
import { usePhotoUrls } from '~/contexts/PhotoUrlContext'
import type { Feature, Point, Polygon } from 'geojson'
import { reverseGeocode } from '~/services/api'
import MapViewCrosshair from './MapViewCrosshair'
import MetadataOverlay from '~/components/device/MetadataOverlay'

import './MapView.css'

// Define type alias to avoid 'any' union type error
type LocationFilter = {
  north: number
  south: number
  east: number
  west: number
}

interface MapViewProps {
  photos: PhotoEntry[]
  zoomLevel?: number // Zoom level between 1-11, defaults to 2
  activeLocationFilter?: LocationFilter | null // Active bounding box filter
  showMetadata?: boolean // Controls crosshair and metadata overlay visibility
}

export interface MapViewRef {
  getCurrentBounds: () => LocationFilter | null
  centerOnCoordinates: (lat: number, lon: number, zoom?: number, allowZoom?: boolean) => void
}

/**
 * MapView component displays a full-screen MapBox map of the world.
 * Renders when Map View toggle is enabled.
 * Displays photo location pins for photos with location data.
 */
interface MarkersRef {
  markers: mapboxgl.Marker[]
  clusterIndex: Supercluster | null
  photosMap: Map<string, PhotoEntry>
  eventHandlers: Array<() => void>
}

const MapView = forwardRef<MapViewRef, MapViewProps>(({ photos, zoomLevel = 2, activeLocationFilter = null, showMetadata = false }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<MarkersRef>({
    markers: [],
    clusterIndex: null,
    photosMap: new Map(),
    eventHandlers: [],
  })
  const { getThumbUrl } = usePhotoUrls()
  const [, setCurrentZoom] = useState<number>(zoomLevel)
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  type GeocodeResult = 'loading' | string | null
  const [reverseGeocodeResult, setReverseGeocodeResult] = useState<GeocodeResult>(null)
  const [photoCount, setPhotoCount] = useState<number>(0)
  const [isMapInteracting, setIsMapInteracting] = useState<boolean>(false)
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const triggerGeocodeRef = useRef<((mapInstance: mapboxgl.Map) => void) | null>(null)
  const zoomInteractionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Convert photos to GeoJSON features for Supercluster
  const createGeoJSONFeatures = useCallback((photosData: PhotoEntry[]) => {
    const photosMap = new Map<string, PhotoEntry>()
    const features: Array<Feature<Point, { photoId: string }>> = []

    photosData.forEach(photo => {
      if (!photo.location) return

      photosMap.set(photo.id, photo)

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [photo.location.lon, photo.location.lat],
        },
        properties: {
          photoId: photo.id,
        },
      })
    })

    markersRef.current.photosMap = photosMap
    return features
  }, [])

  // Initialize cluster index
  const createClusterIndex = useCallback((photosData: PhotoEntry[]): Supercluster | null => {
    const photosWithLocation = photosData.filter(photo => photo.location !== null)
    if (photosWithLocation.length === 0) return null

    const features = createGeoJSONFeatures(photosWithLocation)

    const clusterIndex = new Supercluster({
      radius: 60, // Pixel radius for clustering
      maxZoom: 11,
      minZoom: 1,
      minPoints: 2, // Minimum points to form a cluster
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    clusterIndex.load(features as any)
    return clusterIndex
  }, [createGeoJSONFeatures])

  // Select representative thumbnail for cluster (most recent photo)
  const selectClusterThumbnail = useCallback((photoIds: string[]): PhotoEntry | null => {
    let selectedPhoto: PhotoEntry | null = null
    let latestDate: Date | null = null

    photoIds.forEach(photoId => {
      const photo = markersRef.current.photosMap.get(photoId)
      if (!photo) return

      const date = photo.capturedAt 
        ? new Date(photo.capturedAt)
        : new Date(photo.uploadedAt)

      if (!latestDate || date > latestDate) {
        latestDate = date
        selectedPhoto = photo
      }
    })

    return selectedPhoto
  }, [])

  // Create pin marker element (zoom < 6)
  const createPinMarkerElement = useCallback((count?: number): HTMLElement => {
    const el = document.createElement('div')
    el.className = 'cluster-pin'

    if (count && count > 1) {
      const countBadge = document.createElement('div')
      countBadge.className = 'cluster-pin--count'
      countBadge.textContent = count.toString()
      el.appendChild(countBadge)
    }

    return el
  }, [])

  // Create bubble marker element (zoom >= 6)
  const createBubbleMarkerElement = useCallback((
    thumbnailUrl: string | undefined,
    count?: number
  ): HTMLElement => {
    const el = document.createElement('div')
    el.className = 'cluster-bubble'

    if (thumbnailUrl) {
      const img = document.createElement('img')
      img.className = 'cluster-bubble--thumbnail'
      img.src = thumbnailUrl
      img.alt = 'Photo thumbnail'
      el.appendChild(img)
    } else {
      console.error('No thumbnail URL provided for bubble marker')
    }

    if (count && count > 1) {
      const countBadge = document.createElement('div')
      countBadge.className = 'cluster-bubble--count'
      countBadge.textContent = count.toString()
      el.appendChild(countBadge)
    }

    return el
  }, [])

  // Get current map bounds
  const getCurrentBounds = useCallback((): LocationFilter | null => {
    if (!map.current) return null
    const bounds = map.current.getBounds()
    if (!bounds) return null
    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    }
  }, [])

  // Count photos within current viewport bounds
  const countPhotosInViewport = useCallback((mapInstance: mapboxgl.Map): number => {
    const bounds = mapInstance.getBounds()
    if (!bounds) return 0

    return photos.filter(photo => {
      if (!photo.location) return false
      const lat = photo.location.lat
      const lon = photo.location.lon
      return (
        lat >= bounds.getSouth() &&
        lat <= bounds.getNorth() &&
        lon >= bounds.getWest() &&
        lon <= bounds.getEast()
      )
    }).length
  }, [photos])

  // Perform reverse geocoding of map center
  const performReverseGeocode = useCallback(async (mapInstance: mapboxgl.Map) => {
    if (!showMetadata) return
    const center = mapInstance.getCenter()
    const zoom = mapInstance.getZoom()

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()

    setReverseGeocodeResult('loading')

    try {
       
      const locationName: string | null = await reverseGeocode(center.lng, center.lat, zoom)
      // Only update if request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        setReverseGeocodeResult(locationName)
      }
    } catch (error) {
      // Only update if request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        console.error('error', error)
        setReverseGeocodeResult(null)
      }
    }
  }, [showMetadata])

  // Debounced geocoding trigger
  const triggerGeocode = useCallback((mapInstance: mapboxgl.Map) => {
    if (!showMetadata) {
      setReverseGeocodeResult(null)
      return
    }

    // Clear existing timeout
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current)
    }

    // Update photo count immediately
    const count = countPhotosInViewport(mapInstance)
    setPhotoCount(count)

    // Set new timeout for geocoding
    geocodeTimeoutRef.current = setTimeout(() => {
      void performReverseGeocode(mapInstance)
    }, 500)
  }, [showMetadata, countPhotosInViewport, performReverseGeocode])

  // Keep ref updated with latest triggerGeocode function
  useEffect(() => {
    triggerGeocodeRef.current = triggerGeocode
  }, [triggerGeocode])

  // Center map on coordinates
  // If allowZoom is false, zoom level will not be set (hardware controls zoom)
  const centerOnCoordinates = useCallback((lat: number, lon: number, zoom?: number, allowZoom: boolean = true) => {
    if (!map.current) return
    
    const options: { center: [number, number]; zoom?: number } = {
      center: [lon, lat],
    }
    
    // Only set zoom if allowed (not when hardware is connected)
    if (allowZoom && zoom !== undefined) {
      options.zoom = Math.max(config.minZoomLevel, Math.min(config.maxZoomLevel, zoom))
    }
    
    map.current.flyTo(options)
  }, [])

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getCurrentBounds,
    centerOnCoordinates,
  }), [getCurrentBounds, centerOnCoordinates])

  // Update rectangle on map when filter changes
  const updateFilterRectangle = useCallback((mapInstance: mapboxgl.Map, bounds: LocationFilter | null) => {
    const sourceId = 'filter-rectangle-source'
    const fillLayerId = 'filter-rectangle-fill'
    const lineLayerId = 'filter-rectangle-line'

    // Remove existing layers and source if they exist
    if (mapInstance.getLayer(fillLayerId)) {
      mapInstance.removeLayer(fillLayerId)
    }
    if (mapInstance.getLayer(lineLayerId)) {
      mapInstance.removeLayer(lineLayerId)
    }
    if (mapInstance.getSource(sourceId)) {
      mapInstance.removeSource(sourceId)
    }

    if (!bounds) return

    // Create GeoJSON polygon for the rectangle
    // TypeScript knows bounds is LocationFilter here due to the null check above
    const west: number = bounds.west
    const south: number = bounds.south
    const east: number = bounds.east
    const north: number = bounds.north
    
    const polygon: Polygon = {
      type: 'Polygon',
      coordinates: [[
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ]],
    }
    
    const rectangle: Feature<Polygon> = {
      type: 'Feature',
      geometry: polygon,
      properties: {},
    }

    // Add source
    mapInstance.addSource(sourceId, {
      type: 'geojson',
      data: rectangle,
    })

    // Add fill layer
    mapInstance.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.1,
      },
    })

    // Add line layer
    mapInstance.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#3b82f6',
        'line-width': 2,
        'line-opacity': 0.8,
      },
    })
  }, [])

  // Update clusters and markers based on current zoom and viewport
  const updateClusters = useCallback((mapInstance: mapboxgl.Map) => {
    if (!markersRef.current.clusterIndex) return

    // Remove existing markers
    markersRef.current.markers.forEach(marker => marker.remove())
    markersRef.current.markers = []

    const zoom = mapInstance.getZoom()
    const bounds = mapInstance.getBounds()

    if (!bounds) return

    // Get bounding box for cluster query
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ]

    // Query clusters for current zoom and viewport
    const clusters = markersRef.current.clusterIndex.getClusters(bbox, zoom)

    clusters.forEach(cluster => {
      const coordinates = cluster.geometry.coordinates
      if (!coordinates || coordinates.length < 2) return

      const [clusterLon, clusterLat] = coordinates as [number, number]
       
      const props = cluster.properties as Record<string, unknown>
      if (!props) return

      // eslint-disable-next-line react/prop-types
      const isCluster = props.cluster === true
      // eslint-disable-next-line react/prop-types
      const pointCount = typeof props.point_count === 'number' ? props.point_count : undefined

      let markerElement: HTMLElement
      let photo: PhotoEntry | undefined
      let photoIds: string[] | undefined
      let markerLon: number
      let markerLat: number

      if (isCluster && pointCount && typeof cluster.id === 'number') {
        // It's a cluster
        const leaves = markersRef.current.clusterIndex!.getLeaves(cluster.id, Infinity)
        photoIds = leaves
          .map(leaf => {
             
            const leafProps = leaf.properties as Record<string, unknown> | null
             
            return leafProps && typeof leafProps.photoId === 'string' ? leafProps.photoId : null
          })
          .filter((id): id is string => id !== null)

        const selectedPhoto = selectClusterThumbnail(photoIds)
        photo = selectedPhoto || undefined

        // Use cluster center coordinates for clusters
        markerLon = clusterLon
        markerLat = clusterLat

        if (zoom >= 6) {
          // Bubble marker for clusters at zoom >= 6
          const thumbnailUrl = selectedPhoto ? getThumbUrl(selectedPhoto.id) : undefined
           
          markerElement = createBubbleMarkerElement(thumbnailUrl || undefined, pointCount)
        } else {
          // Pin marker for clusters at zoom < 6
           
          markerElement = createPinMarkerElement(pointCount)
        }
      } else {
        // It's a single point
        // eslint-disable-next-line react/prop-types
        const photoId = typeof props.photoId === 'string' ? props.photoId : undefined
        if (!photoId) return

        photo = markersRef.current.photosMap.get(photoId)
        if (!photo || !photo.location) return

        // Use the original photo coordinate for single points to ensure accuracy
        markerLon = photo.location.lon
        markerLat = photo.location.lat

        if (zoom >= 6) {
          // Bubble marker for single points at zoom >= 6
          const thumbnailUrl = getThumbUrl(photoId)
          markerElement = createBubbleMarkerElement(thumbnailUrl || undefined)
        } else {
          // Pin marker for single points at zoom < 6
          markerElement = createPinMarkerElement()
        }
      }

      // Create marker
      // Use 'bottom' anchor for all markers (like pins), then offset bubbles upward to center them
      // This avoids center calculation issues that can cause drift
      const marker = new mapboxgl.Marker({ 
        element: markerElement,
        anchor: 'center',
        // offset: zoom >= 6 ? [0, -40] : [0, 0] // Offset bubbles up by half height (80px / 2 = 40px)
      })
        .setLngLat([markerLon, markerLat])
        .addTo(mapInstance)

      markersRef.current.markers.push(marker)
    })
  }, [getThumbUrl, createBubbleMarkerElement, createPinMarkerElement, selectClusterThumbnail])

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
      zoom: zoomLevel, // Zoom level to show entire world
      projection: 'mercator',
      touchZoomRotate: false, // Disable touch zooming entirely
    })

    // Initialize current zoom state
    setCurrentZoom(zoomLevel)

    // Initialize cluster index
    markersRef.current.clusterIndex = createClusterIndex(photos)

    // Set up event listeners for zoom and move
    const handleZoom = () => {
      if (!map.current) return
      setCurrentZoom(map.current.getZoom())
    }

    const handleMoveEnd = () => {
      if (!map.current) return
      setIsMapInteracting(false)
      updateClusters(map.current)
      if (triggerGeocodeRef.current) {
        triggerGeocodeRef.current(map.current)
      }
    }

    const handleZoomEnd = () => {
      if (!map.current) return
      setIsMapInteracting(false)
      updateClusters(map.current)
      if (triggerGeocodeRef.current) {
        triggerGeocodeRef.current(map.current)
      }
    }

    const handleMove = () => {
      if (!map.current) return
      if (triggerGeocodeRef.current) {
        triggerGeocodeRef.current(map.current)
      }
    }

    const handleMoveStart = () => {
      setIsMapInteracting(true)
    }

    const handleZoomStart = () => {
      setIsMapInteracting(true)
    }

    const handleDragStart = () => {
      setIsMapInteracting(true)
    }

    const handleDragEnd = () => {
      setIsMapInteracting(false)
    }

    const mapInstance = map.current

    mapInstance.on('zoom', handleZoom)
    mapInstance.on('zoomstart', handleZoomStart)
    mapInstance.on('zoomend', handleZoomEnd)
    mapInstance.on('moveend', handleMoveEnd)
    mapInstance.on('movestart', handleMoveStart)
    mapInstance.on('move', handleMove)
    mapInstance.on('dragstart', handleDragStart)
    mapInstance.on('dragend', handleDragEnd)

    // Store cleanup functions
    markersRef.current.eventHandlers.push(
      () => mapInstance.off('zoom', handleZoom),
      () => mapInstance.off('zoomstart', handleZoomStart),
      () => mapInstance.off('zoomend', handleZoomEnd),
      () => mapInstance.off('moveend', handleMoveEnd),
      () => mapInstance.off('movestart', handleMoveStart),
      () => mapInstance.off('move', handleMove),
      () => mapInstance.off('dragstart', handleDragStart),
      () => mapInstance.off('dragend', handleDragEnd)
    )

    // Initial cluster update once map is loaded
    mapInstance.once('load', () => {
      if (map.current) {
        updateClusters(map.current)
        // Render filter rectangle if active
        if (activeLocationFilter) {
          updateFilterRectangle(map.current, activeLocationFilter)
        }
        // Trigger initial geocode if metadata is enabled
        if (showMetadata && triggerGeocodeRef.current) {
          triggerGeocodeRef.current(map.current)
        }
      }
    })

    // Cleanup on unmount
    return () => {
      // Copy ref values for cleanup
      const currentMarkers = [...markersRef.current.markers]
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const eventHandlers = [...markersRef.current.eventHandlers]
      const currentMap = map.current
      
      // Clear geocode timeout
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current)
      }

      // Clear zoom interaction timeout
      const zoomTimeout = zoomInteractionTimeoutRef.current
      if (zoomTimeout) {
        clearTimeout(zoomTimeout)
      }

      // Abort any in-flight geocoding request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Remove event listeners
      eventHandlers.forEach(cleanup => cleanup())
      
      // Remove all markers
      currentMarkers.forEach(marker => marker.remove())
      
      if (currentMap) {
        currentMap.remove()
        map.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update cluster index when photos change
  useEffect(() => {
    markersRef.current.clusterIndex = createClusterIndex(photos)
    
    if (map.current && map.current.loaded()) {
      updateClusters(map.current)
    }
  }, [photos, createClusterIndex, updateClusters])

  // Update zoom level when prop changes (from hardware/virtual controls)
  useEffect(() => {
    if (!map.current) return

    // Clamp zoom level to valid range (1-11)
    const clampedZoom = Math.max(1, Math.min(config.maxZoomLevel, zoomLevel))
    
    // Only update if zoom has actually changed to avoid unnecessary updates
    if (Math.abs(map.current.getZoom() - clampedZoom) > 0.01) {
      map.current.setZoom(clampedZoom)
      setCurrentZoom(clampedZoom)
      
      // Set interacting state when zoom changes via controls
      setIsMapInteracting(true)
      
      // Clear existing timeout
      const existingTimeout = zoomInteractionTimeoutRef.current
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }
      
      // Set timeout to clear interacting state after zoom stops
      // 300ms seems reasonable - allows for rapid zoom changes without flickering
      const timeoutId = setTimeout(() => {
        setIsMapInteracting(false)
        zoomInteractionTimeoutRef.current = null
      }, 300)
      zoomInteractionTimeoutRef.current = timeoutId
      
      // Clusters will be updated via zoomend event
    }
    
    // Cleanup timeout on unmount or when zoomLevel changes
    return () => {
      const timeoutId = zoomInteractionTimeoutRef.current
      if (timeoutId) {
        clearTimeout(timeoutId)
        zoomInteractionTimeoutRef.current = null
      }
    }
  }, [zoomLevel])

  // Update filter rectangle when filter changes
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return
    updateFilterRectangle(map.current, activeLocationFilter)
  }, [activeLocationFilter, updateFilterRectangle])

  // Trigger geocoding when metadata toggle changes
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return
    
    if (showMetadata) {
      triggerGeocode(map.current)
    } else {
      // Clear geocode result when metadata is disabled
      setReverseGeocodeResult(null)
      // Clear timeout
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current)
      }
      // Abort any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [showMetadata, triggerGeocode])

  // Cleanup geocode timeout on unmount
  useEffect(() => {
    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

   
  const mapboxToken = config.mapboxPublicToken

  if (!mapboxToken) {
    return (
      <div
        className="mapview--no-token"
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
      className="mapview"
    >
      {showMetadata && (
        <>
          <MapViewCrosshair visible={showMetadata} isInteracting={isMapInteracting} />
          <MetadataOverlay
            leftText={reverseGeocodeResult === 'loading' ? 'Loading...' : reverseGeocodeResult || 'unavailable'}
            rightText={`Photos: ${photoCount}`}
          />
        </>
      )}
    </div>
  )
})

MapView.displayName = 'MapView'

export default MapView
