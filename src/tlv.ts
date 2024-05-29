export function tlvBlockNdef(ndefContent: Uint8Array) {
	const ndefMagic = 0x03;
	const lengthMagic = 0xff;
	const endMagic = 0xfe;
	const lengthBytes = Buffer.alloc(2);
	lengthBytes.writeInt16BE(ndefContent.length);

	const totalLength = 5 + ndefContent.length;
	const nullBytes = 4 - (totalLength % 4);

	return Buffer.concat([
		Buffer.from([ndefMagic, lengthMagic]),
		lengthBytes,
		ndefContent,
		Buffer.from([endMagic]),
		Buffer.from(Array(nullBytes).fill(0x00)),
	]);
}
