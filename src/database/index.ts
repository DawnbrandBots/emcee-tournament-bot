import { DatabaseInterface } from "./interface";
import { DatabaseWrapperMongoose } from "./mongoose";

const mongoose = new DatabaseWrapperMongoose();
export const database = new DatabaseInterface(mongoose);
