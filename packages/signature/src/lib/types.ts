export const KeyTypes = {
  EC: 'EC',
  RSA: 'RSA'
} as const

export type KeyTypes = (typeof KeyTypes)[keyof typeof KeyTypes]

export const Curves = {
  SECP256K1: 'secp256k1',
  P256: 'P-256'
} as const

export type Curves = (typeof Curves)[keyof typeof Curves]

export const Alg = {
  ES256K: 'ES256K', // secp256k1, an Ethereum EOA
  ES256: 'ES256', // secp256r1, ecdsa but not ethereum
  RS256: 'RS256'
} as const

export type Alg = (typeof Alg)[keyof typeof Alg]

export const SigningAlg = {
  ES256K: 'ES256K',
  EIP191: 'EIP191', // ecdsa on secp256k1 with keccak256 & data prefixed w/ \x19Ethereum Signed Message:\n + len(message)
  ES256: 'ES256',
  RS256: 'RS256'
} as const

export type SigningAlg = (typeof SigningAlg)[keyof typeof SigningAlg]

export const Use = {
  SIG: 'sig',
  ENC: 'enc'
} as const

export type Use = (typeof Use)[keyof typeof Use]

export type JWK = {
  kty: 'EC' | 'RSA'
  kid: string
  alg: 'ES256K' | 'ES256' | 'RS256'
  crv?: 'P-256' | 'secp256k1' | undefined
  use?: 'sig' | 'enc' | undefined
  n?: string | undefined
  e?: string | undefined
  x?: string | undefined
  y?: string | undefined
  d?: string | undefined
  addr?: Hex | undefined
}
export type Hex = `0x${string}` // DOMAIN

/**
 * Defines the header of JWT.
 *
 * @param {Alg} alg - The algorithm used to sign the JWT. It contains ES256K which is not natively supported
 * by the jsonwebtoken package
 * @param {string} [kid] - The key ID to identify the signing key.
 */
export type Header = {
  alg: SigningAlg
  kid: string // Key ID to identify the signing key
  typ: 'JWT'
}

/**
 * Defines the payload of JWT.
 *
 * @param {string} requestHash - The hashed request.
 * @param {string} [iss] - The issuer of the JWT.
 * @param {number} [iat] - The time the JWT was issued.
 * @param {number} [exp] - The time the JWT expires.
 * @param {string} sub - The subject of the JWT.
 * @param {string} [aud] - The audience of the JWT.
 * @param {string} [jti] - The JWT ID.
 * @param {JWK} cnf - The client-bound key.
 *
 */
export type Payload = {
  sub: string
  iat?: number
  exp?: number
  iss: string
  aud?: string
  jti?: string
  cnf?: JWK // The client-bound key
  requestHash?: string
  data?: string // hash of any data
}

export type Jwt = {
  header: Header
  payload: Payload
  signature: string
}

/**
 * Defines the input required to generate a JWT signature for a request.
 *
 * @param {string | Hex} privateKey - The private key to sign the JWT with.
 * @param {string} kid - The key ID to identify the signing key.
 * @param {string} [exp] - The time the JWT expires.
 * @param {number} [iat] - The time the JWT was issued.
 * @param {Alg} algorithm - The algorithm to use for signing.
 * @param {unknown} request - The content of the request to be signed.
 */
export type SignatureInput = {
  privateKey: string | Hex
  exp?: number
  iat?: number
  kid: string
  algorithm: Alg
  request: unknown
}

/**
 * Defines the input required to verify a JWT.
 *
 * @param {string} jwt - The JWT to be verified.
 * @param {string} publicKey - The public key that corresponds to the private key used for signing.
 */
export type VerificationInput = {
  jwt: string
  publicKey: string
}

export type EcdsaSignature = {
  r: Hex
  s: Hex
  v: bigint
}