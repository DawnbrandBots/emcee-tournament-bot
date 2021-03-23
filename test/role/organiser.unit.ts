import chai, { expect } from "chai";
import { Client, Guild, Role } from "eris";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import { OrganiserRoleProvider } from "../../src/role/organiser";

chai.use(sinonChai);

describe("OrganiserRoleProvider", function () {
	it("creates and caches roles", async function () {
		const role = new OrganiserRoleProvider("MC-TO");
		const server = new Guild({ id: "mock" }, new Client("mock"));
		const createRoleStub = sinon.stub(server, "createRole").resolves(new Role({ id: "mock role" }, server));

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
		const server = new Guild({ id: "mock" }, new Client("mock"));
		server.roles.add(new Role({ id: "existing mock role", name: "MC-TO" }, server));
		const createRoleStub = sinon.stub(server, "createRole").resolves(new Role({ id: "mock role" }, server));

		const result = await role.get(server);
		expect(result).to.equal("existing mock role");
		expect(createRoleStub).to.not.have.been.called;
	});
	it("recreates roles", async function () {
		const role = new OrganiserRoleProvider("MC-TO");
		const server = new Guild({ id: "mock" }, new Client("mock"));
		const createRoleStub = sinon.stub(server, "createRole").resolves(new Role({ id: "mock role" }, server));

		const result = await role.get(server);
		expect(result).to.equal("mock role");
		expect(createRoleStub).to.have.been.called;
	});
	it("authorises hosts");
	it("rejects unauthorised hosts");
});
