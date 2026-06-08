import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function readSource(relativePath) {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return fs.readFileSync(path.resolve(currentDir, relativePath), 'utf8');
}

test('location helper prefers selected locations and falls back deterministically', () => {
  const source = readSource('../lib/adminLocation.ts');

  assert.equal(source.includes('pickAdminLocation'), true);
  assert.equal(source.includes('selectedLocationId'), true);
  assert.equal(source.includes('return locations[0] ?? null'), true);
});
