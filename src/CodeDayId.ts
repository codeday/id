
import { Reader } from '@tockawa/nfc-pcsc';
import ndef from '@taptrack/ndef';
import {
  InvalidPasswordError,
  InvalidPakError,
  InvalidNfcResponseError,
  InvalidPasswordFormatError,
  InvalidPakFormatError,
  VerifyError,
  MissingTlvNdefError,
  MissingTokenError,
  MissingVcardError,
  NoUidError,
} from './errors';
import { tlvBlockNdef } from './tlv';
import { MimeRecord, mimeRecordEncode, mimeRecordFind } from './mime';
import { createVcard } from './vcard';
import { TokenData, sign, verify } from './token';

const CONTENT_TYPE_VCARD = 'text/vcard';
const CONTENT_TYPE_ID = 'text/x-codeday-id';

const DEBUG = console.log; // TODO

/**
 * Methods for interfacing with NTAG215-based CodeDay ID cards.
 * 
 * @see https://www.nxp.com/docs/en/data-sheet/NTAG213_215_216.pdf
 */
export class CodeDayId {
  public readonly uid: string;
  private readonly reader: Reader;
  private vcard?: string;
  private token?: string;

	constructor(reader: Reader, card: { uid?: string }) {
    if (!card.uid) throw new NoUidError;
    this.uid = card.uid;
    this.reader = reader;
  }

  async getToken(): Promise<TokenData> {
    if (!this.token) await this.refresh();
    if (!this.token) throw new MissingTokenError;
    return verify(this.token);
  }

  async getVcard(): Promise<string> {
    if (!this.vcard) await this.refresh();
    if (!this.vcard) throw new MissingVcardError;
    return this.vcard;
  }

  async refresh(): Promise<void> {
    try {
      const tlvBytes = await this.reader.read(4, 4);
      if (tlvBytes[0] !== 0x03) throw new MissingTlvNdefError;

      let length = tlvBytes[1]; // Default to 1-byte length
      if (length === 0xFF) length = tlvBytes[2] << 8 | tlvBytes[3]; // Use 3-byte length

      const info = await this.reader.read(5, length);
      const records = ndef.Message.fromBytes(info)?.getRecords() as MimeRecord[];

      this.vcard = mimeRecordFind(records, CONTENT_TYPE_VCARD);
      this.token = mimeRecordFind(records, CONTENT_TYPE_ID);
    } catch (ex) {
      DEBUG(ex);
    }
  }

  async writeCardData (
    givenName: string, 
    familyName: string,
    username: string,
    privateKey: string,
    keyid?: string,
  ): Promise<void> {
    this.vcard = createVcard(givenName, familyName, username);
    this.token = sign({ sub: username, uid: this.uid }, privateKey, keyid);

    const message = new ndef.Message([
      mimeRecordEncode(CONTENT_TYPE_VCARD, this.vcard),
      mimeRecordEncode(CONTENT_TYPE_ID, this.token),
    ]);

    return this.writeRawNdef(message.toByteArray());
  }

  async writeRawNdef(ndefContent: Buffer | Uint8Array): Promise<void> {
    const data = tlvBlockNdef(ndefContent);
    DEBUG(`Writing ${data.length}-byte profile to card...`);
    await this.reader.write(4, data);

    // Verify
    DEBUG(`... done; verifying...`);
    const readData = await this.reader.read(4, data.length) as Buffer;
    if (!readData.equals(data)) throw new VerifyError;
    DEBUG(`... written successfully.`);
  }

  async lock(): Promise<void> {
    await this.reader.write(0x83, Buffer.from([
      0b00000100, // MIRROR_CONF(2), MIRROR_BYTE(2), 0b0, STRG_MD_EN, 0b00
      0, // Reserved
      0x00, // MIRROR_PAGE(8)
      0x00, // AUTH0
      0b01000000, // PROT, CFGLCK, NFC_CNT_EN, NFC_CNT_PWD_PROT, AUTHLIM(3)
      0, // Reserved
      0, // Reserved
      0, // Reserved
    ]));
  }

  async unlock(): Promise<void> {
    await this.reader.write(0x83, Buffer.from([
      0b00000100, // MIRROR_CONF(2), MIRROR_BYTE(2), 0b0, STRG_MD_EN, 0b00
      0, // Reserved
      0x00, // MIRROR_PAGE(8)
      0xFF, // AUTH0
      0b00000000, // PROT, CFGLCK, NFC_CNT_EN, NFC_CNT_PWD_PROT, AUTHLIM(3)
      0, // Reserved
      0, // Reserved
      0, // Reserved
    ]));
  }

  async setPassword(password: Buffer): Promise<void> {
    if (password.length !== 4) throw new InvalidPasswordFormatError;
    await this.reader.write(0x85, password);
  }

  async setPak(pak: Buffer): Promise<void> {
    if (pak.length !== 2) throw new InvalidPakFormatError;
    await this.reader.write(0x86, Buffer.concat([
      pak,
      Buffer.from([0x00, 0x00]),
    ]));
  }
  
  async authenticate(password: Buffer, pak?: Buffer): Promise<void> {
    if (password.length !== 4) throw new InvalidPasswordFormatError;
    if (pak && pak.length !== 2) throw new InvalidPakFormatError;

    const cmd = Buffer.from([
      0xff, // Class
      0x00, // Direct Transmit (see ACR122U docs)
      0x00, // ...
      0x00, // ...
      0x07, // Length of Direct Transmit payload
      // Payload (7 bytes)
      0xd4, // Data Exchange Command (see PN533 docs)
      0x42, // InCommunicateThru
      0x1b, // PWD_AUTH
      ...password,
    ]);

    const response = await this.reader.transmit(cmd, 7) as Buffer;
    if (response.length < 5) throw new InvalidNfcResponseError;
    if (response[2] !== 0x00 || response.length < 7) throw new InvalidPasswordError;
    if (pak && !response.slice(3, 5).equals(pak)) throw new InvalidPakError;
  }
}