import {
  sign as jwtSign,
  verify as jwtVerify,
  decode as jwtDecode,
  Jwt,
} from 'jsonwebtoken';
import { InvalidTokenError } from './errors';

const ISSUER = 'id.codeday.org';
const ID_TOKEN_PUBLIC_KEYS: Record<string, string> = {
  'MFY': `-----BEGIN PUBLIC KEY-----\nMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEDuUSkeCmqyP7y2z+SJJqQeonNFJvNie2\nBjgAx2cLcxPg67NcXCZgGf2v8Cf9B4yYDL7XOV3q/7RW3SlruMCTpg==\n-----END PUBLIC KEY-----`,
};
const ID_TOKEN_DEFAULT_PUBLIC_KEY = 'MFY';

export type TokenData = { iss: string, exp: number, sub: string, uid: string };
export type TokenDataInput = Omit<TokenData, 'iss' | 'exp'>;

export function sign(payload: TokenDataInput, privateKey: string, keyid: string = ID_TOKEN_DEFAULT_PUBLIC_KEY) {
	return jwtSign(
		payload,
		privateKey,
		{
			algorithm: 'ES256',
			expiresIn: '4y',
			issuer: ISSUER,
			noTimestamp: true,
			keyid,
		},
	);
}

export function verify(token: string): TokenData {
  const { header } = jwtDecode(token) as Jwt;
  const key = ID_TOKEN_PUBLIC_KEYS[header?.kid || ID_TOKEN_DEFAULT_PUBLIC_KEY];
  if (!key) throw new InvalidTokenError;

  try {
    const result = jwtVerify(
      token,
      key,
      { issuer: ISSUER }
    ) as Partial<TokenData>;
    
    if (!result.iss || !result.exp || !result.sub || !result.uid) throw new InvalidTokenError;
    return result as TokenData;
  } catch (ex) {
    throw new InvalidTokenError;
  }
}