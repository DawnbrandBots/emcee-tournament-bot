import { DatabaseInterface, DatabaseWrapper } from "./databaseGeneric";

class MongooseWrapper implements DatabaseWrapper {}

const mongoose = new MongooseWrapper();
export const database = new DatabaseInterface(mongoose);
