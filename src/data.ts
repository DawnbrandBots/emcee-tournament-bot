import { YgoData } from "ygopro-data";
import cardOpts from "./config/cardOpts.json";
import dataOpts from "./config/dataOpts.json";
import transOpts from "./config/transOpts.json";
import { githubToken } from "./config/env";

export const data = new YgoData(cardOpts, transOpts, dataOpts, "../dbs/", githubToken);
