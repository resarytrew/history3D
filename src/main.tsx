import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MuseumApp } from './app/MuseumApp'
import './styles/tokens.css'
import './styles/global.css'
import './styles/museum.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element was not found')

createRoot(root).render(
  <StrictMode>
    <MuseumApp />
  </StrictMode>,
)

