import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { Provider as RollbarProvider, ErrorBoundary } from '@rollbar/react'
import './index.css'
import App from './App.jsx'
import store from './store'
import './i18n'
import rollbar from './rollbar'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {rollbar
      ? (
          <RollbarProvider instance={rollbar}>
            <ErrorBoundary>
              <Provider store={store}>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </Provider>
            </ErrorBoundary>
          </RollbarProvider>
        )
      : (
          <Provider store={store}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </Provider>
        )}
  </StrictMode>,
)
