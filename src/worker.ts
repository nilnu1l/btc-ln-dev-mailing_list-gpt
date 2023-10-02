import { Ai } from '@cloudflare/ai';

export interface Env {
	// If you set another name in wrangler.toml as the value for 'binding',
	// replace "AI" with the variable name you defined.
	AI: any;
	SRC_EMAIL: string;
	DST_EMAIL: string;
}

export default {
	async email(message, env, ctx) {
		const allowList = [env.SRC_EMAIL];
		if (allowList.indexOf(message.from) == -1) {
			message.setReject('Address not allowed');
		} else {
			console.log('ctx', ctx);
			const ai = new Ai(env.AI);

			const response = await ai.run('@cf/meta/m2m100-1.2b', {
				text: "test email workers. for translate.",
				source_lang: 'english', // defaults to english
				target_lang: 'japanese',
			});
			console.log('response', response);
			await message.forward(env.DST_EMAIL);
		}
	},
};
