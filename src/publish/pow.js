'use strict';

// LRCLIB's proof of work: find a nonce whose SHA-256 of `prefix + nonce`,
// read as bytes, is at most `target`. Runs in a worker, with a synchronous
// SHA-256 (crypto.subtle is async per hash and many times slower here).
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const W = new Uint32Array(64);
const H = new Uint32Array(8);

// bytes: ASCII message. Returns the digest as 8 big-endian words in H.
function sha256(bytes) {
  const len = bytes.length;
  const blocks = ((len + 9 + 63) >> 6) << 6;
  const msg = new Uint8Array(blocks);
  msg.set(bytes);
  msg[len] = 0x80;
  const bits = len * 8;
  msg[blocks - 4] = bits >>> 24;
  msg[blocks - 3] = bits >>> 16;
  msg[blocks - 2] = bits >>> 8;
  msg[blocks - 1] = bits;
  H.set([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  for (let o = 0; o < blocks; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = (msg[o + i * 4] << 24) | (msg[o + i * 4 + 1] << 16) | (msg[o + i * 4 + 2] << 8) | msg[o + i * 4 + 3];
    for (let i = 16; i < 64; i++) {
      const a = W[i - 15];
      const b = W[i - 2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  return H;
}

function solve(prefix, targetHex, report) {
  const target = new Uint32Array(8);
  for (let i = 0; i < 8; i++) target[i] = parseInt(targetHex.slice(i * 8, i * 8 + 8), 16) >>> 0;
  const buf = new Uint8Array(prefix.length + 20);
  for (let i = 0; i < prefix.length; i++) buf[i] = prefix.charCodeAt(i);
  for (let nonce = 0; ; nonce++) {
    const digits = String(nonce);
    for (let i = 0; i < digits.length; i++) buf[prefix.length + i] = digits.charCodeAt(i);
    const h = sha256(buf.subarray(0, prefix.length + digits.length));
    let ok = true;
    for (let i = 0; i < 8; i++) {
      if (h[i] !== target[i]) {
        ok = h[i] < target[i];
        break;
      }
    }
    if (ok) return nonce;
    if (report && nonce % 200000 === 0) report(nonce);
  }
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof window === 'undefined') {
  self.onmessage = (e) => {
    const { prefix, target } = e.data;
    const nonce = solve(prefix, target, (n) => self.postMessage({ progress: n }));
    self.postMessage({ nonce });
  };
}
