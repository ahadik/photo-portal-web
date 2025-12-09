# Orientation-Based Photo Display Rules

## Overview

The photo portal implements an intelligent display system that adapts photo presentation based on both the device screen orientation and individual photo orientations. This system ensures optimal viewing experiences by minimizing cropping and maximizing screen real estate utilization.

## Orientation Classification

### Classification Method

Both screen and photo orientations are classified using the same height-to-width ratio calculation:

- **Landscape**: `height / width ≤ 3/4`
- **Portrait**: `height / width ≥ 4/3`
- **Square**: `3/4 < height / width < 4/3`

### Computation

- **Screen Orientation**: Computed dynamically from viewport dimensions on initial render and whenever the viewport size changes (e.g., device rotation, window resize).
- **Photo Orientation**: Computed on the frontend from photo dimensions (width/height) stored in `photos.json`. This frontend computation allows orientation classification rules to be adjusted without requiring backend data updates.

## Display Rules

The system creates "compositions" (single slides in the slideshow) that contain either one photo or a pair of photos, depending on the relationship between screen and photo orientations.

### Landscape Screen (`height / width ≤ 3/4`)

1. **Landscape photos**: Display full-bleed (cropped to fill screen)
2. **Square photos**: Display full-bleed (cropped to fill screen)
3. **Portrait photos**: 
   - If multiple portrait photos exist: Display 2 photos side-by-side horizontally, each taking full height and half the width
   - If only one portrait photo exists: Display centered with left/right margins so the full photo is visible (no cropping)

### Square Screen (`3/4 < height / width < 4/3`)

- **All photos**: Display full-bleed width and height (cropped to fill screen), regardless of photo orientation

### Portrait Screen (`height / width ≥ 4/3`)

1. **Portrait photos**: Display full-bleed (cropped to fill screen)
2. **Square photos**: Display full-bleed (cropped to fill screen)
3. **Landscape photos**:
   - If multiple landscape photos exist: Display 2 photos stacked vertically, each taking full width and half the height
   - If only one landscape photo exists: Display centered with top/bottom margins so the full photo is visible (no cropping)

## Composition System

The slideshow operates on "compositions" rather than individual photos:

- **Single Photo Composition**: Contains one photo with either `full-bleed` or `centered` display mode
- **Pair Photo Composition**: Contains two photos with either `side-by-side` or `stacked` display mode

Compositions are dynamically generated whenever:
- Photos are loaded
- Screen orientation changes (viewport resize/rotation)
- The photo collection is updated

## Display Modes

- **Full-bleed**: Photo fills entire screen, cropped using `object-fit: cover` to maintain aspect ratio
- **Centered**: Photo displayed with margins (left/right for portrait screen, top/bottom for landscape screen) so the entire photo is visible using `object-fit: contain`
- **Side-by-side**: Two photos displayed horizontally, each occupying 50% width and 100% height
- **Stacked**: Two photos displayed vertically, each occupying 100% width and 50% height

## Technical Implementation Notes

- Screen orientation detection occurs on component mount and on window resize events
- Photo orientation is computed client-side from stored width/height dimensions
- Compositions are recalculated whenever screen orientation or photo collection changes
- The slideshow navigates through compositions, not individual photos
- Photo pairing for side-by-side/stacked displays processes photos sequentially (photos 1-2, 3-4, etc.)
