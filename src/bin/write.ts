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
const STAFF_ROLES = ['rol_llN0357VXrEoIxoj', 'rol_H5SU2E05hXd2m9pJ', 'rol_6t902YZpsOynmWDt', 'rol_7zRnXs2PxtVA0ur2', 'rol_Z10C6Hfr4bfqYa4r', 'rol_kQxfFcpISf1SyqPw'];

async function verifyUsername(username: string): Promise<{ givenName: string, familyName: string, hasEmail: boolean }> {
	const query = `
		query {
			account {
				getUser(where:{username:"${username}"}) {
					givenName
					familyName
					roles { id }
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
	const data = await result.json() as { data?: { account?: { getUser?: { givenName?: string, familyName?: string, roles?: { id: string }[] } } } };
	const { givenName, familyName, roles } = data?.data?.account?.getUser || {};
	if (!givenName || !familyName) throw new Error(`Username ${username} not found.`);
	const hasEmail = !!(roles || []).find(r => STAFF_ROLES.includes(r.id));
	return { givenName, familyName, hasEmail };
}

async function onId(id: CodeDayId) {
	rl.question('CodeDay username -> ', async (username: string) => {
		const { givenName, familyName, hasEmail } = await verifyUsername(username);

		console.log(`Writing badge for ${givenName} ${familyName} (${username}${hasEmail ? '@codeday.org' : ''}):`);
		const isLocked = await id.getIsLocked();

		if (isLocked) {
			console.log("...logging in.");
			await id.authenticate(ID_NTAG_PASSWORD);
		}

		console.log("...writing data.");
		await id.writeCardData(
			{
				givenName,
				familyName,
				username,
				privateKey: ID_TOKEN_PRIVATE,
				privateKeyId: ID_TOKEN_PRIVATE_KEYID,
				hasEmail,
			}
		);

		if (!isLocked) {
			try {
				console.log("...changing password.");
				await id.setPassword(ID_NTAG_PASSWORD);
				console.log("...locking card.");
				await id.lock();
			} catch (ex) { console.log("... !! unable to change card protection."); }
		}

		console.log("...done!\n");
	});
}

idListen(onId, onId);