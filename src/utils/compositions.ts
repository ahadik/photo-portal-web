import { PhotoEntry } from '~/types'
import { ScreenOrientation, getPhotoOrientation } from './orientation'

/**
 * A composition represents a single slide in the slideshow.
 * It can contain either one photo (full bleed or centered) or two photos (side-by-side or stacked).
 */
export interface PhotoComposition {
  type: 'single' | 'pair'
  photos: PhotoEntry[]
  displayMode: 'full-bleed' | 'centered' | 'side-by-side' | 'stacked'
}

/**
 * Creates compositions from photos based on screen orientation and display rules.
 * 
 * Rules:
 * - Screen is "landscape": 
 *   1) "landscape" photos are full bleed (cropped)
 *   2) "square" photos are full bleed (cropped)
 *   3) "portrait" photos display 2 at a time side-by-side, or if only one, centered
 * 
 * - Screen is "square": 
 *   All photos display full bleed width/height
 * 
 * - Screen is "portrait": 
 *   1) "portrait" photos are full bleed (cropped)
 *   2) "square" photos are full bleed (cropped)
 *   3) "landscape" photos display 2 at a time stacked vertically, or if only one, centered
 */
export function createCompositions(
  photos: PhotoEntry[],
  screenOrientation: ScreenOrientation
): PhotoComposition[] {
  if (photos.length === 0) {
    return []
  }

  const compositions: PhotoComposition[] = []

  if (screenOrientation === 'square') {
    // All photos display full bleed
    for (const photo of photos) {
      compositions.push({
        type: 'single',
        photos: [photo],
        displayMode: 'full-bleed',
      })
    }
    return compositions
  }

  if (screenOrientation === 'landscape') {
    // Separate photos by orientation
    const landscapePhotos: PhotoEntry[] = []
    const squarePhotos: PhotoEntry[] = []
    const portraitPhotos: PhotoEntry[] = []

    for (const photo of photos) {
      const photoOrientation = getPhotoOrientation(photo.width, photo.height)
      if (photoOrientation === 'landscape') {
        landscapePhotos.push(photo)
      } else if (photoOrientation === 'square') {
        squarePhotos.push(photo)
      } else {
        portraitPhotos.push(photo)
      }
    }

    // Landscape photos: full bleed
    for (const photo of landscapePhotos) {
      compositions.push({
        type: 'single',
        photos: [photo],
        displayMode: 'full-bleed',
      })
    }

    // Square photos: full bleed
    for (const photo of squarePhotos) {
      compositions.push({
        type: 'single',
        photos: [photo],
        displayMode: 'full-bleed',
      })
    }

    // Portrait photos: 2 side-by-side, or centered if only one
    for (let i = 0; i < portraitPhotos.length; i += 2) {
      if (i + 1 < portraitPhotos.length) {
        // Pair of photos side-by-side
        compositions.push({
          type: 'pair',
          photos: [portraitPhotos[i], portraitPhotos[i + 1]],
          displayMode: 'side-by-side',
        })
      } else {
        // Single portrait photo, centered
        compositions.push({
          type: 'single',
          photos: [portraitPhotos[i]],
          displayMode: 'centered',
        })
      }
    }

    return compositions
  }

  // screenOrientation === 'portrait'
  // Separate photos by orientation
  const landscapePhotos: PhotoEntry[] = []
  const squarePhotos: PhotoEntry[] = []
  const portraitPhotos: PhotoEntry[] = []

  for (const photo of photos) {
    const photoOrientation = getPhotoOrientation(photo.width, photo.height)
    if (photoOrientation === 'portrait') {
      portraitPhotos.push(photo)
    } else if (photoOrientation === 'square') {
      squarePhotos.push(photo)
    } else {
      landscapePhotos.push(photo)
    }
  }

  // Portrait photos: full bleed
  for (const photo of portraitPhotos) {
    compositions.push({
      type: 'single',
      photos: [photo],
      displayMode: 'full-bleed',
    })
  }

  // Square photos: full bleed
  for (const photo of squarePhotos) {
    compositions.push({
      type: 'single',
      photos: [photo],
      displayMode: 'full-bleed',
    })
  }

  // Landscape photos: 2 stacked vertically, or centered if only one
  for (let i = 0; i < landscapePhotos.length; i += 2) {
    if (i + 1 < landscapePhotos.length) {
      // Pair of photos stacked
      compositions.push({
        type: 'pair',
        photos: [landscapePhotos[i], landscapePhotos[i + 1]],
        displayMode: 'stacked',
      })
    } else {
      // Single landscape photo, centered
      compositions.push({
        type: 'single',
        photos: [landscapePhotos[i]],
        displayMode: 'centered',
      })
    }
  }

  return compositions
}
