import { WebsiteInterface } from "./interface";
import { WebsiteWrapperChallonge } from "./challonge";
import { challongeUsername, challongeToken } from "../config/env";

const challonge = new WebsiteWrapperChallonge(challongeUsername, challongeToken);
export const website = new WebsiteInterface(challonge);
