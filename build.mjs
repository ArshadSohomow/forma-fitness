// Minimal, dependency-light build for FORMA.
// `node build.mjs`          → production build into dist/
// `node build.mjs --serve`  → dev server on http://localhost:5173 with rebuild on change
import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const serve = process.argv.includes('--serve');
const outdir = 'dist';
const version = Date.now().toString(36);

rmSync(outdir, { recursive: true, force: true });
mkdirSync(`${outdir}/assets`, { recursive: true });
if (existsSync('public')) cpSync('public', outdir, { recursive: true });

// Stamp the service worker cache name so each deploy refreshes the offline cache.
const swPath = `${outdir}/sw.js`;
if (existsSync(swPath)) writeFileSync(swPath, readFileSync(swPath, 'utf8').replace('__VERSION__', version));

const html = readFileSync('index.html', 'utf8').replaceAll('__VERSION__', version);
writeFileSync(`${outdir}/index.html`, html);

const options = {
  entryPoints: { app: 'src/main.tsx' },
  bundle: true,
  outdir: `${outdir}/assets`,
  format: 'esm',
  target: ['es2021', 'chrome100', 'safari15', 'firefox100'],
  jsx: 'automatic',
  minify: !serve,
  sourcemap: serve ? 'inline' : false,
  loader: { '.css': 'css' },
  define: { 'process.env.NODE_ENV': serve ? '"development"' : '"production"' },
  logLevel: 'info',
};

if (serve) {
  const ctx = await esbuild.context(options);
  if (!process.argv.includes('--no-watch')) await ctx.watch();
  const { port } = await ctx.serve({ servedir: outdir, port: 5173 });
  console.log(`FORMA running at http://localhost:${port}`);
} else {
  await esbuild.build(options);
  console.log('Built to dist/');
}
