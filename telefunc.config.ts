import type { Config } from 'telefunc';

const config: Config = {
  root: process.cwd(),
  baseDir: 'src/',
  telefuncFilesGlob: '**/*.telefunc.{ts,js}',
};

export default config;
