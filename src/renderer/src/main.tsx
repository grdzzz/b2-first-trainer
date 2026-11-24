import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter/wght.css'
import '@fontsource-variable/newsreader/opsz.css'
import './styles/tokens.css'
import './styles/app.css'
import { App } from './App'

// Tema de la última vez, antes de cargar los ajustes: el skeleton de arranque ya sale con los colores correctos.
try {
  const theme = localStorage.getItem('b2ft.theme')
  if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme
} catch {
  /* sin almacenamiento local */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
