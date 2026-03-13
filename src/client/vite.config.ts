import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor';
            if (id.includes('zustand') || id.includes('@tanstack') || id.includes('axios')) return 'state';
            if (id.includes('react-hot-toast') || id.includes('recharts')) return 'ui';
            if (id.includes('razorpay')) return 'payment';
          }
          // Split AdminPage into its own chunk (it's ~8000 lines)
          if (id.includes('AdminPage')) return 'admin';
          // Split heavy analytics/SEO pages
          if (id.includes('PricingPage') || id.includes('FeaturesPage') || id.includes('PcosPage') || id.includes('BlogLandingPage')) return 'landing';
        },
      },
    },
  },
});
