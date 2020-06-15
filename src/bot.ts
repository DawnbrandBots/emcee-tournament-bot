import Eris from "eris";
import { discordToken } from "./config/env";

export const bot = new Eris.Client(discordToken);
