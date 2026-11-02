// Checks the publish proof-of-work: SHA-256 against node:crypto, and that
// the nonce found really hashes under the target.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = {};
vm.runInNewContext(readFileSync(new URL('../src/publish/pow.js', import.meta.url), 'utf8') + ';this.sha256=sha256;this.solve=solve;', ctx);
const hex = (h) => [...h].map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
let fail = 0;
for (const m of ['', 'abc', 'x'.repeat(55), 'y'.repeat(56), 'z'.repeat(64), 'w'.repeat(130)]) {
  const got = hex(ctx.sha256(new TextEncoder().encode(m)));
  if (got !== createHash('sha256').update(m).digest('hex')) (fail++, console.log('sha256 mismatch', m.length));
}
const prefix = 'VtuJ3lFbMpoPq3Zs1d0g8aOWiE6kzK7Y';
const target = '0000ffff' + 'f'.repeat(56);
const t0 = Date.now();
const nonce = ctx.solve(prefix, target);
const h = createHash('sha256').update(prefix + nonce).digest('hex');
if (!(h <= target)) (fail++, console.log('bad nonce', nonce, h));
console.log(`pow: nonce ${nonce} in ${Date.now() - t0} ms`);
if (fail) process.exit(1);
console.log('pow: ok');
