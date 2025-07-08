import { sha512 } from '@noble/hashes/sha2';
import * as ed from '@noble/ed25519';

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// Optional: A log to confirm the setup file has been executed by Vitest.
console.log('Vitest setup complete: Noble crypto engine configured.');