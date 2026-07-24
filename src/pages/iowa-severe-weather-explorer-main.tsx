import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { IowaSevereWeatherExplorerPage } from './IowaSevereWeatherExplorerPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IowaSevereWeatherExplorerPage />
  </StrictMode>,
)
