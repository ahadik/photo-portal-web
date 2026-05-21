import { useEffect, useRef, useState } from 'react'
import { VirtualButtonEvent } from '../VirtualOverlay/VirtualOverlay'
import './DebugPanel.css'

export type DebugLogEntry = {
  id: string
  timestamp: Date
  direction: 'in' | 'out' | 'local'
  type: string
  data?: unknown
  description: string
}

interface DebugPanelProps {
  isOpen: boolean
  onClose: () => void
  serverConnected: boolean
  virtualButtonEvents?: VirtualButtonEvent[]
  wsMessages?: Array<{ direction: 'in' | 'out'; type: string; data?: unknown }>
  remoteEvents?: Array<{ type: string; data?: unknown }>
}

export default function DebugPanel({
  isOpen,
  onClose,
  serverConnected,
  virtualButtonEvents = [],
  wsMessages = [],
  remoteEvents = [],
}: DebugPanelProps) {
  const [logs, setLogs] = useState<DebugLogEntry[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)
  const logsContainerRef = useRef<HTMLDivElement>(null)
  const eventIdCounter = useRef(0)
  const lastWsMessagesLengthRef = useRef(0)
  const lastVirtualEventsLengthRef = useRef(0)
  const lastRemoteEventsLengthRef = useRef(0)

  // Generate unique ID for log entries
  const generateId = () => {
    return `log-${Date.now()}-${eventIdCounter.current++}`
  }

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    })
  }

  // Add log entry
  const addLog = (direction: 'in' | 'out' | 'local', type: string, data?: unknown, description?: string) => {
    const entry: DebugLogEntry = {
      id: generateId(),
      timestamp: new Date(),
      direction,
      type,
      data,
      description: description || type,
    }
    setLogs((prev) => [...prev, entry])
  }

  // Track WebSocket messages
  useEffect(() => {
    if (!isOpen) return

    const currentLength = wsMessages.length
    const lastLength = lastWsMessagesLengthRef.current
    
    if (currentLength > lastLength) {
      // Process new messages
      for (let i = lastLength; i < currentLength; i++) {
        const msg = wsMessages[i]
        const description = msg.direction === 'in' 
          ? `Received: ${msg.type}`
          : `Sent: ${msg.type}`
        addLog(msg.direction, msg.type, msg.data, description)
      }
      lastWsMessagesLengthRef.current = currentLength
    }
  }, [wsMessages, isOpen])

  // Track virtual button events (simulated when server not connected)
  useEffect(() => {
    if (!isOpen || serverConnected) return

    const currentLength = virtualButtonEvents.length
    const lastLength = lastVirtualEventsLengthRef.current
    
    if (currentLength > lastLength) {
      // Process new events
      for (let i = lastLength; i < currentLength; i++) {
        const event = virtualButtonEvents[i]
        const description = `Virtual Button: ${event.type}${event.value !== undefined ? ` = ${JSON.stringify(event.value)}` : ''}`
        addLog('local', event.type, event.value, description)
      }
      lastVirtualEventsLengthRef.current = currentLength
    }
  }, [virtualButtonEvents, isOpen, serverConnected])

  // Track remote events (new messages, etc.)
  useEffect(() => {
    if (!isOpen) return

    const currentLength = remoteEvents.length
    const lastLength = lastRemoteEventsLengthRef.current
    
    if (currentLength > lastLength) {
      // Process new events
      for (let i = lastLength; i < currentLength; i++) {
        const event = remoteEvents[i]
        const description = `Remote Event: ${event.type}`
        addLog('local', event.type, event.data, description)
      }
      lastRemoteEventsLengthRef.current = currentLength
    }
  }, [remoteEvents, isOpen])

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logsEndRef.current && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
    }
  }, [logs])

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'd' || e.key === 'D') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isOpen, onClose])

  // Reset counters when panel opens (to avoid showing old events)
  useEffect(() => {
    if (isOpen) {
      lastWsMessagesLengthRef.current = wsMessages.length
      lastVirtualEventsLengthRef.current = virtualButtonEvents.length
      lastRemoteEventsLengthRef.current = remoteEvents.length
    } else {
      // Clear logs and reset counters when panel closes
      setLogs([])
      lastWsMessagesLengthRef.current = 0
      lastVirtualEventsLengthRef.current = 0
      lastRemoteEventsLengthRef.current = 0
    }
  }, [isOpen, wsMessages.length, virtualButtonEvents.length, remoteEvents.length])

  if (!isOpen) return null

  return (
    <div className="debug-panel">
      <div className="debug-panel__header">
        <h2 className="debug-panel__title">Debug Log</h2>
        <div className="debug-panel__status">
          <span className={`debug-panel__status-indicator ${serverConnected ? 'debug-panel__status-indicator--connected' : 'debug-panel__status-indicator--disconnected'}`}>
            {serverConnected ? '●' : '○'}
          </span>
          <span className="debug-panel__status-text">
            {serverConnected ? 'Server Connected' : 'Virtual Mode'}
          </span>
        </div>
        <button className="debug-panel__close-button" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="debug-panel__logs" ref={logsContainerRef}>
        {logs.length === 0 ? (
          <div className="debug-panel__empty">
            <p>No events logged yet.</p>
            <p className="debug-panel__hint">
              {serverConnected 
                ? 'Waiting for WebSocket messages...'
                : 'Waiting for virtual button events or remote events...'}
            </p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`debug-panel__log-entry debug-panel__log-entry--${log.direction}`}>
              <span className="debug-panel__log-timestamp">{formatTimestamp(log.timestamp)}</span>
              <span className="debug-panel__log-direction">
                {log.direction === 'in' ? '←' : log.direction === 'out' ? '→' : '•'}
              </span>
              <span className="debug-panel__log-type">{log.type}</span>
              {log.data !== undefined && (
                <span className="debug-panel__log-data">
                  {typeof log.data === 'object' ? JSON.stringify(log.data) : String(log.data)}
                </span>
              )}
              <span className="debug-panel__log-description">{log.description}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  )
}

