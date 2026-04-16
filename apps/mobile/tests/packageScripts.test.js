const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('root package exposes a ci-friendly test command', () => {
  const rootPackage = readJson(path.resolve(__dirname, '../../../package.json'));

  assert.equal(rootPackage.scripts.test, 'npm run test:mobile');
  assert.equal(rootPackage.scripts['test:mobile'], 'npm --workspace apps/mobile run test');
});

test('mobile package exposes the expected build and test scripts', () => {
  const mobilePackage = readJson(path.resolve(__dirname, '../package.json'));

  assert.equal(mobilePackage.scripts.test.includes('workflowRecovery.test.js'), true);
  assert.equal(mobilePackage.scripts.android, 'expo run:android');
  assert.equal(mobilePackage.scripts['build:android'], 'eas build --platform android --profile production');
  assert.equal(mobilePackage.scripts['build:ios'], 'eas build --platform ios --profile production');
});