import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        // Shared chunks keep fixed names (the SEO templates in public/ preload
        // them); page chunks get a hash so a new deploy never mixes old and new code.
        chunkFileNames: (chunk) =>
          ['vendor', 'router', 'ui'].includes(chunk.name) ? 'assets/[name].js' : 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
    // Use esbuild minifier (default, faster than terser)
    minify: 'esbuild',
  },
  // Enable HTTP/2 and compression
  preview: {
    headers: {
      'Cache-Control': 'public, max-age=31536000',
    },
  },
}));
