import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Auto-register service worker with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New version available! Update now?')) updateSW(true)
  },
  onOfflineReady() {
    console.log('[PWA] App ready to work offline')
  },
})

// Auto PWA install prompt — fires when browser decides app is installable
let deferredPrompt = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  // Auto-trigger install after 2s (no user click needed)
  setTimeout(async () => {
    if (!deferredPrompt) return
    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log('[PWA] Install outcome:', outcome)
    } catch {}
    deferredPrompt = null
  }, 2000)
})

window.addEventListener('appinstalled', () => {
  console.log('[PWA] App installed successfully!')
  deferredPrompt = null
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
