import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
    root: 'src',
    server: {
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        }
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true,
    },
    test: {
        environment: 'bun',
    },
})