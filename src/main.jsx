import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

/*
  src/main.jsx
  - Application entry point. Imports global CSS and mounts the React app
    into the `#root` element defined in `index.html`.
*/
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);



