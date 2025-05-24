import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 3000,
        open: true
    },
    build: {
        target: 'esnext',
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true,
        rollupOptions: {
            input: {
                main: 'index.html'
            },
            output: {
                manualChunks: {
                    vendor: ['d3', 'plotly.js-dist']
                }
            }
        }
    },
    worker: {
        format: 'es',
        plugins: []
    },
    optimizeDeps: {
        include: ['d3', 'plotly.js-dist']
    }
}); 