import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { generateKeyPairSync, sign, verify } from 'node:crypto';

// Sin mocks, credenciales ni red: comprueba el arranque del SDK real
// incluso en un runtime que no permite require() de módulos ESM.
await import('firebase-admin/auth');
await import('firebase-admin/firestore');
const require = createRequire(import.meta.url);
const adminRequire = createRequire(require.resolve('firebase-admin/auth'));
const jwksClient = adminRequire('jwks-rsa');
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'runtime-check', alg: 'RS256', use: 'sig' };
const client = jwksClient({ jwksUri: 'https://example.invalid/unused', cache: false, rateLimit: false });
client.getKeys = async () => [jwk];
const signingKey = await client.getSigningKey(jwk.kid);
const data = Buffer.from('Cumbre: compatibilidad de claves del servidor');
const signature = sign('RSA-SHA256', data, privateKey);
assert.equal(verify('RSA-SHA256', data, signingKey.getPublicKey(), signature), true);
console.log('Runtime de servidor: Firebase Admin carga y jwks-rsa convierte una clave válida.');
