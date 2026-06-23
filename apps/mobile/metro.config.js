const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const rootNodeModules = path.join(workspaceRoot, 'node_modules');
const sharedPackageRoot = path.join(workspaceRoot, 'packages/shared');
const gradlePluginRoot = path.resolve(
  projectRoot,
  '../../node_modules/@react-native/gradle-plugin'
);

const escapeForRegex = (value) => value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
const gradlePluginPattern = new RegExp(
  `^${escapeForRegex(gradlePluginRoot)}(?:[\\\\/].*)?$`
);
const siblingAppBuildArtifactsPattern = new RegExp(
  `^${escapeForRegex(path.join(workspaceRoot, 'apps'))}[\\\\/][^\\\\/]+[\\\\/](?:\\.next|dist|build)(?:[\\\\/].*)?$`
);

const config = getDefaultConfig(projectRoot);
const defaultBlockList = config.resolver.blockList;

// Metro only needs the mobile app, the shared workspace package, and the root
// dependency tree. Watching sibling apps lets transient build output like
// `apps/parking-app-operator/.next` crash Expo's fallback watcher.
config.watchFolders = [rootNodeModules, projectRoot, sharedPackageRoot].filter((folder) =>
  fs.existsSync(folder)
);

// Keep Expo's defaults intact while excluding known non-mobile build artifacts.
config.resolver.blockList = new RegExp(
  `${defaultBlockList.source}|${gradlePluginPattern.source}|${siblingAppBuildArtifactsPattern.source}`
);

module.exports = config;
