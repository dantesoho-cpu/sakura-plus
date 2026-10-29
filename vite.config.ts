import { defineConfig } from 'vite';
export default defineConfig({ base: process.env.BASE ?? '/sakura-plus/', preview: { allowedHosts: true }, server: { allowedHosts: true } });
