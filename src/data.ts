import { YgoData } from "ygopro-data";
import cardOpts from "./config/cardOpts.json";
import dataOpts from "./config/dataOpts.json";
import transOpts from "./config/transOpts.json";
import { octokitToken } from "./config/env";

export const data = new YgoData(cardOpts, transOpts, dataOpts, "./dbs", octokitToken);
