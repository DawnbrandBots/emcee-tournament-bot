import { connect } from "mongoose";
import logger from "../../util/logger";

export async function initializeConnection(mongoDbUrl: string): Promise<void> {
	await connect(mongoDbUrl, {
		useCreateIndex: true,
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false
	});
	logger.info(`Connected to MongoDB via Mongoose`);
}

// process.on("SIGINT", () => {
// 	connection.close();
// 	process.exit(130);
// });
// process.on("SIGTERM", () => {
// 	connection.close();
// 	process.exit(130);
// });

export * from "./tournament";
