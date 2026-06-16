import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initMonitoring } from './utils/monitoring';

// Monitoreo constante: capturadores globales activos desde el arranque.
initMonitoring();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
