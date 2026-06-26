#!/usr/bin/env node
/**
 * Fetch Android keystores from EAS and install the Play upload key locally.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const require = createRequire(import.meta.url);

const EAS_CLI = '/opt/homebrew/lib/node_modules/eas-cli/build';
// Google Play upload key for com.libdesk.app (NOT the EAS-generated F1:C4:FE key)
const PLAY_UPLOAD_SHA1 = '36:47:F1:EF:A2:6C:9E:B5:46:EE:45:8F:B4:0E:B0:8F:7E:9D:7F:5D';
const EXPECTED_SHA1 = PLAY_UPLOAD_SHA1;
const PACKAGE = 'com.libdesk.app';
const SLUG = 'libdesk';
const OWNER = 'sk245444';

const { createGraphqlClient } = require(path.join(
  EAS_CLI,
  'commandUtils/context/contextUtils/createGraphqlClient.js',
));
const {
  getAndroidAppCredentialsWithCommonFieldsAsync,
} = require(path.join(EAS_CLI, 'credentials/android/api/GraphqlClient.js'));
const {
  AndroidAppBuildCredentialsMutation,
} = require(path.join(
  EAS_CLI,
  'credentials/android/api/graphql/mutations/AndroidAppBuildCredentialsMutation.js',
));

function normSha1(s) {
  return (s || '').replace(/:/g, '').toUpperCase();
}

function getSessionSecret() {
  const statePath = path.join(
    process.env.HOME || '',
    '.expo/state.json',
  );
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  return state?.auth?.sessionSecret ?? null;
}

async function main() {
  const sessionSecret = getSessionSecret();
  if (!sessionSecret) {
    console.error('Not logged in. Run: eas login');
    process.exit(1);
  }

  const graphqlClient = createGraphqlClient({ accessToken: null, sessionSecret });
  const appLookup = {
    account: { name: OWNER },
    projectName: SLUG,
  };

  const idsToTry = [PACKAGE, 'com.sk245444.libdesk'];
  let match = null;
  let smartlibdeskDefault = null;

  for (const androidApplicationIdentifier of idsToTry) {
    const creds = await getAndroidAppCredentialsWithCommonFieldsAsync(graphqlClient, {
      ...appLookup,
      androidApplicationIdentifier,
    });
    const list = creds?.androidAppBuildCredentialsList ?? [];
    console.log(`\nApplication ID: ${androidApplicationIdentifier}`);
    for (const bc of list) {
      const ks = bc.androidKeystore;
      if (!ks) continue;
      console.log(`  ${bc.name} (default=${bc.isDefault}) SHA1: ${ks.sha1CertificateFingerprint}`);
      if (androidApplicationIdentifier === PACKAGE && bc.isDefault) {
        smartlibdeskDefault = bc;
      }
      if (normSha1(ks.sha1CertificateFingerprint) === normSha1(EXPECTED_SHA1)) {
        match = { bc, ks, androidApplicationIdentifier };
      }
    }
  }

  if (!match) {
    console.error(`\nPlay upload key (${PLAY_UPLOAD_SHA1}) not found on EAS.`);
    console.error('Upload the original .jks via: eas credentials → Android → production → Use existing keystore');
    console.error('Or request Upload key reset in Play Console → App integrity.');
    process.exit(1);
  }

  const { ks } = match;
  const ksPath = path.join(ROOT, 'android/app/upload-keystore.jks');
  const propsPath = path.join(ROOT, 'android/key.properties');
  const props = `storeFile=upload-keystore.jks
storePassword=${ks.keystorePassword}
keyAlias=${ks.keyAlias}
keyPassword=${ks.keyPassword}
`;

  fs.writeFileSync(ksPath, Buffer.from(ks.keystore, 'base64'));
  fs.writeFileSync(propsPath, props);
  fs.writeFileSync(path.join(ROOT, 'android/keystore.properties'), props);

  console.log(`\nSaved: ${ksPath}`);
  console.log(`Alias: ${ks.keyAlias}`);

  if (smartlibdeskDefault && smartlibdeskDefault.androidKeystore?.id !== ks.id) {
    await AndroidAppBuildCredentialsMutation.setKeystoreAsync(
      graphqlClient,
      smartlibdeskDefault.id,
      ks.id,
    );
    console.log('Linked Play upload key to EAS production credentials for com.libdesk.app');
  }

  console.log('\nOK — run: npm run keystore:verify && eas build -p android --profile production');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
