import { PhotoEntry } from '~/types'
import { ScreenOrientation, getPhotoOrientation, PhotoOrientation } from './orientation'

/**
 * A composition represents a single slide in the slideshow.
 * It can contain either one photo (full bleed or centered) or two photos (side-by-side or stacked).
 */
export interface PhotoComposition {
  type: 'single' | 'pair'
  photos: PhotoEntry[]
  displayMode: 'full-bleed' | 'centered' | 'side-by-side' | 'stacked'
}

function dedupeById(photos: PhotoEntry[]): PhotoEntry[] {
  const seen = new Map<string, PhotoEntry>()
  for (const photo of photos) {
    if (!seen.has(photo.id)) {
      seen.set(photo.id, photo)
    }
  }
  return Array.from(seen.values())
}

function groupByOrientation(photos: PhotoEntry[]): Record<PhotoOrientation, PhotoEntry[]> {
  const groups: Record<PhotoOrientation, PhotoEntry[]> = {
    landscape: [],
    portrait: [],
    square: [],
  }
  for (const photo of photos) {
    groups[getPhotoOrientation(photo.width, photo.height)].push(photo)
  }
  return groups
}

function fullBleed(photos: PhotoEntry[]): PhotoComposition[] {
  return photos.map(photo => ({
    type: 'single',
    photos: [photo],
    displayMode: 'full-bleed',
  }))
}

/**
 * Pair photos two at a time, falling back to a centered single if there's an odd one out.
 */
function paired(
  photos: PhotoEntry[],
  pairMode: 'side-by-side' | 'stacked',
): PhotoComposition[] {
  const out: PhotoComposition[] = []
  for (let i = 0; i < photos.length; i += 2) {
    const photo1 = photos[i]
    const photo2 = photos[i + 1]
    if (photo2) {
      out.push({ type: 'pair', photos: [photo1, photo2], displayMode: pairMode })
    } else {
      out.push({ type: 'single', photos: [photo1], displayMode: 'centered' })
    }
  }
  return out
}

/**
 * Creates compositions from photos based on screen orientation and display rules.
 * Ensures each photo appears in exactly one composition.
 *
 * Rules:
 * - Screen "landscape":
 *   landscape + square photos are full bleed; portrait photos pair side-by-side
 *   (centered if odd one out).
 * - Screen "square": all photos display full bleed.
 * - Screen "portrait":
 *   portrait + square photos are full bleed; landscape photos pair stacked
 *   (centered if odd one out).
 */
export function createCompositions(
  photos: PhotoEntry[],
  screenOrientation: ScreenOrientation,
): PhotoComposition[] {
  if (photos.length === 0) return []

  const groups = groupByOrientation(dedupeById(photos))

  if (screenOrientation === 'square') {
    return fullBleed([...groups.landscape, ...groups.square, ...groups.portrait])
  }

  if (screenOrientation === 'landscape') {
    return [
      ...fullBleed(groups.landscape),
      ...fullBleed(groups.square),
      ...paired(groups.portrait, 'side-by-side'),
    ]
  }

  // screenOrientation === 'portrait'
  return [
    ...fullBleed(groups.portrait),
    ...fullBleed(groups.square),
    ...paired(groups.landscape, 'stacked'),
  ]
}
