import { connect, connection } from "mongoose";
import { mongoDbUrl } from "../config/env";

connect(mongoDbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
	.then(() => console.log("Connected to MongoDB at", process.env.MONGODB_URL))
	.catch(console.error);

process.on("SIGINT", () => connection.close());
process.on("SIGTERM", () => connection.close());

export * from "./tournament";
