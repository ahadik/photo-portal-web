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
 * Ensures each photo appears in exactly one composition.
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

  // Deduplicate photos by ID to ensure each photo appears only once
  const photoMap = new Map<string, PhotoEntry>()
  for (const photo of photos) {
    if (!photoMap.has(photo.id)) {
      photoMap.set(photo.id, photo)
    }
  }
  const uniquePhotos = Array.from(photoMap.values())

  const compositions: PhotoComposition[] = []
  const usedPhotoIds = new Set<string>()

  if (screenOrientation === 'square') {
    // All photos display full bleed
    for (const photo of uniquePhotos) {
      if (usedPhotoIds.has(photo.id)) {
        console.warn(`Photo ${photo.id} already used in a composition, skipping`)
        continue
      }
      compositions.push({
        type: 'single',
        photos: [photo],
        displayMode: 'full-bleed',
      })
      usedPhotoIds.add(photo.id)
    }
    return compositions
  }

  if (screenOrientation === 'landscape') {
    // Separate photos by orientation
    const landscapePhotos: PhotoEntry[] = []
    const squarePhotos: PhotoEntry[] = []
    const portraitPhotos: PhotoEntry[] = []

    for (const photo of uniquePhotos) {
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
      if (usedPhotoIds.has(photo.id)) {
        console.warn(`Photo ${photo.id} already used in a composition, skipping`)
        continue
      }
      compositions.push({
        type: 'single',
        photos: [photo],
        displayMode: 'full-bleed',
      })
      usedPhotoIds.add(photo.id)
    }

    // Square photos: full bleed
    for (const photo of squarePhotos) {
      if (usedPhotoIds.has(photo.id)) {
        console.warn(`Photo ${photo.id} already used in a composition, skipping`)
        continue
      }
      compositions.push({
        type: 'single',
        photos: [photo],
        displayMode: 'full-bleed',
      })
      usedPhotoIds.add(photo.id)
    }

    // Portrait photos: 2 side-by-side, or centered if only one
    for (let i = 0; i < portraitPhotos.length; i += 2) {
      const photo1 = portraitPhotos[i]
      if (!photo1 || usedPhotoIds.has(photo1.id)) {
        console.warn(`Photo ${photo1?.id} already used in a composition, skipping`)
        continue
      }

      if (i + 1 < portraitPhotos.length) {
        const photo2 = portraitPhotos[i + 1]
        if (usedPhotoIds.has(photo2.id)) {
          console.warn(`Photo ${photo2.id} already used in a composition, skipping pair`)
          // Use photo1 as single instead
          compositions.push({
            type: 'single',
            photos: [photo1],
            displayMode: 'centered',
          })
          usedPhotoIds.add(photo1.id)
          continue
        }
        // Pair of photos side-by-side
        compositions.push({
          type: 'pair',
          photos: [photo1, photo2],
          displayMode: 'side-by-side',
        })
        usedPhotoIds.add(photo1.id)
        usedPhotoIds.add(photo2.id)
      } else {
        // Single portrait photo, centered
        compositions.push({
          type: 'single',
          photos: [photo1],
          displayMode: 'centered',
        })
        usedPhotoIds.add(photo1.id)
      }
    }

    return compositions
  }

  // screenOrientation === 'portrait'
  // Separate photos by orientation
  const landscapePhotos: PhotoEntry[] = []
  const squarePhotos: PhotoEntry[] = []
  const portraitPhotos: PhotoEntry[] = []

  for (const photo of uniquePhotos) {
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
    if (usedPhotoIds.has(photo.id)) {
      console.warn(`Photo ${photo.id} already used in a composition, skipping`)
      continue
    }
    compositions.push({
      type: 'single',
      photos: [photo],
      displayMode: 'full-bleed',
    })
    usedPhotoIds.add(photo.id)
  }

  // Square photos: full bleed
  for (const photo of squarePhotos) {
    if (usedPhotoIds.has(photo.id)) {
      console.warn(`Photo ${photo.id} already used in a composition, skipping`)
      continue
    }
    compositions.push({
      type: 'single',
      photos: [photo],
      displayMode: 'full-bleed',
    })
    usedPhotoIds.add(photo.id)
  }

  // Landscape photos: 2 stacked vertically, or centered if only one
  for (let i = 0; i < landscapePhotos.length; i += 2) {
    const photo1 = landscapePhotos[i]
    if (!photo1 || usedPhotoIds.has(photo1.id)) {
      console.warn(`Photo ${photo1?.id} already used in a composition, skipping`)
      continue
    }

    if (i + 1 < landscapePhotos.length) {
      const photo2 = landscapePhotos[i + 1]
      if (usedPhotoIds.has(photo2.id)) {
        console.warn(`Photo ${photo2.id} already used in a composition, skipping pair`)
        // Use photo1 as single instead
        compositions.push({
          type: 'single',
          photos: [photo1],
          displayMode: 'centered',
        })
        usedPhotoIds.add(photo1.id)
        continue
      }
      // Pair of photos stacked
      compositions.push({
        type: 'pair',
        photos: [photo1, photo2],
        displayMode: 'stacked',
      })
      usedPhotoIds.add(photo1.id)
      usedPhotoIds.add(photo2.id)
    } else {
      // Single landscape photo, centered
      compositions.push({
        type: 'single',
        photos: [photo1],
        displayMode: 'centered',
      })
      usedPhotoIds.add(photo1.id)
    }
  }

  return compositions
}
