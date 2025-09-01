import { build } from 'esbuild';

const baseOptions = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    outfile: 'javascript/weight_helper.js',
    target: 'es2022',
    format: 'iife',
    platform: 'browser',
};

build({
    ...baseOptions,
    minify: process.argv.includes('--minify'),
    sourcemap: process.argv.includes('--sourcemap'),
}).catch(() => process.exit(1));
