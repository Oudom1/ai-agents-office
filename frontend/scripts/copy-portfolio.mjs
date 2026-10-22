import {cp, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(here, '..');
const repoRoot = path.resolve(frontendDir, '..');
const destinations = ['portfolio', 'singapore-trip', 'patch-analysis'];

for (const directory of destinations) {
  const source = path.join(repoRoot, directory);
  const target = path.join(frontendDir, 'dist', directory);
  await mkdir(path.dirname(target), {recursive: true});
  await cp(source, target, {recursive: true, force: true});
  console.log(`${directory} copied to dist/${directory}`);
}
