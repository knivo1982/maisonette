import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register service worker for PWA
serviceWorkerRegistration.register({
  onSuccess: () => console.log('PWA: Content cached for offline use.'),
  onUpdate: () => console.log('PWA: New content available, refresh to update.')
});
