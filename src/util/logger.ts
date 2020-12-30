import debug from "debug";

const global = debug("emcee");

export interface Logger {
	error: debug.Debugger;
	warn: debug.Debugger;
	info: debug.Debugger;
	verbose: debug.Debugger;
}

export function getLogger(namespace: string): Logger {
	return {
		error: global.extend(`error:${namespace}`),
		warn: global.extend(`warn:${namespace}`),
		info: global.extend(`info:${namespace}`),
		verbose: global.extend(`verbose:${namespace}`)
	};
}
