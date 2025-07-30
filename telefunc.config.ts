import type { Config } from 'telefunc';

const config: Config = {
  root: process.cwd(),
  baseDir: 'src/',
  telefuncFilesGlob: '**/*.telefunc.{ts,js}',
  // Configure custom URL path for SvelteKit integration
  telefuncUrl: '/api/telefunc',
  // Configure for ESM compatibility
  outDir: '.telefunc',
  transformImports: {
    // Automatically handle .js extension for telefunc imports
    addExtension: '.js'
  }
};

export default config;
