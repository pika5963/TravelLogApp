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
});