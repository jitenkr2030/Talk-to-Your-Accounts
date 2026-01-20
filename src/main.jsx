import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/main.css'
import { VoiceProvider } from './components/Voice/VoiceContext.jsx'
import VoiceWidget from './components/Voice/VoiceWidget.jsx'

// Direct render without ClientOnly wrapper to prevent hydration issues
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <VoiceProvider>
      <App />
      <VoiceWidget position="bottom-right" compact={false} />
    </VoiceProvider>
  </React.StrictMode>
)
