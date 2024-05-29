import PCSC, { Reader } from '@tockawa/nfc-pcsc';
import { CodeDayId } from './CodeDayId';
import { InvalidTokenError, MissingTlvNdefError, MissingTokenError } from './errors';
export * from './errors';
export * from './CodeDayId';

const DEBUG = console.log; // TODO

export type OnIdDelegate = (card: CodeDayId) => any;

export function idListen(onId: OnIdDelegate, onInvalidId: OnIdDelegate) {
	const nfc = new PCSC();
	nfc.on("error", DEBUG);

	nfc.on("reader", async (reader: Reader) => {
		reader.on("error", DEBUG);
		reader.on("card", async (rawCard: { uid?: string }) => {
      const id = new CodeDayId(reader, rawCard);

      try {
        await id.getToken();
      } catch (ex) {
        if (ex instanceof MissingTlvNdefError || ex instanceof MissingTokenError || ex instanceof InvalidTokenError) {
          try {
            onInvalidId(id);
          } catch (ex) { console.error(ex); }
          return;
        } else throw ex;
      }

      try {
        onId(id);
      } catch (ex) { console.error(ex); }
    });
  });
}