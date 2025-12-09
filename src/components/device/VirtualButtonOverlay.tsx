import { useState, useEffect } from 'react'
import { config } from '../../config';

export type VirtualButtonEvent = 
  | { type: 'LIKE_BUTTON' }
  | { type: 'MAP_TOGGLE'; value: 'ON' | 'OFF' }
  | { type: 'METADATA_TOGGLE' }
  | { type: 'MESSAGE_BUTTON' }
  | { type: 'ZOOM_DIAL'; value: number }

interface VirtualButtonOverlayProps {
  onEvent: (event: VirtualButtonEvent) => void
  onClose: () => void
  hasUnreadMessages?: boolean
  showMetadata?: boolean
  mapViewEnabled?: boolean
  zoomLevel?: number // Current zoom level (1-11)
  onZoomChange?: (zoomLevel: number) => void // Callback for zoom changes
}

/**
 * VirtualButtonOverlay provides simulated hardware controls for testing
 * when GPIO hardware is not available. Displays as a thin chrome bar at the bottom.
 */
export default function VirtualButtonOverlay({ onEvent, onClose, hasUnreadMessages = false, showMetadata = false, mapViewEnabled = false, zoomLevel = 2, onZoomChange }: VirtualButtonOverlayProps) {
  const [mapToggleState, setMapToggleState] = useState<'ON' | 'OFF'>(mapViewEnabled ? 'ON' : 'OFF')
  const [metadataToggleState, setMetadataToggleState] = useState(showMetadata)
  const [currentZoom, setCurrentZoom] = useState<number>(zoomLevel)

  // Sync metadata toggle state with prop
  useEffect(() => {
    setMetadataToggleState(showMetadata)
  }, [showMetadata])

  // Sync map toggle state with prop
  useEffect(() => {
    setMapToggleState(mapViewEnabled ? 'ON' : 'OFF')
  }, [mapViewEnabled])

  // Sync zoom level with prop
  useEffect(() => {
    setCurrentZoom(zoomLevel)
  }, [zoomLevel])

  // Close overlay when Escape is pressed
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [onClose])

  const handleLikeClick = () => {
    onEvent({ type: 'LIKE_BUTTON' })
  }

  const handleMapToggle = () => {
    const newState = mapToggleState === 'ON' ? 'OFF' : 'ON'
    setMapToggleState(newState)
    onEvent({ type: 'MAP_TOGGLE', value: newState })
  }

  const handleMetadataToggle = () => {
    const newState = !metadataToggleState
    setMetadataToggleState(newState)
    onEvent({ type: 'METADATA_TOGGLE' })
  }

  const handleMessageClick = () => {
    onEvent({ type: 'MESSAGE_BUTTON' })
  }

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value)
    setCurrentZoom(newZoom)
    onEvent({ type: 'ZOOM_DIAL', value: newZoom })
    if (onZoomChange) {
      onZoomChange(newZoom)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 10000,
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Like Button */}
      <button
        onClick={handleLikeClick}
        style={{
          background: 'rgba(233, 30, 99, 0.2)',
          border: '1px solid rgba(233, 30, 99, 0.5)',
          color: '#fff',
          borderRadius: '8px',
          padding: '0.5rem 1rem',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '500',
          minWidth: '80px',
          transition: 'all 0.2s',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'rgba(233, 30, 99, 0.3)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(233, 30, 99, 0.2)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        ❤️ Like
      </button>

      {/* Message Button */}
      <button
        onClick={handleMessageClick}
        disabled={!hasUnreadMessages}
        style={{
          background: hasUnreadMessages ? 'rgba(33, 150, 243, 0.2)' : 'rgba(85, 85, 85, 0.2)',
          border: hasUnreadMessages ? '1px solid rgba(33, 150, 243, 0.5)' : '1px solid rgba(85, 85, 85, 0.3)',
          color: hasUnreadMessages ? '#fff' : 'rgba(255, 255, 255, 0.4)',
          borderRadius: '8px',
          padding: '0.5rem 1rem',
          cursor: hasUnreadMessages ? 'pointer' : 'not-allowed',
          fontSize: '0.875rem',
          fontWeight: '500',
          minWidth: '80px',
          transition: 'all 0.2s',
          opacity: hasUnreadMessages ? 1 : 0.5,
        }}
        onMouseOver={(e) => {
          if (hasUnreadMessages) {
            e.currentTarget.style.background = 'rgba(33, 150, 243, 0.3)'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }
        }}
        onMouseOut={(e) => {
          if (hasUnreadMessages) {
            e.currentTarget.style.background = 'rgba(33, 150, 243, 0.2)'
            e.currentTarget.style.transform = 'translateY(0)'
          }
        }}
      >
        💬 Message
      </button>

      {/* Map Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ color: '#fff', fontSize: '0.75rem', opacity: 0.7 }}>🗺️ Map</span>
        <button
          onClick={handleMapToggle}
          style={{
            background: mapToggleState === 'ON' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(85, 85, 85, 0.3)',
            border: `1px solid ${mapToggleState === 'ON' ? 'rgba(76, 175, 80, 0.6)' : 'rgba(85, 85, 85, 0.6)'}`,
            color: '#fff',
            borderRadius: '12px',
            padding: '0.375rem 0.75rem',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: '600',
            minWidth: '50px',
            transition: 'all 0.2s',
          }}
        >
          {mapToggleState}
        </button>
      </div>

      {/* Metadata Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ color: '#fff', fontSize: '0.75rem', opacity: 0.7 }}>📋 Meta</span>
        <button
          onClick={handleMetadataToggle}
          style={{
            background: metadataToggleState ? 'rgba(76, 175, 80, 0.3)' : 'rgba(85, 85, 85, 0.3)',
            border: `1px solid ${metadataToggleState ? 'rgba(76, 175, 80, 0.6)' : 'rgba(85, 85, 85, 0.6)'}`,
            color: '#fff',
            borderRadius: '12px',
            padding: '0.375rem 0.75rem',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: '600',
            minWidth: '50px',
            transition: 'all 0.2s',
          }}
        >
          {metadataToggleState ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Zoom Slider - only visible when map view is enabled */}
      {mapViewEnabled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '200px' }}>
          <span style={{ color: '#fff', fontSize: '0.75rem', opacity: 0.7, whiteSpace: 'nowrap' }}>🔍 Zoom</span>
          <input
            type="range"
            min="1"
            max={config.maxZoomLevel}
            step="0.1"
            value={currentZoom}
            onChange={handleZoomChange}
            style={{
              flex: 1,
              height: '6px',
              borderRadius: '3px',
              background: 'rgba(255, 255, 255, 0.2)',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          <span style={{ color: '#fff', fontSize: '0.75rem', opacity: 0.7, minWidth: '30px', textAlign: 'right' }}>
            {currentZoom.toFixed(1)}
          </span>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#fff',
          borderRadius: '8px',
          padding: '0.5rem 0.75rem',
          cursor: 'pointer',
          fontSize: '0.75rem',
          opacity: 0.7,
          transition: 'all 0.2s',
          marginLeft: 'auto',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
          e.currentTarget.style.opacity = '1'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.opacity = '0.7'
        }}
      >
        ✕
      </button>
    </div>
  )
}
