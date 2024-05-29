import { DateTime } from 'luxon';
import { CodeDayId, idListen } from '..';

idListen(
	async (id: CodeDayId) => {
			const { sub, uid, exp } = await id.getToken();
			console.log(`[VALID] ID #${uid} belongs to ${sub}, expires ${DateTime.fromSeconds(exp)}`);
	},
	() => console.log(`[INVALID] Invalid ID presented.`),
);
