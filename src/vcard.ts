export function createVcard(givenName: string, familyName: string, username: string): string {
	return [
		'BEGIN:VCARD',
		'VERSION:2.1',
		`N:${familyName};${givenName};;;`,
		'ORG:CodeDay',
		`EMAIL:${username}@codeday.org`,
		'END:VCARD'
	].join(`\n`);
}