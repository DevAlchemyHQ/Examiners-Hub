import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from './components/ThemeProvider.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
console.log('DEPLOYMENT TRIGGER: Sat Oct 25 21:28:33 BST 2025');
FORCE DEPLOYMENT: Sat Oct 25 22:53:01 BST 2025
