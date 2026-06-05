import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['webNavigation', 'tabs'],
  },
  webExt: {
    // Disable the auto-browser runner so WXT doesn't try to launch a separate browser window.
    // This prevents ECONNRESET socket conflicts with your already open Brave window.
    disabled: true,
  },
});