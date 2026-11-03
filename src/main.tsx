import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { captureInstallPrompt } from './data/install';
import { requestPersistentStorage } from './data/storage';
import './styles/global.css';

void requestPersistentStorage();
captureInstallPrompt();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
