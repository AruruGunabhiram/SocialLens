import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './app/App'
import { Providers } from './app/providers'
import { Toaster } from './components/ui/sonner'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Providers>
        <App />
      </Providers>
      <Toaster />
    </BrowserRouter>
  </React.StrictMode>
)
