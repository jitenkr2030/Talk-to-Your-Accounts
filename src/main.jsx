import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/main.css'
import { VoiceProvider } from './components/Voice/VoiceContext.jsx'
import VoiceWidget from './components/Voice/VoiceWidget.jsx'

// Simple loading component
const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
    <div className="text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Talk to Your Accounts</h1>
      <p className="text-slate-400">Checking system...</p>
    </div>
  </div>
)

// Client-side only wrapper
function ClientOnly({ children }) {
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Wait for window to be fully loaded
    const checkReady = () => {
      try {
        if (window.api && window.api.ping) {
          window.api.ping().then(() => {
            setMounted(true)
          }).catch(() => {
            // Still set mounted even if ping fails, app can handle errors
            setMounted(true)
          })
        } else {
          // No ping API, set mounted after a delay
          setTimeout(() => setMounted(true), 500)
        }
      } catch (err) {
        console.warn('ClientOnly check failed:', err)
        setMounted(true)
      }
    }
    
    if (document.readyState === 'complete') {
      checkReady()
    } else {
      window.addEventListener('load', checkReady)
      return () => window.removeEventListener('load', checkReady)
    }
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Talk to Your Accounts</h1>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!mounted) {
    return <LoadingScreen />
  }

  return children
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ClientOnly>
    <VoiceProvider>
      <App />
      <VoiceWidget position="bottom-right" compact={false} />
    </VoiceProvider>
  </ClientOnly>
)
