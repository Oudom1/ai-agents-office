import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../src/index.ts', import.meta.url);
let source = await readFile(path, 'utf8');

const marker = "    if(name==='ui_frames_to_use') return def ?? 9;\n";
const replacement = marker +
  "    if(name==='improve_texture_flag' || label.includes('improve texture') || label.includes('multi-scale')) return false;\n" +
  "    if(name==='slow_motion_flag' || label.includes('slow motion')) return false;\n";

if (!source.includes("name==='improve_texture_flag'")) {
  if (!source.includes(marker)) throw new Error('Kai ZeroGPU patch marker not found');
  source = source.replace(marker, replacement);
}

await writeFile(path, source, 'utf8');
console.log('Kai ZeroGPU compatibility patch applied: single-pass texture disabled and slow motion disabled.');
