import command from "../../src/commands/forcedrop";
import { itRejectsNonHosts, msg, support } from "./common";

describe("command:forcedrop", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
});
