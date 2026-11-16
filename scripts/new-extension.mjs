// Scaffolds a new extension from templates/extension.
//   node scripts/new-extension.mjs <kebab-name> [--display "Display Name"] [--publisher id]
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncLaunch } from './sync-launch.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args.splice(i, 2)[1] : fallback;
};

const display = flag('display');
const publisher = flag('publisher', 'local');
const name = args[0];

if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('Usage: node scripts/new-extension.mjs <kebab-name> [--display "Name"] [--publisher id]');
  process.exit(1);
}

const target = path.join(root, 'extensions', name);
if (existsSync(target)) {
  console.error(`extensions/${name} already exists.`);
  process.exit(1);
}

const displayName =
  display ?? name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const commandPrefix = name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const replacements = {
  __NAME__: name,
  __DISPLAY_NAME__: displayName,
  __PUBLISHER__: publisher,
  __COMMAND_PREFIX__: commandPrefix,
};

cpSync(path.join(root, 'templates', 'extension'), target, { recursive: true });

const fill = (dir) => {
  for (const entry of readdirSync(dir)) {
    const file = path.join(dir, entry);
    if (statSync(file).isDirectory()) {
      fill(file);
      continue;
    }
    let text = readFileSync(file, 'utf8');
    for (const [key, value] of Object.entries(replacements)) text = text.replaceAll(key, value);
    writeFileSync(file, text);
  }
};
fill(target);
syncLaunch();

console.log(`Created extensions/${name} (${publisher}.${name}).

Next:
  npm install                      # link the new workspace
  npm run build -w extensions/${name}
  F5 -> "Run: ${name}"`);
