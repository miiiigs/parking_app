const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const gradlePluginRoot = path.resolve(
  projectRoot,
  '../../node_modules/@react-native/gradle-plugin'
);

const escapeForRegex = (value) => value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
const gradlePluginPattern = new RegExp(
  `^${escapeForRegex(gradlePluginRoot)}(?:[\\\\/].*)?$`
);

const config = getDefaultConfig(projectRoot);
const defaultBlockList = config.resolver.blockList;

// Keep Expo's workspace-aware defaults intact and only exclude the Gradle plugin
// sources from Metro's file graph.
config.resolver.blockList = new RegExp(
  `${defaultBlockList.source}|${gradlePluginPattern.source}`
);

module.exports = config;
