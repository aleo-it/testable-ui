import { createHash as sha256CreateHash } from 'sha256-uint8array';

interface HashLike {
  update(data: string): HashLike;
  digest(encoding: 'hex'): string;
}

/**
 * Browser-safe drop-in for the slice of `node:crypto` that @testable-ui/core
 * uses: `createHash('sha256').update(str).digest('hex')`. Backed by
 * sha256-uint8array (pure JS, 4KB) so the real naming engine — including the
 * exact 12-hex path suffix — runs identically client-side.
 */
export function createHash(algorithm: string): HashLike {
  if (algorithm !== 'sha256') {
    throw new Error(`cryptoShim: only sha256 is supported, received "${algorithm}"`);
  }
  const hash = sha256CreateHash();
  return {
    update(data: string): HashLike {
      hash.update(data);
      return this;
    },
    digest(encoding: 'hex'): string {
      return hash.digest(encoding);
    },
  };
}
