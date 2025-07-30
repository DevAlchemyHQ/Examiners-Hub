import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from './components/ThemeProvider.tsx'
import './index.css'

// Version check mechanism
const APP_VERSION = '1.0.1';
const VERSION_KEY = 'app-version';

// Check if app needs to be updated
const checkForUpdates = () => {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  
  if (storedVersion && storedVersion !== APP_VERSION) {
    // Show update message
    const updateMessage = document.createElement('div');
    updateMessage.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #3b82f6;
      color: white;
      padding: 12px;
      text-align: center;
      z-index: 9999;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    updateMessage.innerHTML = `
      <span>A new version is available. </span>
      <button onclick="window.location.reload()" style="
        background: white;
        color: #3b82f6;
        border: none;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        margin-left: 8px;
      ">Refresh to update</button>
    `;
    document.body.appendChild(updateMessage);
  }
  
  // Store current version
  localStorage.setItem(VERSION_KEY, APP_VERSION);
};

// Run version check
checkForUpdates();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
