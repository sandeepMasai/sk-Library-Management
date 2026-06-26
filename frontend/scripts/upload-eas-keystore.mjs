#!/usr/bin/env node
/**
 * Upload local Play upload keystore to EAS and set as default for com.libdesk.app.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const require = createRequire(import.meta.url);

const EAS_CLI = '/opt/homebrew/lib/node_modules/eas-cli/build';
const PLAY_UPLOAD_SHA1 = '36:47:F1:EF:A2:6C:9E:B5:46:EE:45:8F:B4:0E:B0:8F:7E:9D:7F:5D';
const PACKAGE = 'com.libdesk.app';
const SLUG = 'libdesk';
const OWNER = 'sk245444';

const { createGraphqlClient } = require(path.join(
  EAS_CLI,
  'commandUtils/context/contextUtils/createGraphqlClient.js',
));
const {
  getAndroidAppCredentialsWithCommonFieldsAsync,
  createKeystoreAsync,
  updateAndroidAppBuildCredentialsAsync,
} = require(path.join(EAS_CLI, 'credentials/android/api/GraphqlClient.js'));
const { AppQuery } = require(path.join(EAS_CLI, 'graphql/queries/AppQuery.js'));

function normSha1(s) {
  return (s || '').replace(/:/g, '').toUpperCase();
}

function getSessionSecret() {
  const statePath = path.join(process.env.HOME || '', '.expo/state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  return state?.auth?.sessionSecret ?? null;
}

function loadKeyProps() {
  const propsPath = path.join(ROOT, 'android/key.properties');
  if (!fs.existsSync(propsPath)) {
    throw new Error('Missing android/key.properties — run npm run keystore:setup-pritam');
  }
  const text = fs.readFileSync(propsPath, 'utf8');
  const get = (key) => {
    const m = text.match(new RegExp(`^${key}=(.+)$`, 'm'));
    return m ? m[1].trim() : '';
  };
  const storeFile = get('storeFile');
  const ksPath = path.isAbsolute(storeFile)
    ? storeFile
    : path.join(ROOT, 'android/app', storeFile);
  return {
    ksPath,
    storePassword: get('storePassword'),
    keyAlias: get('keyAlias'),
    keyPassword: get('keyPassword'),
  };
}

function verifySha1(ksPath, alias, storePassword) {
  const out = execSync(
    `keytool -list -v -keystore "${ksPath}" -alias "${alias}" -storepass "${storePassword}" 2>&1`,
    { encoding: 'utf8' },
  );
  const m = out.match(/SHA1:\s*([0-9A-F:]+)/i);
  if (!m) throw new Error('Could not read SHA1 from keystore');
  return m[1].replace(/\s/g, '');
}

async function main() {
  const sessionSecret = getSessionSecret();
  if (!sessionSecret) {
    console.error('Not logged in. Run: eas login');
    process.exit(1);
  }

  const { ksPath, storePassword, keyAlias, keyPassword } = loadKeyProps();
  if (!fs.existsSync(ksPath)) {
    throw new Error(`Keystore not found: ${ksPath}`);
  }

  const sha1 = verifySha1(ksPath, keyAlias, storePassword);
  if (normSha1(sha1) !== normSha1(PLAY_UPLOAD_SHA1)) {
    console.error(`Keystore SHA1 ${sha1} does not match Play upload key.`);
    process.exit(1);
  }
  console.log(`Local keystore OK — SHA1: ${sha1}`);

  const graphqlClient = createGraphqlClient({ accessToken: null, sessionSecret });
  const app = await AppQuery.byFullNameAsync(graphqlClient, `@${OWNER}/${SLUG}`);
  const account = { id: app.ownerAccount.id, name: app.ownerAccount.name };

  const creds = await getAndroidAppCredentialsWithCommonFieldsAsync(graphqlClient, {
    account: { name: OWNER },
    projectName: SLUG,
    androidApplicationIdentifier: PACKAGE,
  });
  const list = creds?.androidAppBuildCredentialsList ?? [];
  const defaultBc = list.find((bc) => bc.isDefault) ?? list[0];
  if (!defaultBc) {
    throw new Error(`No EAS build credentials for ${PACKAGE}`);
  }

  const existing = list
    .map((bc) => bc.androidKeystore)
    .filter(Boolean)
    .find((ks) => normSha1(ks.sha1CertificateFingerprint) === normSha1(PLAY_UPLOAD_SHA1));

  let keystoreId;
  if (existing) {
    keystoreId = existing.id;
    console.log(`Play keystore already on EAS (id=${keystoreId})`);
  } else {
    const base64 = fs.readFileSync(ksPath).toString('base64');
    const created = await createKeystoreAsync(graphqlClient, account, {
      keystore: base64,
      keystorePassword: storePassword,
      keyAlias,
      keyPassword,
    });
    keystoreId = created.id;
    console.log(`Uploaded keystore to EAS (id=${keystoreId}, SHA1=${created.sha1CertificateFingerprint})`);
  }

  if (defaultBc.androidKeystore?.id !== keystoreId) {
    await updateAndroidAppBuildCredentialsAsync(graphqlClient, defaultBc, {
      androidKeystoreId: keystoreId,
    });
    console.log(`Linked Play keystore to default EAS credentials for ${PACKAGE}`);
  } else {
    console.log('Default EAS credentials already use Play upload key.');
  }

  console.log('\nOK — run: npx eas build --platform android --profile production --non-interactive');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
