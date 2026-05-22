import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard framework viewport and test frameworks against third-party cross-origin script errors (e.g., Disqus, Clarity inside sandbox iframes)
if (typeof window !== 'undefined') {
  // 1. Capture and suppress unhandled script runtime errors
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const msgStr = String(message || '');
    const srcStr = String(source || '');
    const isThirdParty = 
      msgStr.includes('Script error') || 
      msgStr.includes('SecurityError') ||
      srcStr.includes('disqus') || 
      srcStr.includes('clarity') ||
      (error && error.stack && (error.stack.includes('disqus') || error.stack.includes('clarity')));

    if (isThirdParty) {
      console.warn('[CORS Shield] Gracefully suppressed third-party script error:', msgStr);
      return true; // Prevents default error propagation and boundary escalation
    }

    if (originalOnError) {
      return originalOnError.apply(this, arguments as any);
    }
    return false;
  };

  // 2. Capture and suppress unhandled promise rejections matching third-party scripts
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event.reason || '');
    const stackStr = event.reason && event.reason.stack ? String(event.reason.stack) : '';
    const isThirdParty = 
      reasonStr.includes('disqus') || 
      reasonStr.includes('clarity') || 
      stackStr.includes('disqus') || 
      stackStr.includes('clarity');

    if (isThirdParty) {
      event.preventDefault();
      event.stopPropagation();
      console.warn('[CORS Shield] Suppressed third-party promise rejection:', reasonStr);
    }
  }, true);

  // 3. Capture errors during event capture phases
  window.addEventListener('error', (event) => {
    const msgStr = String(event.message || '');
    const srcStr = String(event.filename || '');
    const isThirdParty = 
      msgStr.includes('Script error') || 
      msgStr.includes('SecurityError') ||
      srcStr.includes('disqus') || 
      srcStr.includes('clarity');

    if (isThirdParty) {
      event.preventDefault();
      event.stopPropagation();
      console.warn('[CORS Shield] Caught capturable third-party error:', msgStrByFilename(srcStr));
    }
  }, true);
}

function msgStrByFilename(src: string): string {
  return src ? `Script source: ${src}` : 'Cross-origin reference';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

