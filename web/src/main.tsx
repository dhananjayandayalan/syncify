import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { App } from './App';
import './styles/global.css';

window.addEventListener('auth:logout', () => {
  window.location.href = '/login';
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <Provider store={store}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </BrowserRouter>
      </Provider>
    </ToastProvider>
  </StrictMode>,
);
