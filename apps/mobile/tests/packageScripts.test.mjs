import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8'));
}

test('root scripts point to the mobile workspace', () => {
  const rootPackage = readJson('../../../package.json');

  assert.equal(rootPackage.scripts['dev:mobile'], 'npm --workspace apps/mobile run start');
  assert.equal(rootPackage.scripts['test:mobile'], 'npm --workspace apps/mobile run test');
  assert.equal(rootPackage.scripts.android, 'npm --workspace apps/mobile run android');
  assert.equal(rootPackage.scripts.ios, 'npm --workspace apps/mobile run ios');
  assert.equal(rootPackage.scripts['typecheck:mobile'], 'npm --workspace apps/mobile run typecheck');
});

test('mobile workspace exposes build, test, and typecheck scripts', () => {
  const mobilePackage = readJson('../package.json');

  assert.equal(mobilePackage.name, '@parking/mobile');
  assert.equal(typeof mobilePackage.scripts.test, 'string');
  assert.equal(mobilePackage.scripts.test.includes('tests/*.test.mjs'), true);
  assert.equal(mobilePackage.scripts['build:android'], 'eas build --platform android --profile production');
  assert.equal(mobilePackage.scripts['build:ios'], 'eas build --platform ios --profile production');
  assert.equal(mobilePackage.scripts.typecheck, 'tsc --noEmit');
});
