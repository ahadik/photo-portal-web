import { useEffect, useRef, useState, useCallback } from 'react'

export type GPIOEvent =
  | { type: 'LIKE_BUTTON' }
  | { type: 'MAP_TOGGLE'; value: 'ON' | 'OFF' }
  | { type: 'METADATA_TOGGLE' }
  | { type: 'MESSAGE_BUTTON' }
  | { type: 'ZOOM_DIAL'; value: number }

interface UseGPIOOptions {
  onLikeButton?: () => void
  onMapToggle?: (value: 'ON' | 'OFF') => void
  onMetadataToggle?: () => void
  onMessageButton?: () => void
  onZoomDial?: (zoomLevel: number) => void
  onLedCommand?: (value: 'ON' | 'OFF') => void
}

interface UseGPIOReturn {
  connected: boolean
  virtualMode: boolean
  setLedOn: () => void
  setLedOff: () => void
}

/**
 * useGPIO hook connects to the GPIO WebSocket service and handles GPIO events.
 * Falls back gracefully if WebSocket connection fails (for development/testing).
 */
export function useGPIO(options: UseGPIOOptions = {}): UseGPIOReturn {
  const [connected, setConnected] = useState(false)
  const [virtualMode, setVirtualMode] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 3
  const reconnectDelay = 2000 // 2 seconds

  // Store callbacks in refs to avoid stale closures without reconnecting
  const callbacksRef = useRef(options)
  useEffect(() => {
    callbacksRef.current = options
  }, [options])

  // Send LED command
  const sendLedCommand = useCallback((value: 'ON' | 'OFF') => {
    if (virtualMode) return // Don't try to send commands in virtual mode
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'LED', value }))
      } catch (error) {
        if (!virtualMode) {
          console.error('Failed to send LED command:', error)
        }
      }
    }
  }, [virtualMode])

  const setLedOn = useCallback(() => {
    sendLedCommand('ON')
  }, [sendLedCommand])

  const setLedOff = useCallback(() => {
    sendLedCommand('OFF')
  }, [sendLedCommand])

  // Connect to WebSocket
  useEffect(() => {
    let mounted = true
    const virtualModeRef = { current: false } // Track if we've given up in this attempt cycle
    reconnectAttempts.current = 0 // Reset attempts for new connection attempt

    const connect = () => {
      // Don't attempt if we've already given up in this cycle
      if (virtualModeRef.current) return

      try {
        const ws = new WebSocket('ws://localhost:8765')

        ws.onopen = () => {
          if (mounted) {
            console.log('GPIO WebSocket connected')
            setConnected(true)
            reconnectAttempts.current = 0
            wsRef.current = ws
            // Clear virtual mode on successful connection
            if (virtualModeRef.current) {
              virtualModeRef.current = false
              setVirtualMode(false)
            }
          }
        }

        ws.onmessage = (event) => {
          if (!mounted || virtualModeRef.current) return

          try {
            const data = JSON.parse(event.data as string) as GPIOEvent
            const callbacks = callbacksRef.current

            switch (data.type) {
              case 'LIKE_BUTTON':
                callbacks.onLikeButton?.()
                break
              case 'MAP_TOGGLE':
                callbacks.onMapToggle?.(data.value)
                break
              case 'METADATA_TOGGLE':
                callbacks.onMetadataToggle?.()
                break
              case 'MESSAGE_BUTTON':
                callbacks.onMessageButton?.()
                break
              case 'ZOOM_DIAL':
                callbacks.onZoomDial?.(data.value)
                break
              default:
                if (!virtualModeRef.current) {
                  console.warn('Unknown GPIO event type:', data)
                }
            }
          } catch (error) {
            if (!virtualModeRef.current) {
              console.error('Failed to parse GPIO event:', error)
            }
          }
        }

        ws.onerror = (error) => {
          if (mounted && !virtualModeRef.current) {
            // Only log error if we haven't exceeded max attempts
            if (reconnectAttempts.current < maxReconnectAttempts) {
              console.error('GPIO WebSocket error:', error)
            }
            setConnected(false)
          }
        }

        ws.onclose = (_event) => {
          if (!mounted || virtualModeRef.current) return
          
          setConnected(false)
          wsRef.current = null

          // Attempt to reconnect if we haven't exceeded max attempts
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mounted && !virtualModeRef.current) {
                connect()
              }
            }, reconnectDelay)
          } else {
            // Max attempts reached - switch to virtual mode
            virtualModeRef.current = true
            console.log('GPIO WebSocket connection failed after retries. Switching to Virtual mode.')
            setVirtualMode(true)
          }
        }
      } catch (error) {
        if (!mounted || virtualModeRef.current) return
        
        // Only log error if we haven't exceeded max attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          console.error('Failed to create GPIO WebSocket connection:', error)
        }
        setConnected(false)
        
        // Retry connection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mounted && !virtualModeRef.current) {
              connect()
            }
          }, reconnectDelay)
        } else {
          // Max attempts reached - switch to virtual mode
          virtualModeRef.current = true
          console.log('GPIO WebSocket connection failed after retries. Switching to Virtual mode.')
          setVirtualMode(true)
        }
      }
    }

    connect()

    return () => {
      mounted = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
    // Only run once on mount - reconnect logic is handled internally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    connected,
    virtualMode,
    setLedOn,
    setLedOff,
  }
}
