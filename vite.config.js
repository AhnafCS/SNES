import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/*
  vite.config.js
  - Configures Vite to use the official React plugin which enables
    fast refresh and JSX transformation.
  - Exporting via defineConfig provides editor/type hints and clearer structure.
*/
export default defineConfig({
  plugins: [react()],
  // You can add server, build, resolve aliases, and other options here.
});



