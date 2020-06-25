import { connect, connection } from "mongoose";
import { mongoDbUrl } from "../config/env";
import logger from "../logger";

connect(mongoDbUrl, { useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true })
	.then(() =>
		logger.log({
			level: "info",
			message: `Connected to MongoDB at${process.env.MONGODB_URL}`
		})
	)
	.catch(e => {
		logger.log({
			level: "error",
			message: e.message,
			meta: [e.stack]
		});
	});

process.on("SIGINT", () => {
	connection.close();
	process.exit(130);
});
process.on("SIGTERM", () => {
	connection.close();
	process.exit(130);
});

export * from "./tournament";
