/**
 * Determines screen orientation based on viewport dimensions.
 * Uses height/width ratio to determine orientation:
 * - landscape: height/width <= 3/4
 * - portrait: height/width >= 4/3
 * - square: 3/4 < height/width < 4/3
 */
export type ScreenOrientation = 'landscape' | 'portrait' | 'square'

export function getScreenOrientation(width: number, height: number): ScreenOrientation {
  const heightWidthRatio = height / width
  
  if (heightWidthRatio <= 3 / 4) {
    return 'landscape'
  } else if (heightWidthRatio >= 4 / 3) {
    return 'portrait'
  } else {
    return 'square'
  }
}

/**
 * Determines photo orientation based on dimensions.
 * Uses the same logic as screen orientation.
 */
export type PhotoOrientation = 'landscape' | 'portrait' | 'square'

export function getPhotoOrientation(width: number, height: number): PhotoOrientation {
  return getScreenOrientation(width, height)
}
