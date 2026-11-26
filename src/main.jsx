import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// i18n must initialise before anything renders (FE-15).
import './i18n/index.js'
import './styles/tokens.css'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './pwa/registerServiceWorker.js'

registerServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
