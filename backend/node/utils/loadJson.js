import fs from 'fs';
import path from 'path';

export const loadJson = (filename) => {
  const filePath = path.join(process.cwd(), 'backend', 'node', 'data', filename);
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};
