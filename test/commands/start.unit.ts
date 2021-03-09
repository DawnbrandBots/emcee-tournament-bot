import command from "../../src/commands/start";
import { itRejectsNonHosts, msg, support } from "./common";

describe("command:start", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
});
