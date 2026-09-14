import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

// Derives a fixed-length cryptographic key from a password and salt.
//
// scrypt is intentionally computationally and memory expensive, which makes
// large-scale password guessing attacks more costly than using a fast hash.
function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64, // Produce a 64-byte derived key.
      {
        N: 32768, // CPU/memory cost parameter.
        r: 8, // Block size parameter.
        p: 3, // Parallelization parameter.
        maxmem: 64 * 1024 * 1024, // Maximum memory scrypt may use.
      },
      (error, key) => {
        if (error) reject(error)
        else resolve(key)
      },
    )
  })
}

export async function hashPassword(password: string) {
  // Generate a unique random salt for every password.
  // 16 random bytes become 32 hexadecimal characters.
  const salt = randomBytes(16).toString('hex')

  const key = await deriveKey(password, salt)

  // Store the algorithm, salt, and derived key together so verification
  // has everything it needs without storing the original password.
  //
  // Format:
  // scrypt$<32-char salt>$<128-char derived key>
  return `scrypt$${salt}$${key.toString('hex')}`
}

// Used when a login attempt references an email address that does not exist.
//
// We still run scrypt against this dummy hash so invalid-email attempts take
// roughly the same amount of work as attempts for real users. This reduces
// timing differences that could otherwise reveal whether an account exists.
export const DUMMY_PASSWORD_HASH = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`

export async function verifyPassword(password: string, hash: string) {
  // Reject malformed or unsupported password hashes before attempting
  // verification. This also ensures the split values below have the
  // expected lengths and hexadecimal format.
  if (!/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hash)) {
    return false
  }

  const [, salt, expected] = hash.split('$')

  // Derive a key from the submitted password using the same salt that was
  // stored when the password was originally hashed.
  const actual = await deriveKey(password, salt)

  // Compare the derived key with the stored key using a constant-time
  // comparison to avoid leaking information through normal string-comparison
  // timing differences.
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'))
}
