import { connect, connection } from "mongoose";
import { mongoDbUrl } from "../../config/env";
import logger from "../../logger";

connect(mongoDbUrl, {
	useCreateIndex: true,
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useFindAndModify: false
})
	.then(() => logger.info(`Connected to MongoDB at ${process.env.MONGODB_URL}`))
	.catch(logger.error);

process.on("SIGINT", () => {
	connection.close();
	process.exit(130);
});
process.on("SIGTERM", () => {
	connection.close();
	process.exit(130);
});

export * from "./tournament";
