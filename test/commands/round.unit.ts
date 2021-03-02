import command from "../../src/commands/round";
import { itRejectsNonHosts, msg, support } from "./common";

describe("command:round", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
});
