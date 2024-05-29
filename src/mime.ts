import ndef from '@taptrack/ndef';

export type MimeRecord = { type: Uint8Array, payload: Uint16Array, id?: Uint8Array };
export type MimeRecordText = { type: string, payload: string };

export function mimeRecordDecode ({ type, payload }: MimeRecord): MimeRecordText {
	return {
		type: new TextDecoder().decode(type),
		payload: new TextDecoder().decode(payload),
	};
}

export function mimeRecordEncode(type: string, payload: string) {
	return new ndef.Record(
		false,
		new Uint8Array([0x02]),
		new TextEncoder().encode(type),
		new Uint8Array([]),
		new TextEncoder().encode(payload)
	);
}

export function mimeRecordFind (records: MimeRecord[], mime: string) {
	const textRecords = records.map(mimeRecordDecode);
	return textRecords.find(r => r.type === mime)?.payload || undefined;
}