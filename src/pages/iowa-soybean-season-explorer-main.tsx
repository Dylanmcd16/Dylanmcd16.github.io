import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { IowaSoybeanSeasonExplorerPage } from './IowaSoybeanSeasonExplorerPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IowaSoybeanSeasonExplorerPage />
  </StrictMode>,
)
