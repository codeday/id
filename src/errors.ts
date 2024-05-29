export class InvalidPasswordFormatError extends Error {
  message = 'Passwords must be exactly 4 bytes.';
}

export class InvalidPakFormatError extends Error {
  message = 'PAK must be exactly 2 bytes.';
}

export class InvalidPasswordError extends Error {
  message = 'Invalid password.';
}

export class InvalidPakError extends Error {
  message = 'Invalid PAK value returned after authentication.';
}

export class InvalidNfcResponseError extends Error {
  message = 'Invalid response returned from NFC card.';
}

export class InvalidTokenError extends Error {
  message = 'Authentication token is not valid.';
}

export class VerifyError extends Error {
  message = 'Verification failed.';
}

export class MissingTlvNdefError extends Error {
  message = 'TLV header did not specify Ndef content.'
}

export class MissingTokenError extends Error {
  message = 'Token was missing from Ndef.';
}

export class MissingVcardError extends Error {
  message = 'VCARD was missing from Ndef.'
}

export class NoUidError extends Error {
  message = 'Presented card does not have a UID.';
}