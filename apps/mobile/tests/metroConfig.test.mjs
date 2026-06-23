import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const metroConfig = require('../metro.config.js');

test('metro only watches mobile dependencies and shared workspace sources', () => {
  const workspaceRoot = path.resolve(__dirname, '../../..');
  const operatorAppRoot = path.join(workspaceRoot, 'apps/parking-app-operator');
  const expectedWatchFolders = [
    path.join(workspaceRoot, 'node_modules'),
    path.join(workspaceRoot, 'apps/mobile'),
    path.join(workspaceRoot, 'packages/shared'),
  ];

  assert.deepEqual(metroConfig.watchFolders, expectedWatchFolders);
  assert.equal(metroConfig.watchFolders.includes(operatorAppRoot), false);
});

test('metro blocks sibling app build artifacts from the file graph', () => {
  const workspaceRoot = path.resolve(__dirname, '../../..');
  const nextOutput = path.join(
    workspaceRoot,
    'apps/parking-app-operator/.next/server/app/dashboard/admin-tools'
  );
  const blockList = metroConfig.resolver.blockList;

  assert.equal(blockList.test(nextOutput), true);
});
