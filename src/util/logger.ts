import { createLogger, format, transports } from "winston";

const consoleFormat = format.printf(info => {
	if (info.stack) {
		return `${info.timestamp} ${info.level}: ${info.message}\n${info.stack}`;
	} else {
		return `${info.timestamp} ${info.level}: ${info.message}`;
	}
});

const logger = createLogger({
	level: "verbose",
	format: format.combine(format.errors({ stack: true }), format.timestamp()),
	transports: [
		new transports.Console({
			level: "info",
			format: format.combine(format.colorize(), consoleFormat)
		}),
		new transports.File({
			filename: "logs/error.log",
			level: "error",
			format: consoleFormat
		}),
		new transports.File({
			filename: "logs/verbose.log",
			format: consoleFormat
		})
	]
});

export default logger;
