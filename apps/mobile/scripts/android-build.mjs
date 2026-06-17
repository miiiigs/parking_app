import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const modes = {
  tester: {
    args: [
      "assembleRelease",
      "-PallowDebugSigningForRelease=true",
      "-PreactNativeArchitectures=arm64-v8a",
      "-PhermesEnabled=false",
      "-Pandroid.enablePngCrunchInReleaseBuilds=false",
      "--build-cache",
      "--parallel",
    ],
    artifact: ["android", "app", "build", "outputs", "apk", "release", "app-release.apk"],
    description: "tester APK (fast local build)",
  },
  "tester-universal": {
    args: [
      "assembleRelease",
      "-PallowDebugSigningForRelease=true",
      "-Pandroid.enablePngCrunchInReleaseBuilds=false",
      "--build-cache",
      "--parallel",
    ],
    artifact: ["android", "app", "build", "outputs", "apk", "release", "app-release.apk"],
    description: "tester APK (universal release)",
  },
  production: {
    args: ["bundleRelease", "--build-cache", "--parallel"],
    artifact: ["android", "app", "build", "outputs", "bundle", "release", "app-release.aab"],
    description: "production AAB",
  },
};

const mode = process.argv[2] ?? "tester";
const build = modes[mode];

if (!build) {
  console.error("Usage: node ./scripts/android-build.mjs <tester|tester-universal|production>");
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mobileDir = path.resolve(scriptDir, "..");
const androidDir = path.join(mobileDir, "android");
const isWindows = process.platform === "win32";
const command = isWindows ? "gradlew.bat" : "./gradlew";

console.log(`Running ${command} ${build.args.join(" ")} in ${androidDir}`);

const result = spawnSync(command, build.args, {
  cwd: androidDir,
  env: {
    ...process.env,
    EXPO_NO_METRO_WORKSPACE_ROOT: "1",
    NODE_ENV: "production",
  },
  stdio: "inherit",
  shell: isWindows,
});

if (typeof result.status === "number" && result.status !== 0) {
  process.exit(result.status);
}

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

const artifactPath = path.join(mobileDir, ...build.artifact);
console.log(`Built ${build.description}: ${artifactPath}`);
