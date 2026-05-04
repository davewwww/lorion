import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const packagesRoot = fileURLToPath(new URL('../packages/', import.meta.url));
const packageNames = await readdir(packagesRoot, { withFileTypes: true });

for (const entry of packageNames) {
  if (!entry.isDirectory()) {
    continue;
  }

  const manifestPath = join(packagesRoot, entry.name, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  if (manifest.private || !String(manifest.version).includes('-beta.')) {
    continue;
  }

  const spec = `${manifest.name}@${manifest.version}`;
  run('npm', ['dist-tag', 'add', spec, 'beta']);

  const latest = run('npm', ['view', manifest.name, 'dist-tags.latest']).trim();
  if (latest === manifest.version) {
    run('npm', ['dist-tag', 'rm', manifest.name, 'latest']);
  }
}

function run(command, args) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}
