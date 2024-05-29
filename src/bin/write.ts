import fetch from 'cross-fetch';
import { config as loadEnv } from "dotenv";
import { CodeDayId, idListen } from "..";
import { sign } from 'jsonwebtoken';

const readline = require('node:readline');
const { stdin: input, stdout: output } = require('node:process');
const rl = readline.createInterface({ input, output });

loadEnv();

const ACCOUNT_SECRET = process.env.ACCOUNT_SECRET!;
const ID_TOKEN_PRIVATE_KEYID = process.env.ID_TOKEN_PRIVATE_KEYID!;
const ID_TOKEN_PRIVATE = process.env.ID_TOKEN_PRIVATE!;
const ID_NTAG_PASSWORD = Buffer.alloc(4);
ID_NTAG_PASSWORD.writeUInt32BE(Number(`0x${process.env.ID_NTAG_PASSWORD!}`));

async function verifyUsername(username: string): Promise<{ givenName: string, familyName: string}> {
	const query = `
		query {
			account {
				getUser(where:{username:"${username}"}) {
					givenName
					familyName
				}
			}
		}
	`;
	const token = sign({ scopes: `read:user:${username}` }, ACCOUNT_SECRET, { expiresIn: '3m' });

	const result = await fetch("https://graph.codeday.org/", {
		body: JSON.stringify({ query }),
		method: 'POST',
		headers: {
			'Content-type': 'application/json',
			'Authorization': `Bearer ${token}`
		},
	});
	const data = await result.json() as { data?: { account?: { getUser?: { givenName?: string, familyName?: string } } } };
	const { givenName, familyName } = data?.data?.account?.getUser || {};
	if (!givenName || !familyName) throw new Error(`Username ${username} not found.`);
	return { givenName, familyName };
}

async function onId(id: CodeDayId) {
	rl.question('CodeDay username -> ', async (username: string) => {
		const { givenName, familyName } = await verifyUsername(username);

		console.log(`Writing badge for ${givenName} ${familyName}:`);

		try {
			id.authenticate(ID_NTAG_PASSWORD);
			console.log("...logged in with write password.");
		} catch (ex) {}

		await id.writeCardData(givenName, familyName, username, ID_TOKEN_PRIVATE, ID_TOKEN_PRIVATE_KEYID);

		try {
			console.log("...locking card.");
			await id.lock();
		} catch (ex) { console.log("... unable to change card protection."); }

		console.log("...done!\n");
	});
}

idListen(onId, onId);