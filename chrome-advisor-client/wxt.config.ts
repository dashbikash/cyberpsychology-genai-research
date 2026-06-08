import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],

  // Connect the Tailwind CSS v4+ compiler to WXT's internal Vite pipeline
  vite: () => ({
    plugins: [tailwindcss()],
  }),

  manifest: {
    permissions: ['webNavigation', 'tabs'],
  },

  runner: {
    // Disable the auto-browser runner so WXT doesn't try to launch a separate browser window.
    // This prevents ECONNRESET socket conflicts with your already open Brave window.
    disabled: true,
  },
});