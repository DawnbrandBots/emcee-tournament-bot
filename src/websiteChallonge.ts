import { WebsiteInterface, WebsiteWrapper } from "./websiteGeneric";

class ChallongeWrapper implements WebsiteWrapper {}

const challonge = new ChallongeWrapper();
export const website = new WebsiteInterface(challonge);
