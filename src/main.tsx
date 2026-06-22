import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Ensure RTL for Arabic UI
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('dir', 'rtl');
  document.documentElement.setAttribute('lang', 'ar');
}

createRoot(document.getElementById("root")!).render(<App />);
