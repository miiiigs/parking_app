const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const sharedPackageRoot = path.resolve(workspaceRoot, 'packages/shared');
const gradlePluginRoot = path.resolve(
  projectRoot,
  '../../node_modules/@react-native/gradle-plugin'
);

const escapeForRegex = (value) => value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
const gradlePluginPattern = new RegExp(
  `^${escapeForRegex(gradlePluginRoot)}(?:[\\\\/].*)?$`
);

const config = getDefaultConfig(projectRoot);

config.resolver.blockList = gradlePluginPattern;
config.watchFolders = [sharedPackageRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
  '@parking/shared': sharedPackageRoot,
};

module.exports = config;
