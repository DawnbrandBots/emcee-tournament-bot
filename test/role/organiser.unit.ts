import chai, { expect } from "chai";
import { Client, Guild, Role } from "discord.js";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import { OrganiserRoleProvider } from "../../src/role/organiser";

chai.use(sinonChai);

describe("OrganiserRoleProvider", function () {
	it("creates and caches roles", async function () {
		const role = new OrganiserRoleProvider("MC-TO");
		const mockBotClient = new Client({ intents: [] });
		const server = Reflect.construct(Guild, [mockBotClient, { id: "mock", unavailable: true }]);
		const createRoleStub = sinon.stub(server.roles, "create").resolves(
			Reflect.construct(Role, [
				mockBotClient,
				{
					id: "mock role",
					name: "mock role",
					color: 0,
					hoist: false,
					position: 0,
					permissions: "",
					managed: false,
					mentionable: false
				},
				server
			])
		);

		const result = await role.create(server);
		expect(result).to.equal("mock role");
		expect(createRoleStub).to.have.been.called;

		createRoleStub.resetHistory();
		const cached = await role.get(server);
		expect(cached).to.equal(result);
		expect(createRoleStub).to.not.have.been.called;
	});
	it("finds existing roles to cache", async function () {
		const role = new OrganiserRoleProvider("MC-TO");
		const mockBotClient = new Client({ intents: [] });
		const server = Reflect.construct(Guild, [mockBotClient, { id: "mock", unavailable: true }]);
		server.roles.cache.set(
			"existing mock role",
			Reflect.construct(Role, [
				mockBotClient,
				{
					id: "existing mock role",
					name: "MC-TO",
					color: 0,
					hoist: false,
					position: 0,
					permissions: "",
					managed: false,
					mentionable: false
				},
				server
			])
		);
		const createRoleStub = sinon.stub(server.roles, "create").resolves(
			Reflect.construct(Role, [
				mockBotClient,
				{
					id: "mock role",
					name: "",
					color: 0,
					hoist: false,
					position: 0,
					permissions: "",
					managed: false,
					mentionable: false
				},
				server
			])
		);

		const result = await role.get(server);
		expect(result).to.equal("existing mock role");
		expect(createRoleStub).to.not.have.been.called;
	});
	it("recreates roles", async function () {
		const role = new OrganiserRoleProvider("MC-TO");
		const mockBotClient = new Client({ intents: [] });
		const server = Reflect.construct(Guild, [mockBotClient, { id: "mock", unavailable: true }]);
		const createRoleStub = sinon.stub(server.roles, "create").resolves(
			Reflect.construct(Role, [
				mockBotClient,
				{
					id: "mock role",
					name: "",
					color: 0,
					hoist: false,
					position: 0,
					permissions: "",
					managed: false,
					mentionable: false
				},
				server
			])
		);

		const result = await role.get(server);
		expect(result).to.equal("mock role");
		expect(createRoleStub).to.have.been.called;
	});
	it("authorises hosts");
	it("rejects unauthorised hosts");
});
