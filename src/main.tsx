import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import ModularApp from './ModularApp.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ModularApp />
  </StrictMode>,
);
