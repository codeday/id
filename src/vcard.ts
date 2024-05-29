export function createVcard(givenName: string, familyName: string, email?: string): string {
	return [
		'BEGIN:VCARD',
		'VERSION:2.1',
		`N:${familyName};${givenName};;;`,
		'ORG:CodeDay',
		...(email ? [`EMAIL:${email}`] : []),
		'END:VCARD'
	].join(`\n`);
}