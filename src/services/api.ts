import { ref, getBytes, getDownloadURL, StorageReference } from 'firebase/storage';
import { dataStorage, mediaStorage } from './firebase';
import { PhotosJson, MessagesJson } from '~/types';
import { config } from '~/config';

type StorageErrorLike = { code?: string; message?: string };

function isMissingObject(error: StorageErrorLike): boolean {
  return (
    error.code === 'storage/object-not-found' ||
    error.code === 'storage/unauthorized' ||
    !!error.message?.includes('404') ||
    !!error.message?.includes('Not Found')
  );
}

/**
 * Fetch a JSON index file from the data bucket, returning `fallback` if the
 * object is missing (the emulator is empty on first run, for example).
 */
async function fetchJsonIndex<T>(filename: string, fallback: T, label: string): Promise<T> {
  const fileRef = ref(dataStorage, filename);
  try {
    const bytes = await getBytes(fileRef);
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch (error) {
    const errorObj = error as StorageErrorLike;
    if (isMissingObject(errorObj)) {
      console.log(`📝 ${filename} not found, returning empty structure`);
      return fallback;
    }
    throw new Error(`Failed to fetch ${label}: ${errorObj.message ?? 'Unknown error'}`);
  }
}

export function fetchPhotosIndex(): Promise<PhotosJson> {
  return fetchJsonIndex<PhotosJson>(
    'photos.json',
    { version: 1, lastUpdated: new Date().toISOString(), photos: [] },
    'photos',
  );
}

export function fetchMessagesIndex(): Promise<MessagesJson> {
  return fetchJsonIndex<MessagesJson>(
    'messages.json',
    { version: 1, lastUpdated: new Date().toISOString(), messages: [] },
    'messages',
  );
}

/**
 * Get an authenticated download URL for an object under `mediaStorage`.
 * `kind` is purely for error messages.
 */
async function getMediaDownloadUrl(path: string, kind: string): Promise<string> {
  try {
    const objectRef: StorageReference = ref(mediaStorage, path);
    return await getDownloadURL(objectRef);
  } catch (error) {
    const errorObj = error as StorageErrorLike;
    if (errorObj.code === 'storage/object-not-found' || errorObj.code === 'storage/unauthorized') {
      throw new Error(`${kind} not found or access denied: ${path}`);
    }
    throw new Error(`Failed to get ${kind} URL: ${errorObj.message ?? 'Unknown error'}`);
  }
}

export function getPhotoDownloadUrl(photoId: string): Promise<string> {
  return getMediaDownloadUrl(`photos/${photoId}.jpg`, 'Photo');
}

export function getThumbnailDownloadUrl(photoId: string): Promise<string> {
  return getMediaDownloadUrl(`thumbs/${photoId}.jpg`, 'Thumbnail');
}

/**
 * Reverse geocode coordinates to get a location name using Google Maps Geocoding API.
 * Results are filtered and selected based on zoom level using address type zoom groups.
 * @param lon - Longitude
 * @param lat - Latitude
 * @param zoom - Current zoom level (1-11)
 * @returns Promise resolving to location name string or null on error
 */

// Address type to zoom group mapping (from CSV)
const ADDRESS_TYPE_TO_ZOOM_GROUP: Record<string, number> = {
  // Zoom Group 1 (least specific)
  political: 1,
  country: 1,
  natural_feature: 1,
  // Zoom Group 2
  administrative_area_level_1: 2,
  // Zoom Group 3
  administrative_area_level_2: 3,
  administrative_area_level_3: 3,
  administrative_area_level_4: 3,
  administrative_area_level_5: 3,
  administrative_area_level_6: 3,
  administrative_area_level_7: 3,
  // Zoom Group 4
  colloquial_area: 4,
  locality: 4,
  airport: 4,
  park: 4,
  // Zoom Group 5 (most specific)
  sublocality: 5,
  neighborhood: 5,
  point_of_interest: 5,
}

/**
 * Determine which zoom group a result belongs to based on its address component types.
 * Returns the highest (most specific) zoom group that matches.
 */
function getResultZoomGroup(result: {
  address_components?: Array<{ types?: string[] }>
}): number | null {
  if (!result.address_components) return null

  let highestZoomGroup: number | null = null

  for (const component of result.address_components) {
    if (!component.types) continue

    for (const type of component.types) {
      const zoomGroup = ADDRESS_TYPE_TO_ZOOM_GROUP[type]
      if (zoomGroup !== undefined) {
        if (highestZoomGroup === null || zoomGroup > highestZoomGroup) {
          highestZoomGroup = zoomGroup
        }
      }
    }
  }

  return highestZoomGroup
}

/**
 * Get the zoom group for the current zoom level
 */
function getZoomGroupForZoomLevel(zoom: number): number {
  if (zoom >= 10) return 5
  if (zoom >= 8) return 4
  if (zoom >= 7) return 3
  if (zoom >= 5) return 2
  return 1
}

/**
 * Extract a hierarchical location name from a geocoding result.
 * Includes components from most specific to least specific, down to country (or state for US).
 * Only includes address types defined in the Zoom Groups.
 * @param result - Geocoding result from Google Maps API
 * @returns Location name string or null
 */
function extractLocationName(result: {
  formatted_address?: string
  address_components?: Array<{
    long_name?: string
    short_name?: string
    types?: string[]
  }>
}): string | null {
  if (!result.address_components || result.address_components.length === 0) {
    return result.formatted_address || null
  }

  // Check if country is United States
  const countryComponent = result.address_components.find(comp => 
    comp.types?.includes('country')
  )
  const isUnitedStates = countryComponent?.short_name === 'US'

  // Extract all components that have types in our zoom group mapping
  // Group by zoom group (highest/most specific first)
  const componentsByZoomGroup: Record<number, Array<{ long_name: string; types: string[] }>> = {}
  
  for (const component of result.address_components) {
    if (!component.types || !component.long_name) continue

    // Find the highest zoom group this component belongs to
    let highestZoomGroup: number | null = null
    for (const type of component.types) {
      const zoomGroup = ADDRESS_TYPE_TO_ZOOM_GROUP[type]
      if (zoomGroup !== undefined) {
        if (highestZoomGroup === null || zoomGroup > highestZoomGroup) {
          highestZoomGroup = zoomGroup
        }
      }
    }

    if (highestZoomGroup !== null) {
      if (!componentsByZoomGroup[highestZoomGroup]) {
        componentsByZoomGroup[highestZoomGroup] = []
      }
      // Avoid duplicates (same long_name already added for this zoom group)
      const existing = componentsByZoomGroup[highestZoomGroup].find(
        c => c.long_name === component.long_name
      )
      if (!existing) {
        componentsByZoomGroup[highestZoomGroup].push({
          long_name: component.long_name,
          types: component.types,
        })
      }
    }
  }

  // Build location string from most specific (zoom group 5) to least specific
  // For US: go down to zoom group 2 (state), but skip zoom group 3 (counties)
  // For other countries: go down to zoom group 1 (country)
  const minZoomGroup = isUnitedStates ? 2 : 1
  const locationParts: string[] = []

  // Process from highest zoom group (5) down to minimum
  for (let zoomGroup = 5; zoomGroup >= minZoomGroup; zoomGroup--) {
    // Skip zoom group 3 (counties) for US locations
    if (isUnitedStates && zoomGroup === 3) {
      continue
    }
    const components = componentsByZoomGroup[zoomGroup]
    if (components && components.length > 0) {
      // For each zoom group, prefer certain types to avoid duplicates
      // e.g., prefer 'locality' over 'colloquial_area' if both exist
      const typePriority: Record<number, string[]> = {
        5: ['neighborhood', 'sublocality', 'sublocality_level_1', 'sublocality_level_2', 'sublocality_level_3', 'sublocality_level_4', 'sublocality_level_5', 'point_of_interest'],
        4: ['locality', 'colloquial_area', 'park', 'airport'],
        3: ['administrative_area_level_2', 'administrative_area_level_3', 'administrative_area_level_4', 'administrative_area_level_5', 'administrative_area_level_6', 'administrative_area_level_7'],
        2: ['administrative_area_level_1'],
        1: ['country', 'political', 'natural_feature'],
      }

      const priorities = typePriority[zoomGroup] || []
      let selectedComponent: { long_name: string } | null = null

      // Try to find component with highest priority type
      for (const priorityType of priorities) {
        const component = components.find(comp => comp.types.includes(priorityType))
        if (component) {
          selectedComponent = component
          break
        }
      }

      // If no priority match, use first component
      if (!selectedComponent) {
        selectedComponent = components[0]
      }

      if (selectedComponent && !locationParts.includes(selectedComponent.long_name)) {
        locationParts.push(selectedComponent.long_name)
      }
    }
  }

  // If we have location parts, join them with commas
  if (locationParts.length > 0) {
    return locationParts.join(', ')
  }

  // Fallback: use formatted_address if no valid components found
  return result.formatted_address || null
}

export async function reverseGeocode(lon: number, lat: number, zoom: number): Promise<string | null> {
  if (!config.googleMapsApiKey) {
    console.warn('Google Maps API key not configured for reverse geocoding')
    return null
  }

  // Build result_type parameter with all valid address types from zoom groups
  const validAddressTypes = Object.keys(ADDRESS_TYPE_TO_ZOOM_GROUP).join('|')

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('latlng', `${lat},${lon}`)
  url.searchParams.set('key', config.googleMapsApiKey)
  url.searchParams.set('result_type', validAddressTypes)

  try {
    const response = await fetch(url.toString())
    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as {
      status: string
      results?: Array<{
        formatted_address?: string
        address_components?: Array<{
          long_name?: string
          short_name?: string
          types?: string[]
        }>
      }>
    }

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return null
    }

    const results = data.results

    // Assign zoom group to each result and filter out results without a zoom group
    // (results are already filtered at API level to only include valid address types)
    const resultsWithZoomGroup = results
      .map(result => ({
        result,
        zoomGroup: getResultZoomGroup(result),
      }))
      .filter((item): item is { result: typeof results[0]; zoomGroup: number } => item.zoomGroup !== null)

    // Sort by zoom group in ascending order (lowest to highest)
    resultsWithZoomGroup.sort((a, b) => a.zoomGroup - b.zoomGroup)

    // Get current zoom group
    const currentZoomGroup = getZoomGroupForZoomLevel(zoom)

    // Selection algorithm:
    // i. Find results matching current zoom group, return first
    const currentZoomGroupResult = resultsWithZoomGroup.find(item => item.zoomGroup === currentZoomGroup)
    if (currentZoomGroupResult) {
      return extractLocationName(currentZoomGroupResult.result)
    }

    // ii. If no match, search for results in higher zoom groups (more specific)
    // Find the lowest zoom group that's higher than current
    const higherZoomGroupResults = resultsWithZoomGroup.filter(item => item.zoomGroup > currentZoomGroup)
    if (higherZoomGroupResults.length > 0) {
      // Find the lowest zoom group in this set
      const lowestHigherZoomGroup = Math.min(...higherZoomGroupResults.map(item => item.zoomGroup))
      const firstHigherResult = higherZoomGroupResults.find(item => item.zoomGroup === lowestHigherZoomGroup)
      if (firstHigherResult) {
        return extractLocationName(firstHigherResult.result)
      }
    }

    // iii. If still no match, search for results in lower zoom groups (less specific)
    // Find the highest zoom group that's lower than current
    const lowerZoomGroupResults = resultsWithZoomGroup.filter(item => item.zoomGroup < currentZoomGroup)
    if (lowerZoomGroupResults.length > 0) {
      // Find the highest zoom group in this set
      const highestLowerZoomGroup = Math.max(...lowerZoomGroupResults.map(item => item.zoomGroup))
      const firstLowerResult = lowerZoomGroupResults.find(item => item.zoomGroup === highestLowerZoomGroup)
      if (firstLowerResult) {
        return extractLocationName(firstLowerResult.result)
      }
    }

    // Fallback: return first result if algorithm doesn't find a match
    return extractLocationName(results[0])
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}
