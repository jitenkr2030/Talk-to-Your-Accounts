import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/main.css'
import { VoiceProvider } from './components/Voice/VoiceContext.jsx'
import VoiceWidget from './components/Voice/VoiceWidget.jsx'
import { dataSyncManager } from './services/dataSyncManager'

// Initialize data sync manager for offline capabilities
dataSyncManager.init();

// Register Service Worker for PWA and offline capabilities
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Direct render without ClientOnly wrapper to prevent hydration issues
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <VoiceProvider>
      <App />
      <VoiceWidget position="bottom-right" compact={false} />
    </VoiceProvider>
  </React.StrictMode>
)
