import { defineConfig } from 'vite';

export default defineConfig({
  base: '/TravelLogApp/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        register: 'register.html',
        detail: 'detail.html',
      },
    },
  },
  resolve: {
    alias: {
      leaflet: '/node_modules/leaflet/dist/leaflet.js',
    },
  },
});