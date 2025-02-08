import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const defaultRepositoryName = 'dubbed-crunchyroll';
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const repositoryName = isGitHubActions ? process.env.GITHUB_REPOSITORY?.split('/')[1] : defaultRepositoryName;

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'development' ? '/' : `/${repositoryName}/`,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server : {
    allowedHosts : [
      'localhost'
    ]
  }
}));