import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from './components/ThemeProvider.tsx'
import './index.css'

// Mark HTML as loaded after React mounts to enable transitions
// This prevents icons/elements from moving during refresh
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)

// DON'T add 'loaded' class here - it's too early and causes flicker
// MainApp will add it after data is fully loaded (isInitialized = true)
