import fs from 'fs';
import path from 'path';
import JSON5 from 'json5';

export function loadJson5(relativePath) {
  const fullPath = path.join(process.cwd(), relativePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return JSON5.parse(content);
}
