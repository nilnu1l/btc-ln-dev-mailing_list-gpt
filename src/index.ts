// import { Ai } from '@cloudflare/ai';
import OpenAI from 'openai';
import * as PostalMime from 'postal-mime';
export interface Env {
	// If you set another name in wrangler.toml as the value for 'binding',
	// replace "AI" with the variable name you defined.
	AI: any;
	SRC_EMAIL: string;
	DST_EMAIL: string;
	OPENAI_API_KEY: string;
}

async function streamToArrayBuffer(stream, streamSize) {
	let result = new Uint8Array(streamSize);
	let bytesRead = 0;
	const reader = stream.getReader();
	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		result.set(value, bytesRead);
		bytesRead += value.length;
	}
	return result;
}

export default {
	async email(message, env, ctx) {
		const openai = new OpenAI({
			apiKey: env.OPENAI_API_KEY,
		});

		const uuid = await generateUUIDv4();
		console.log('uuid', uuid);

		const rawEmail = await streamToArrayBuffer(message.raw, message.rawSize);
		const parser = new PostalMime.default();
		const parsedEmail = await parser.parse(rawEmail);
		console.log('parsedEmail', parsedEmail.text);
		// if undefined, replace with empty string
		const messageBody = parsedEmail.text || '';

		const prompt = `${messageBody}`;
		const chatCompletion = await openai.chat.completions.create({
			messages: [
				{role: 'system', content: 'You are a professional translator of translations into Japanese.You are also familiar with Bitcoin and Lightninig network. Reply all in Japanese.'},
				{ role: 'user', content: prompt }
			],
			model: 'gpt-3.5-turbo',
		});
		console.log('chatCompletion', chatCompletion.choices);

		// const response = await ai.run('@cf/meta/m2m100-1.2b', {
		// let chat = {
		// 	messages: [
		// 		{
		// 			role: 'system',
		// 			content:
		// 				'You are a professional translator and also knowledgeable about Bitcoin and Lightning Network. Please create a Japanese summary from the given English text.',
		// 		},
		// 		{ role: 'user', content: prompt },
		// 	],
		// };
		// // response をresult に順次詰める
		// let result = '';
		// let response = await ai.run('@cf/meta/llama-2-7b-chat-int8', chat);
		// result += response.response;
		// console.log('summarized result', result);

		// while (response.response !== '') {
		// 	const additionalMessage = "continue the conversation, if you dont't have anything to say, please reposnd with empty message";
		// 	response = await ai.run('@cf/meta/llama-2-7b-chat-int8', additionalMessage);
		// 	result += response.response;
		// }
		// 得られた結果をParse してMessage をString に変えてKV に保管する
		const result = chatCompletion.choices.map((choice) => choice.message.content).join('\n');
		console.log('result', result);
		await env.LN_GPT_DEV.put(uuid, result);
		await message.forward(env.DST_EMAIL);
	},
};

async function generateUUIDv4(): Promise<string> {
	const data = new Uint8Array(16);
	await crypto.getRandomValues(data);
	data[6] = (data[6] & 0x0f) | 0x40;
	data[8] = (data[8] & 0x3f) | 0x80;
	return (
		data.subarray(0, 4).reduce((acc, value) => acc + value.toString(16).padStart(2, '0'), '') +
		'-' +
		data.subarray(4, 6).reduce((acc, value) => acc + value.toString(16).padStart(2, '0'), '') +
		'-' +
		data.subarray(6, 8).reduce((acc, value) => acc + value.toString(16).padStart(2, '0'), '') +
		'-' +
		data.subarray(8, 10).reduce((acc, value) => acc + value.toString(16).padStart(2, '0'), '') +
		'-' +
		data.subarray(10).reduce((acc, value) => acc + value.toString(16).padStart(2, '0'), '')
	);
}
