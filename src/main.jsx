import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import "@melloware/coloris/dist/coloris.css";
import { coloris, init } from "@melloware/coloris";
init();
coloris({el: "#coloris"});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
