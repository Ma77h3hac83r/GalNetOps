import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const projectRoot = path.resolve(__dirname);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [react()],
    root: 'src/renderer',
    base: './',
    publicDir: '../../resources',
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
    },
    build: {
      outDir: '../../dist/renderer',
      emptyOutDir: true,
      sourcemap: isProduction ? 'hidden' : true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Single vendor chunk for all deps to avoid duplicate React instances
              // (split chunks caused "Cannot set properties of undefined (setting 'Children')").
              return 'vendor';
            }
          },
        },
        onwarn(warning, warn) {
          // In production, treat critical warnings as errors; ignore third-party/dep warnings (e.g. CIRCULAR_DEPENDENCY in node_modules)
          const criticalCodes = new Set(['UNUSED_EXTERNAL_IMPORT', 'MISSING_EXPORT', 'MISSING_GLOBAL_NAME', 'EVAL']);
          if (isProduction && warning.code && criticalCodes.has(warning.code)) {
            throw new Error(`Rollup warning treated as error [${warning.code}]: ${warning.message}`);
          }
          warn(warning);
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/renderer'),
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'recharts'],
      force: false,
    },
    server: {
      port: 5173,
      strictPort: true,
      host: 'localhost',
      fs: {
        strict: true,
        allow: [projectRoot, path.join(projectRoot, 'node_modules')],
      },
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
      },
    },
    clearScreen: false,
  };
});
