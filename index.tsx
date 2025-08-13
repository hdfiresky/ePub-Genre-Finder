
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';

/**
 * The main entry point for the React application.
 * It finds the root DOM element and renders the App component into it.
 */
const rootElement = document.getElementById('root');
if (!rootElement) {
  // This error is thrown if the 'root' div is missing from index.html, which is critical for the app to run.
  throw new Error("Could not find root element to mount to");
}

// Create a React root for the main application container.
const root = ReactDOM.createRoot(rootElement);

// Render the main App component within React's StrictMode.
// StrictMode helps identify potential problems in an application by activating additional checks and warnings.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
