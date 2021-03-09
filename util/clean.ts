import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const user = process.env.CHALLONGE_USERNAME;
const token = process.env.CHALLONGE_TOKEN;

function url(id: string): string {
	return `https://${user}:${token}@api.challonge.com/v1/tournaments/${id}.json`;
}

async function destroy(id: string): Promise<void> {
	const response = await fetch(url(id), {
		method: "DELETE",
		headers: { "Content-Type": "application/json" }
	});
	if (!response.ok) {
		throw new Error(response.statusText);
	}
}

async function go(): Promise<void> {
	const list = process.argv.slice(2); // first two args are "~/ts-node" and "~/clean.ts"
	for (const id of list) {
		await destroy(id);
	}
}

go().catch(console.error);
