// Config plugin (registrowany w app.json) dopinający realny keystore do buildu release na Androidzie.
//
// Domyślnie `expo prebuild` generuje builds release podpisane tym samym publicznie znanym
// kluczem "debug.keystore", którego hasło ("android") jest identyczne we wszystkich projektach
// Expo/React Native na świecie — ktokolwiek mógłby więc podpisać złośliwy plik APK tym samym
// kluczem i podszyć się pod "aktualizację" tej aplikacji. Ponieważ APK ma być dystrybuowany
// ręcznie przez GitHub Releases (bez weryfikacji przez Google Play), używamy tu prawdziwego,
// jednorazowo wygenerowanego keystore'a — patrz credentials/release.keystore.
//
// android/ jest w całości regenerowany przy każdym `expo prebuild --clean` (CNG), więc ten plugin
// musi za każdym razem: skopiować plik keystore do android/app/, wstrzyknąć hasła do
// android/gradle.properties i podmienić signingConfig buildu release w android/app/build.gradle.
const { withAppBuildGradle, withGradleProperties, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const KEYSTORE_JSON = path.join(__dirname, '..', 'credentials', 'release-keystore.json');
const KEYSTORE_FILE = path.join(__dirname, '..', 'credentials', 'release.keystore');

function withReleaseSigning(config) {
  if (!fs.existsSync(KEYSTORE_JSON) || !fs.existsSync(KEYSTORE_FILE)) {
    // Brak wygenerowanego keystore'a (np. świeży checkout repo) — build release wypadnie
    // z powrotem na keystore debug, zamiast wywalać cały prebuild.
    return config;
  }
  const creds = JSON.parse(fs.readFileSync(KEYSTORE_JSON, 'utf8'));

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dest = path.join(cfg.modRequest.platformProjectRoot, 'app', 'release.keystore');
      fs.copyFileSync(KEYSTORE_FILE, dest);
      return cfg;
    },
  ]);

  config = withGradleProperties(config, (cfg) => {
    const props = cfg.modResults.filter(
      (p) => !(p.type === 'property' && String(p.key).startsWith('RELEASE_'))
    );
    props.push(
      { type: 'property', key: 'RELEASE_STORE_FILE', value: 'release.keystore' },
      { type: 'property', key: 'RELEASE_STORE_PASSWORD', value: creds.storePassword },
      { type: 'property', key: 'RELEASE_KEY_ALIAS', value: creds.keyAlias },
      { type: 'property', key: 'RELEASE_KEY_PASSWORD', value: creds.keyPassword }
    );
    cfg.modResults = props;
    return cfg;
  });

  config = withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;

    if (!contents.includes('signingConfigs.release')) {
      contents = contents.replace(
        /signingConfigs\s*\{/,
        `signingConfigs {\n        release {\n            storeFile file(RELEASE_STORE_FILE)\n            storePassword RELEASE_STORE_PASSWORD\n            keyAlias RELEASE_KEY_ALIAS\n            keyPassword RELEASE_KEY_PASSWORD\n        }`
      );
      contents = contents.replace(
        /(buildTypes\s*\{\s*debug\s*\{[^}]*\}\s*release\s*\{\s*)(\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*)?signingConfig signingConfigs\.debug/,
        '$1signingConfig signingConfigs.release'
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });

  return config;
}

module.exports = withReleaseSigning;
