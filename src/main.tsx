import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { PwaStatus } from './components/PwaStatus';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter><PwaStatus /><PwaInstallPrompt /><App /></BrowserRouter>
  </React.StrictMode>,
);
