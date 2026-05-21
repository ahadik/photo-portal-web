# Developer Resources

This document provides technical documentation and development guidelines for the Photo Portal Web application.

## Table of Contents

- [12-Column Grid System](#12-column-grid-system)
- [Styling Guidelines](#styling-guidelines)
- [Component Patterns](#component-patterns)

---

## 12-Column Grid System

The Photo Portal Web application uses a mobile-first 12-column CSS Grid system for responsive layouts. This system enables flexible layout rearrangement across different screen sizes and provides consistent spacing throughout the Admin app.

### Overview

The grid system is implemented in `src/styles/grid.css` and is automatically imported globally via `src/index.css`. It follows industry-standard responsive design practices:

- **Mobile-first approach**: Design for smallest screens first, enhance for larger devices
- **12-column grid**: Highly divisible number allowing flexible layouts (1, 2, 3, 4, 6 column arrangements)
- **CSS Grid**: Modern, native CSS solution (no dependencies)
- **Responsive breakpoints**: Mobile (< 768px), Tablet (≥ 768px), Desktop (≥ 992px)

### Breakpoints

| Breakpoint | Screen Size | Description |
|------------|-------------|-------------|
| Mobile | < 768px | Default (smallest screens) |
| Tablet | ≥ 768px | Medium screens |
| Desktop | ≥ 992px | Large screens |

### Grid Container

Use the `.grid-container` class to create a 12-column grid:

```tsx
<div className="grid-container">
  {/* Grid items go here */}
</div>
```

**Properties:**
- Creates a 12-column grid using `grid-template-columns: repeat(12, 1fr)`
- Responsive gaps: 16px (mobile), 20px (tablet), 24px (desktop)
- Full width by default

### Column Span Utilities

Control how many columns an element spans at each breakpoint using utility classes.

#### Class Naming Pattern

`.col-{breakpoint}-{span}`

Where:
- `{breakpoint}` = `mobile`, `tablet`, or `desktop`
- `{span}` = 1 through 12

#### Available Classes

**Mobile (applies to all screen sizes by default):**
- `.col-mobile-1` through `.col-mobile-12`

**Tablet (applies at ≥768px):**
- `.col-tablet-1` through `.col-tablet-12`

**Desktop (applies at ≥992px):**
- `.col-desktop-1` through `.col-desktop-12`

**Full Width Utility:**
- `.col-full` - Spans all 12 columns (equivalent to `.col-mobile-12`)

### Usage Examples

#### Basic Two-Column Layout

Stack on mobile, side-by-side on tablet and desktop:

```tsx
<div className="grid-container">
  <div className="col-mobile-12 col-tablet-6 col-desktop-6">
    <h2>Left Column</h2>
    <p>Content here</p>
  </div>
  <div className="col-mobile-12 col-tablet-6 col-desktop-6">
    <h2>Right Column</h2>
    <p>Content here</p>
  </div>
</div>
```

**Result:**
- Mobile: Both columns stack vertically (full width each)
- Tablet: Side by side (6 columns each)
- Desktop: Side by side (6 columns each)

#### Three-Column Layout

```tsx
<div className="grid-container">
  <div className="col-mobile-12 col-tablet-4 col-desktop-4">
    <h3>Column 1</h3>
  </div>
  <div className="col-mobile-12 col-tablet-4 col-desktop-4">
    <h3>Column 2</h3>
  </div>
  <div className="col-mobile-12 col-tablet-4 col-desktop-4">
    <h3>Column 3</h3>
  </div>
</div>
```

**Result:**
- Mobile: All three stack vertically (full width each)
- Tablet: Three columns side by side (4 columns each)
- Desktop: Three columns side by side (4 columns each)

#### Asymmetric Layout

```tsx
<div className="grid-container">
  <div className="col-mobile-12 col-tablet-8 col-desktop-8">
    <h2>Main Content</h2>
    <p>Wider column for main content</p>
  </div>
  <div className="col-mobile-12 col-tablet-4 col-desktop-4">
    <h3>Sidebar</h3>
    <p>Narrower column for sidebar</p>
  </div>
</div>
```

**Result:**
- Mobile: Both stack vertically (full width each)
- Tablet: Main content 8 columns, sidebar 4 columns
- Desktop: Main content 8 columns, sidebar 4 columns

#### Mixed Column Sizes

```tsx
<div className="grid-container">
  <div className="col-mobile-12 col-tablet-6 col-desktop-3">
    <p>Quarter width on desktop</p>
  </div>
  <div className="col-mobile-12 col-tablet-6 col-desktop-6">
    <p>Half width on desktop</p>
  </div>
  <div className="col-mobile-12 col-tablet-12 col-desktop-3">
    <p>Quarter width on desktop</p>
  </div>
</div>
```

### Container Classes

#### `.container`

A simple container class for non-grid layouts. Provides:
- Max width: 1200px
- Centered with auto margins
- Horizontal padding: 2rem

```tsx
<div className="container">
  <h1>Page Title</h1>
  <p>Content that doesn't need grid layout</p>
</div>
```

#### `.grid-container--max-width`

Adds max-width constraint to a grid container:

```tsx
<div className="grid-container grid-container--max-width">
  {/* Grid items */}
</div>
```

### Gap Sizes

The grid system uses responsive gaps that increase with screen size:

| Breakpoint | Gap Size |
|------------|----------|
| Mobile | 16px (1rem) |
| Tablet | 20px (1.25rem) |
| Desktop | 24px (1.5rem) |

Gaps are defined as CSS custom properties and can be customized in `src/styles/grid.css`:

```css
:root {
  --grid-gap-mobile: 1rem;    /* 16px */
  --grid-gap-tablet: 1.25rem; /* 20px */
  --grid-gap-desktop: 1.5rem; /* 24px */
}
```

### Best Practices

1. **Always specify mobile classes first**: Mobile classes apply by default, so always include them even if you want full width on mobile:
   ```tsx
   <div className="col-mobile-12 col-tablet-6 col-desktop-4">
   ```

2. **Use semantic HTML**: Wrap grid containers in semantic elements (`<main>`, `<section>`, `<article>`, etc.) when appropriate.

3. **Nested grids**: You can nest grid containers for complex layouts:
   ```tsx
   <div className="grid-container">
     <div className="col-mobile-12 col-tablet-6">
       <div className="grid-container">
         <div className="col-mobile-6">Nested item 1</div>
         <div className="col-mobile-6">Nested item 2</div>
       </div>
     </div>
   </div>
   ```

4. **Combine with component CSS**: Use the grid system alongside component-specific CSS files for styling:
   ```tsx
   <div className="grid-container my-component">
     <div className="col-mobile-12 col-tablet-6 my-component__item">
   ```

5. **Test responsive behavior**: Always test your layouts at different screen sizes to ensure proper rearrangement.

### Common Layout Patterns

#### Dashboard Layout (Current Implementation)

```tsx
<div className="grid-container">
  <div className="col-mobile-12 col-tablet-6 col-desktop-6">
    <h2>Upload Photos</h2>
    <PhotoUploader />
  </div>
  <div className="col-mobile-12 col-tablet-6 col-desktop-6">
    <h2>Send Message</h2>
    <MessageComposer />
  </div>
</div>
```

#### Card Grid

```tsx
<div className="grid-container">
  {items.map(item => (
    <div key={item.id} className="col-mobile-12 col-tablet-6 col-desktop-4">
      <Card item={item} />
    </div>
  ))}
</div>
```

#### Form Layout

```tsx
<div className="grid-container">
  <div className="col-mobile-12 col-tablet-8 col-desktop-6">
    <form>
      {/* Form fields */}
    </form>
  </div>
</div>
```

### Troubleshooting

**Items not aligning properly:**
- Ensure parent has `.grid-container` class
- Check that column spans add up to 12 (or less) per row
- Verify you're using the correct breakpoint classes

**Gaps too large or small:**
- Customize CSS custom properties in `src/styles/grid.css`
- Override gap on specific containers: `.grid-container { gap: 1rem; }`

**Layout not responsive:**
- Ensure you've included mobile classes (they apply by default)
- Check that tablet/desktop classes are correctly applied
- Verify viewport meta tag is present in `index.html`

---

## Styling Guidelines

### CSS File Organization

The project follows a component-based CSS pattern:

- Each component has its own CSS file named the same as the component
- CSS files are imported in the component's TSX file
- Global styles are in `src/styles/` directory
- Never use inline styling in React components

**Example:**
```
components/
  admin/
    Dashboard/
      Dashboard.tsx
      Dashboard.css  ← Component-specific styles
```

### Global Styles

Global styles are located in `src/styles/`:

- `typography.css` - Typography and text styles
- `button.css` - Button component styles
- `input.css` - Form input styles
- `grid.css` - Grid system (see above)

These are imported in `src/index.css` and available globally.

### CSS Naming Convention

Use BEM (Block Element Modifier) naming convention:

```css
.block { }
.block__element { }
.block--modifier { }
.block__element--modifier { }
```

**Example:**
```css
.dashboard { }
.dashboard__header { }
.dashboard__content { }
.dashboard__header--collapsed { }
```

---

## Component Patterns

### Component Structure

Components should follow this structure:

```tsx
import './ComponentName.css';

function ComponentName() {
  return (
    <div className="component-name">
      {/* Component content */}
    </div>
  );
}

export default ComponentName;
```

### Using the Grid System in Components

When creating new components that need responsive layouts:

1. Wrap content in `.grid-container` if using grid
2. Apply column span utilities to child elements
3. Use component-specific CSS for additional styling

**Example:**
```tsx
import './PhotoGallery.css';

function PhotoGallery({ photos }) {
  return (
    <div className="photo-gallery">
      <div className="grid-container">
        {photos.map(photo => (
          <div 
            key={photo.id} 
            className="col-mobile-12 col-tablet-6 col-desktop-4 photo-gallery__item"
          >
            <img src={photo.url} alt={photo.title} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Additional Resources

- [Product Requirements](./product_requirements.md) - Complete product specification and architecture
- [README.md](../README.md) - Setup and deployment instructions

