/**
 * The Web Push helpers (RFC 8291 aes128gcm + the VAPID JWT).
 * Ported to match the reference implementation (http_ece / web-push) exactly.
 *
 * The flow:
 *   1. salt   = random(16)
 *   2. ecdh   = ECDH(our ephemeral private key, the receiver's p256dh)
 *   3. secret = HKDF(salt=auth, ikm=ecdh, info="WebPush: info\0"+receiver+sender, 32)
 *   4. prk    = HKDF-Extract(salt, secret)
 *   5. key    = HKDF-Expand(prk, "Content-Encoding: aes128gcm\0", 16)
 *   6. nonce  = HKDF-Expand(prk, "Content-Encoding: nonce\0", 12)
 *   7. body   = AES-128-GCM(key, nonce, payload || 0x02)
 *   8. header = salt(16) || rs(4) || idlen(1) || our public key
 */

export function b64url(bytes) {
  let s = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlToBytes(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function concat(...arrays) {
  let len = 0;
  for (const a of arrays) len += a.length;
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

/* HMAC-SHA256 */
async function hmac(keyBytes, data) {
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}

/* HKDF-Extract (RFC 5869) */
export async function hkdfExtract(salt, ikm) {
  return hmac(salt, ikm);
}

/* HKDF-Expand (RFC 5869) */
export async function hkdfExpand(prk, info, length) {
  let out = new Uint8Array(0);
  let t = new Uint8Array(0);
  let counter = 1;
  while (out.length < length) {
    t = await hmac(prk, concat(t, info, new Uint8Array([counter])));
    out = concat(out, t);
    counter++;
    if (counter > 255) break;
  }
  return out.slice(0, length);
}

/* HKDF = Extract + Expand */
export async function hkdf(salt, ikm, info, length) {
  const prk = await hkdfExtract(salt, ikm);
  return hkdfExpand(prk, info, length);
}

/**
 * Encrypt a payload for one subscription (aes128gcm).
 */
export async function encryptPush(subscription, payload) {
  const p256dh = b64urlToBytes(subscription.p256dh);     // 65 bytes
  const auth = b64urlToBytes(subscription.auth);         // 16 bytes

  /* the receiver's public key */
  const receiverKey = await crypto.subtle.importKey(
    'raw', p256dh, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );

  /* our ephemeral key pair */
  const localKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const senderPublic = new Uint8Array(await crypto.subtle.exportKey('raw', localKeys.publicKey));

  /* the shared secret */
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: receiverKey }, localKeys.privateKey, 256
  ));

  /* the auth secret */
  const info = concat(new TextEncoder().encode('WebPush: info\0'), p256dh, senderPublic);
  const secret = await hkdf(auth, ecdh, info, 32);

  /* the content key + the nonce */
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hkdfExtract(salt, secret);
  const key = await hkdfExpand(prk, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfExpand(prk, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);

  /* the plaintext: the payload + the padding (the last record ends with 0x02) */
  const plaintext = concat(new TextEncoder().encode(payload), new Uint8Array([0x02]));

  /* AES-128-GCM (no additional data) */
  const aesKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, plaintext
  ));

  /* the header: salt(16) || rs(4) || idlen(1) || our public key */
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const idlen = new Uint8Array([senderPublic.length]);
  const header = concat(salt, rs, idlen, senderPublic);

  return { header, body: cipher };
}

/**
 * The VAPID JWT (ES256) for the push service.
 */
export async function vapidToken(vapid, audience, subject) {
  const header = b64url(new TextEncoder().encode(JSON.stringify({
    typ: 'JWT', alg: 'ES256',
  })));
  const payload = b64url(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  })));
  const signingInput = header + '.' + payload;

  const key = await crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256',
    x: vapid.privateKeyX, y: vapid.privateKeyY, d: vapid.privateKeyD,
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput)
  ));

  return signingInput + '.' + b64url(sig);
}

/**
 * Send one push message. Returns true on success, 'gone' when the
 * subscription is dead, false otherwise.
 */
export async function sendPush(subscription, payload, vapid) {
  try {
    const { header, body } = await encryptPush(subscription, payload);
    const url = new URL(subscription.endpoint);
    const aud = url.origin;
    const jwt = await vapidToken(vapid, aud, vapid.subject);

    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        'TTL': '86400',
        'Authorization': 'vapid t=' + jwt + ', k=' + vapid.publicKey,
      },
      body: concat(header, body),
    });

    if (res.ok) return true;
    if (res.status === 404 || res.status === 410) return 'gone';
    return false;
  } catch (e) {
    return false;
  }
}
