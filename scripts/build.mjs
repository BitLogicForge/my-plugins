// Shared esbuild bundler for every extension.
//   node scripts/build.mjs [--watch] [--production] [extensionDir ...]
// With no dirs it builds every folder in extensions/. Each extension bundles
// src/extension.ts -> dist/extension.js (CommonJS, `vscode` left external).
import * as esbuild from 'esbuild';
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const watch = args.includes('--watch');
const production = args.includes('--production');
let dirs = args.filter((a) => !a.startsWith('--')).map((d) => path.resolve(d));

if (dirs.length === 0) {
  const extRoot = path.join(root, 'extensions');
  dirs = existsSync(extRoot)
    ? readdirSync(extRoot, { withFileTypes: true })
        .filter((e) => e.isDirectory() && existsSync(path.join(extRoot, e.name, 'package.json')))
        .map((e) => path.join(extRoot, e.name))
    : [];
}

if (dirs.length === 0) {
  console.log('No extensions to build.');
  process.exit(0);
}

// Prints "[watch] build started/finished" around each rebuild (counting all
// extensions together) so the VS Code background task knows when it is ready.
let running = 0;
const problemMatcherPlugin = (name) => ({
  name: 'problem-matcher',
  setup(build) {
    build.onStart(() => {
      if (running++ === 0) console.log('[watch] build started');
    });
    build.onEnd((result) => {
      for (const { text, location } of result.errors) {
        console.error(`✘ [ERROR] ${text}`);
        if (location) console.error(`    ${location.file}:${location.line}:${location.column}:`);
      }
      if (result.errors.length === 0) console.log(`  ✓ ${name}`);
      if (--running === 0) console.log('[watch] build finished');
    });
  },
});

const contexts = await Promise.all(
  dirs.map((dir) =>
    esbuild.context({
      absWorkingDir: dir,
      entryPoints: ['src/extension.ts'],
      outfile: 'dist/extension.js',
      bundle: true,
      format: 'cjs',
      platform: 'node',
      target: 'node20',
      external: ['vscode'],
      minify: production,
      sourcemap: !production,
      sourcesContent: false,
      logLevel: 'silent',
      plugins: [problemMatcherPlugin(path.basename(dir))],
    }),
  ),
);

if (watch) {
  await Promise.all(contexts.map((c) => c.watch()));
} else {
  const results = await Promise.allSettled(contexts.map((c) => c.rebuild()));
  await Promise.all(contexts.map((c) => c.dispose()));
  if (results.some((r) => r.status === 'rejected')) process.exit(1);
}
