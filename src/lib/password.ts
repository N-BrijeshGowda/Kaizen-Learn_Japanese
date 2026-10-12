import "server-only";
import { hash, verify } from "@node-rs/argon2";

// argon2id (the library default), OWASP-minimum parameters.
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// A real hash to compare against when the email is unknown, so sign-in takes about the
// same time whether or not the account exists.
let dummyHash: Promise<string> | null = null;
export function verifyAgainstDummy(password: string): Promise<boolean> {
  dummyHash ??= hash("kaizen-not-a-real-password", OPTIONS);
  return dummyHash.then((h) => verifyPassword(h, password));
}
