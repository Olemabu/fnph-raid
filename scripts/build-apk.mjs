// Builds an offline Android APK of FNPH Raid without Gradle: the web app is
// copied into assets/www and served on the phone by the small WebView app in
// android/. Needs the Android SDK (platforms;android-35, build-tools;34.0.0)
// and a JDK. Output: dist/apk/fnph-raid.apk
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk");
const javaBin = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, "bin") : "";
const buildTools = path.join(sdkRoot, "build-tools", "34.0.0");
const androidJar = path.join(sdkRoot, "platforms", "android-35", "android.jar");
const outDir = path.join(root, "dist", "apk");
const workDir = path.join(outDir, "work");
const assetsDir = path.join(workDir, "assets", "www");
const resDir = path.join(workDir, "res");
const classOut = path.join(workDir, "classes");
const dexOut = path.join(workDir, "dex");
const javaOut = path.join(workDir, "gen");
const unsignedApk = path.join(outDir, "fnph-raid-unsigned.apk");
const alignedApk = path.join(outDir, "fnph-raid-aligned.apk");
const finalApk = path.join(outDir, "fnph-raid.apk");
// The signing key lives outside git. Keep a backup: an update signed with a
// different key will not install over the app without uninstalling it first.
const keystore = process.env.FNPH_KEYSTORE || path.join(process.env.USERPROFILE || process.env.HOME, ".codex", "signing", "fnph-raid.keystore");
const keyAlias = process.env.FNPH_KEY_ALIAS || "fnph-raid";
const storePass = process.env.FNPH_KEYSTORE_PASS || (() => { throw new Error("Set FNPH_KEYSTORE_PASS to the saved signing password"); })();

// Everything the web app needs at runtime; build tooling and git stay out.
const EXCLUDE = new Set([".git", ".gitignore", ".claude", ".wrangler", "functions", "podcasts", "media", "android", "scripts", "dist", "brands", "node_modules", "package.json", "package-lock.json", "README.md"]);

const exe = (name) => (process.platform === "win32" ? `${name}.exe` : name);
const bat = (name) => (process.platform === "win32" ? `${name}.bat` : name);
const tools = {
  aapt2: path.join(buildTools, exe("aapt2")),
  d8: path.join(buildTools, bat("d8")),
  zipalign: path.join(buildTools, exe("zipalign")),
  apksigner: path.join(buildTools, bat("apksigner")),
  javac: javaBin ? path.join(javaBin, exe("javac")) : "javac",
  jar: javaBin ? path.join(javaBin, exe("jar")) : "jar",
  keytool: javaBin ? path.join(javaBin, exe("keytool")) : "keytool",
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", stdio: "pipe", shell: command.endsWith(".bat"), ...options });
  if (result.status !== 0) {
    console.error(result.stdout || "");
    console.error(result.stderr || result.error || "");
    throw new Error(`${path.basename(command)} failed`);
  }
  return result;
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyWebApp(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (from === root && (EXCLUDE.has(entry.name) || entry.name.startsWith(".env") || entry.name === ".snapshot.json" || entry.name === "tests")) continue;
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyWebApp(source, target);
    else if (entry.isFile()) copyFile(source, target);
  }
}

function listFiles(dir, extension) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const item = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(item, extension));
    else if (entry.isFile() && item.endsWith(extension)) files.push(item);
  }
  return files;
}

function webVersion() { return "10"; }

function prepare() {
  for (const required of [androidJar, tools.aapt2, tools.zipalign]) {
    if (!fs.existsSync(required)) throw new Error(`Missing Android SDK file: ${required}`);
  }
  fs.mkdirSync(outDir, { recursive: true });
  resetDir(workDir);
  [unsignedApk, alignedApk, finalApk].forEach((file) => fs.rmSync(file, { force: true }));

  fs.mkdirSync(assetsDir, { recursive: true });
  copyFile(path.join(root, "dist", "fnph-raid-offline.html"), path.join(assetsDir, "index.html"));
  copyFile(path.join(root, "src", "pwa", "icon-192.png"), path.join(resDir, "mipmap-xxxhdpi", "ic_launcher.png"));

  const version = webVersion();
  const manifest = fs.readFileSync(path.join(root, "android", "AndroidManifest.xml"), "utf8")
    .replace(/android:versionCode="\d+"/, `android:versionCode="${version}"`)
    .replace(/android:versionName="[^"]*"/, `android:versionName="1.2.7"`);
  fs.writeFileSync(path.join(workDir, "AndroidManifest.xml"), manifest);
  return version;
}

function build() {
  const version = prepare();
  [classOut, dexOut, javaOut].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

  const flatArchive = path.join(workDir, "compiled.flata");
  run(tools.aapt2, ["compile", "--dir", resDir, "-o", flatArchive]);
  run(tools.aapt2, [
    "link",
    "-o", unsignedApk,
    "-I", androidJar,
    "--manifest", path.join(workDir, "AndroidManifest.xml"),
    "--min-sdk-version", "23",
    "--target-sdk-version", "35",
    "--java", javaOut,
    "--auto-add-overlay",
    flatArchive,
  ]);

  const javaFiles = [...listFiles(path.join(root, "android", "src"), ".java"), ...listFiles(javaOut, ".java")];
  run(tools.javac, ["-encoding", "UTF-8", "-source", "8", "-target", "8", "-Xlint:-options", "-classpath", androidJar, "-d", classOut, ...javaFiles]);
  run(tools.d8, ["--min-api", "23", "--lib", androidJar, "--output", dexOut, ...listFiles(classOut, ".class")]);

  // jar keeps forward slashes in entry names on Windows, which Android requires.
  run(tools.jar, ["uf", unsignedApk, "-C", dexOut, "classes.dex"]);
  run(tools.jar, ["uf", unsignedApk, "-C", workDir, "assets"]);
  run(tools.zipalign, ["-f", "4", unsignedApk, alignedApk]);

  if (!fs.existsSync(keystore)) {
    run(tools.keytool, [
      "-genkeypair",
      "-keystore", keystore,
      "-storepass", storePass,
      "-keypass", storePass,
      "-alias", keyAlias,
      "-keyalg", "RSA",
      "-keysize", "2048",
      "-validity", "10000",
      "-dname", "CN=FNPH Raid,O=Olemabu,C=NG",
    ]);
  }
  run(tools.apksigner, ["sign", "--ks", keystore, "--ks-key-alias", keyAlias, "--ks-pass", `pass:${storePass}`, "--key-pass", `pass:${storePass}`, "--out", finalApk, alignedApk]);
  run(tools.apksigner, ["verify", finalApk]);
  [unsignedApk, alignedApk].forEach((file) => fs.rmSync(file, { force: true }));

  const size = (fs.statSync(finalApk).size / 1024 / 1024).toFixed(1);
  console.log(`Built ${finalApk} (version ${version}, ${size} MB)`);
}

build();
