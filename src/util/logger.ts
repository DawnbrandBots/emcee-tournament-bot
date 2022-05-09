import util from "util";
import debug, { Debug } from "debug";
import { WebhookClient } from "discord.js";

const global = debug("emcee");

const webhook = process.env.EMCEE_LOGGER_WEBHOOK ? new WebhookClient({ url: process.env.EMCEE_LOGGER_WEBHOOK }) : null;

function withWebhook(log: debug.Debugger): Debug["log"] {
	if (webhook) {
		return function (...args: Parameters<debug.Debugger>) {
			log(...args);
			webhook
				.send({
					username: log.namespace,
					content: util.format(...args)
				})
				.catch(error => {
					log("Failed to notify webhook.", error);
				});
		};
	} else {
		return log;
	}
}

export interface Logger {
	error: Debug["log"];
	warn: Debug["log"];
	notify: Debug["log"];
	info: Debug["log"];
	verbose: Debug["log"];
}

export function getLogger(namespace: string): Logger {
	return {
		error: withWebhook(global.extend(`error:${namespace}`)),
		warn: withWebhook(global.extend(`warn:${namespace}`)),
		notify: withWebhook(global.extend(`notify:${namespace}`)),
		info: global.extend(`info:${namespace}`),
		verbose: global.extend(`verbose:${namespace}`)
	};
}
