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

// Enable transitions after React has rendered (prevents movement during refresh)
// Wait for next frame to ensure DOM is ready
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.documentElement.classList.add('loaded');
  });
});
