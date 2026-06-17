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

config.resolver.blockList = gradlePluginPattern;

module.exports = config;
