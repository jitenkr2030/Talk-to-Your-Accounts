import React, { useState, useEffect } from 'react'
import { useNetwork } from '../hooks/useNetwork'

/**
 * NetworkStatus component that displays online/offline status
 * Shows visual indicators and handles automatic sync when coming back online
 */
function NetworkStatus() {
  const { isOnline, wasOffline } = useNetwork()
  const [showNotification, setShowNotification] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Show notification when going offline
  useEffect(() => {
    if (!isOnline) {
      setShowNotification(true)
    }
  }, [isOnline])

  // Handle sync process when coming back online
  useEffect(() => {
    const handleSync = async () => {
      if (isOnline && wasOffline) {
        setIsSyncing(true)
        // Dispatch custom event to trigger data sync
        window.dispatchEvent(new CustomEvent('app:syncData'))
        
        // Simulate sync delay for user feedback
        setTimeout(() => {
          setIsSyncing(false)
          setShowNotification(false)
        }, 2000)
      }
    }

    handleSync()
  }, [isOnline, wasOffline])

  // Don't render anything if online and no pending notification
  if (isOnline && !showNotification && !wasOffline) {
    return null
  }

  return (
    <div className="network-status-container">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="network-banner offline">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
            <line x1="12" y1="20" x2="12.01" y2="20"></line>
          </svg>
          <span>You're offline. Changes will sync when you reconnect.</span>
        </div>
      )}

      {/* Syncing Banner */}
      {isSyncing && (
        <div className="network-banner syncing">
          <svg 
            className="spin"
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Syncing your data...</span>
        </div>
      )}

      {/* Back Online Banner */}
      {isOnline && wasOffline && !isSyncing && (
        <div className="network-banner online">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>You're back online!</span>
        </div>
      )}

      <style>{`
        .network-status-container {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .network-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .network-banner.offline {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
        }

        .network-banner.syncing {
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #93c5fd;
        }

        .network-banner.online {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #6ee7b7;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}

export default NetworkStatus
