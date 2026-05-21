import { useState, useEffect } from 'react'
import { config } from '~/config';

import './VirtualOverlay.css';
import classNames from 'classnames';

export type VirtualButtonEvent = 
  | { type: 'MAP_TOGGLE'; value: 'ON' | 'OFF' }
  | { type: 'METADATA_TOGGLE'; value: 'ON' | 'OFF' }
  | { type: 'SELECT_BUTTON' }
  | { type: 'ZOOM_DIAL'; value: number }

interface VirtualOverlayProps {
  onEvent: (event: VirtualButtonEvent) => void
  onClose: () => void
  hasNewMessage?: boolean // New message waiting (glowing state)
  showMetadata?: boolean
  mapViewEnabled?: boolean
  zoomLevel?: number // Current zoom level (1-11)
  onZoomChange?: (zoomLevel: number) => void // Callback for zoom changes
  serverConnected?: boolean // Whether local server is connected (disables zoom slider)
}

/**
 * VirtualOverlay provides simulated hardware controls for testing
 * when GPIO hardware is not available. Displays as a thin chrome bar at the bottom.
 */
export default function VirtualOverlay({ onEvent, onClose, hasNewMessage = false, showMetadata = false, mapViewEnabled = false, zoomLevel = 2, onZoomChange, serverConnected = false }: VirtualOverlayProps) {
  const [mapToggleState, setMapToggleState] = useState<'ON' | 'OFF'>(mapViewEnabled ? 'ON' : 'OFF')
  const [metadataToggleState, setMetadataToggleState] = useState<'ON' | 'OFF'>(showMetadata ? 'ON' : 'OFF')
  const [currentZoom, setCurrentZoom] = useState<number>(zoomLevel)

  // Sync metadata toggle state with prop
  useEffect(() => {
    setMetadataToggleState(showMetadata ? 'ON' : 'OFF')
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

  const handleMapToggle = () => {
    const newState = mapToggleState === 'ON' ? 'OFF' : 'ON'
    setMapToggleState(newState)
    onEvent({ type: 'MAP_TOGGLE', value: newState })
  }

  const handleMetadataToggle = () => {
    const newState = metadataToggleState === 'ON' ? 'OFF' : 'ON'
    setMetadataToggleState(newState)
    onEvent({ type: 'METADATA_TOGGLE', value: newState })
  }

  const handleSelectClick = () => {
    onEvent({ type: 'SELECT_BUTTON' })
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
    className='virtual-overlay'
    >
      {/* Message Button */}
      <button
        onClick={handleSelectClick}
        className={classNames({ 'button--glow': hasNewMessage })}
      >
        {mapToggleState === 'ON' ? '📍 Set Filter' : '💬 Message'}
      </button>

      {/* Map Toggle */}
      <div className='virtual-overlay__button'>
        <p>🗺️ Map</p>
        <button
          onClick={handleMapToggle}
          className={classNames({ 'button--green': mapToggleState === 'ON' })}
        >
          {mapToggleState}
        </button>
      </div>

      {/* Metadata Toggle */}
      <div className='virtual-overlay__button'>
        <p>📋 Meta</p>
        <button
          onClick={handleMetadataToggle}
          className={classNames({ 'button--blue': metadataToggleState === 'ON' })}
        >
          {metadataToggleState}
        </button>
      </div>

      {/* Zoom Slider - only visible when map view is enabled AND server is NOT connected */}
      {mapViewEnabled && !serverConnected && (
        <div className='virtual-overlay__zoom'>
          <p>🔍 Zoom</p>
          <input
            type="range"
            min="1"
            max={config.maxZoomLevel}
            step="0.1"
            value={currentZoom}
            onChange={handleZoomChange}
          />
          <p>
            {currentZoom.toFixed(1)}
          </p>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className='virtual-overlay__close-button'
      >
        ✕
      </button>
    </div>
  )
}
