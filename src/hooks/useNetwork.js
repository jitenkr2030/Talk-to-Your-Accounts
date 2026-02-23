import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook to track network connectivity status
 * Provides real-time online/offline status and handles reconnection events
 */
export function useNetwork() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)

  // Handle online event
  const handleOnline = useCallback(() => {
    setIsOnline(true)
    if (wasOffline) {
      // Trigger sync when coming back online
      window.dispatchEvent(new CustomEvent('app:syncRequested'))
    }
    setWasOffline(false)
  }, [wasOffline])

  // Handle offline event
  const handleOffline = useCallback(() => {
    setIsOnline(false)
    setWasOffline(true)
  }, [])

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    // Add event listeners for network status changes
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup event listeners on unmount
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  return {
    isOnline,
    wasOffline,
    isOffline: !isOnline
  }
}

export default useNetwork
