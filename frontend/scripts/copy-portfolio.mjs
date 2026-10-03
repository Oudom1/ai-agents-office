import {cp, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(here, '..');
const repoRoot = path.resolve(frontendDir, '..');
const source = path.join(repoRoot, 'portfolio');
const target = path.join(frontendDir, 'dist', 'portfolio');

await mkdir(path.dirname(target), {recursive: true});
await cp(source, target, {recursive: true, force: true});
console.log('Portfolio copied to dist/portfolio');
