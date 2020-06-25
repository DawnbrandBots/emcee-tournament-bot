import { createLogger, format, transports } from "winston";

const logger = createLogger({
	level: "info",
	format: format.combine(format.json(), format.timestamp()),
	defaultMeta: { service: "user-service" },
	transports: [
		new transports.File({ filename: "logs/error.log", level: "error" }),
		new transports.Console({ level: "error", format: format.combine(format.errors(), format.timestamp()) }),
		new transports.Console({ level: "info", format: format.combine(format.simple(), format.timestamp()) }),
		new transports.File({ filename: "logs/verbose.log" })
	]
});

export default logger;
