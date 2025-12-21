import { useCallback, useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import mapboxgl from 'mapbox-gl'
import Supercluster from 'supercluster'
import { config } from '~/config'
import { PhotoEntry } from '~/types'
import { usePhotoUrls } from '~/contexts/PhotoUrlContext'
import type { Feature, Point, Polygon } from 'geojson'

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
}

export interface MapViewRef {
  getCurrentBounds: () => LocationFilter | null
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

const MapView = forwardRef<MapViewRef, MapViewProps>(({ photos, zoomLevel = 2, activeLocationFilter = null }, ref) => {
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

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getCurrentBounds,
  }), [getCurrentBounds])

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, react/prop-types
      const props = cluster.properties as Record<string, unknown>
      if (!props) return

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, react/prop-types
      const isCluster = props.cluster === true
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, react/prop-types
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, react/prop-types
            const leafProps = leaf.properties as Record<string, unknown> | null
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          markerElement = createBubbleMarkerElement(thumbnailUrl || undefined, pointCount)
        } else {
          // Pin marker for clusters at zoom < 6
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          markerElement = createPinMarkerElement(pointCount)
        }
      } else {
        // It's a single point
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, react/prop-types
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const mapboxToken = config.mapboxPublicToken
    if (!mapboxToken) {
      console.error('MapBox public token is not configured. Set VITE_MAPBOX_TOKEN environment variable.')
      return
    }

    // Set MapBox access token
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    mapboxgl.accessToken = mapboxToken

    // Initialize map
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/ahadik/cmiy58cjz002a01sl6hfld8ku', // Default MapBox style
      center: [0, 0], // Center on world
      zoom: zoomLevel, // Zoom level to show entire world
      projection: 'mercator',
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
      updateClusters(map.current)
    }

    const handleZoomEnd = () => {
      if (!map.current) return
      updateClusters(map.current)
    }

    const mapInstance = map.current

    mapInstance.on('zoom', handleZoom)
    mapInstance.on('zoomend', handleZoomEnd)
    mapInstance.on('moveend', handleMoveEnd)

    // Store cleanup functions
    markersRef.current.eventHandlers.push(
      () => mapInstance.off('zoom', handleZoom),
      () => mapInstance.off('zoomend', handleZoomEnd),
      () => mapInstance.off('moveend', handleMoveEnd)
    )

    // Initial cluster update once map is loaded
    mapInstance.once('load', () => {
      if (map.current) {
        updateClusters(map.current)
        // Render filter rectangle if active
        if (activeLocationFilter) {
          updateFilterRectangle(map.current, activeLocationFilter)
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

  // Update zoom level when prop changes
  useEffect(() => {
    if (!map.current) return

    // Clamp zoom level to valid range (1-11)
    const clampedZoom = Math.max(1, Math.min(config.maxZoomLevel, zoomLevel))
    
    // Only update if zoom has actually changed to avoid unnecessary updates
    if (Math.abs(map.current.getZoom() - clampedZoom) > 0.01) {
      map.current.setZoom(clampedZoom)
      setCurrentZoom(clampedZoom)
      // Clusters will be updated via zoomend event
    }
  }, [zoomLevel])

  // Update filter rectangle when filter changes
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return
    updateFilterRectangle(map.current, activeLocationFilter)
  }, [activeLocationFilter, updateFilterRectangle])

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
    />
  )
})

MapView.displayName = 'MapView'

export default MapView
