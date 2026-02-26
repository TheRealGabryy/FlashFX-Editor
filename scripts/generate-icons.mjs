import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LUCIDE = join(ROOT, 'node_modules', 'lucide-static');
const OUTPUT = join(ROOT, 'public', 'icons');
const CHUNKS_DIR = join(OUTPUT, 'chunks');

const CHUNK_SIZE = 120;

function toDisplayName(id) {
  return id
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function run() {
  const iconNodes = JSON.parse(readFileSync(join(LUCIDE, 'icon-nodes.json'), 'utf-8'));
  const tagsMap = JSON.parse(readFileSync(join(LUCIDE, 'tags.json'), 'utf-8'));

  const ids = Object.keys(iconNodes).sort();
  console.log(`Processing ${ids.length} icons...`);

  const allIcons = ids.map(id => {
    const nameTags = id.split('-');
    const externalTags = tagsMap[id] || [];
    const tags = [...new Set([...nameTags, ...externalTags])];

    const elements = iconNodes[id].map(([tag, attrs]) => {
      const cleaned = { ...attrs };
      delete cleaned.fill;
      return { tag, attrs: cleaned };
    });

    return {
      id,
      name: toDisplayName(id),
      tags,
      viewBox: '0 0 24 24',
      elements,
    };
  });

  const chunks = [];
  for (let i = 0; i < allIcons.length; i += CHUNK_SIZE) {
    chunks.push(allIcons.slice(i, i + CHUNK_SIZE));
  }

  if (!existsSync(CHUNKS_DIR)) mkdirSync(CHUNKS_DIR, { recursive: true });

  const index = [];

  chunks.forEach((chunk, ci) => {
    const chunkName = `chunk-${ci}`;
    const chunkPath = join(CHUNKS_DIR, `${chunkName}.json`);
    writeFileSync(chunkPath, JSON.stringify(chunk));

    chunk.forEach(icon => {
      index.push({
        id: icon.id,
        name: icon.name,
        tags: icon.tags,
        chunk: chunkName,
      });
    });
  });

  writeFileSync(join(OUTPUT, 'index.json'), JSON.stringify(index));

  console.log(`Generated ${index.length} index entries`);
  console.log(`Generated ${chunks.length} chunks in ${CHUNKS_DIR}`);
}

run();
