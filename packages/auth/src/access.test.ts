import assert from "node:assert/strict";
import { test } from "node:test";
import {
	type AccountIdentity,
	canManage,
	canUseDashboard,
	childOwnership,
	normalizePhone,
} from "./access";

const admin: AccountIdentity = { id: "admin", role: "admin" };
const supplier1: AccountIdentity = {
	id: "supplier1",
	role: "fournisseur",
	parentId: admin.id,
};
const supplier2: AccountIdentity = {
	id: "supplier2",
	role: "fournisseur",
	parentId: admin.id,
};
const client1: AccountIdentity = {
	id: "client1",
	role: "client",
	parentId: supplier1.id,
	fournisseurId: supplier1.id,
};
const client2: AccountIdentity = {
	id: "client2",
	role: "client",
	parentId: supplier2.id,
	fournisseurId: supplier2.id,
};
const user1: AccountIdentity = {
	id: "user1",
	role: "user",
	parentId: client1.id,
	fournisseurId: supplier1.id,
	clientId: client1.id,
};

test("role matrix denies other branches, self management, and upward management", () => {
	assert.equal(canManage(admin, supplier1), true);
	assert.equal(canManage(admin, user1), true);
	assert.equal(canManage(supplier1, client1), true);
	assert.equal(canManage(supplier1, user1), true);
	assert.equal(canManage(supplier1, client2), false);
	assert.equal(canManage(supplier2, user1), false);
	assert.equal(canManage(client1, user1), true);
	assert.equal(canManage(client2, user1), false);
	assert.equal(canManage(client1, supplier1), false);
	assert.equal(canManage(user1, client1), false);
	assert.equal(canManage(admin, admin), false);
	assert.equal(canManage({ ...supplier1, banned: true }, client1), false);
	assert.equal(canUseDashboard("user"), false);
	assert.equal(canUseDashboard("admin,user"), false);
	assert.equal(canUseDashboard("fournisseur"), true);
});

test("derives ownership and refuses cross-branch or invalid parents", () => {
	assert.deepEqual(childOwnership(supplier1, client1, "user"), {
		parentId: client1.id,
		fournisseurId: supplier1.id,
		clientId: client1.id,
	});
	assert.throws(() => childOwnership(supplier1, client2, "user"));
	assert.throws(() => childOwnership(client1, client2, "user"));
	assert.throws(() => childOwnership(user1, user1, "user"));
	assert.throws(() => childOwnership(supplier1, supplier1, "fournisseur"));
	assert.throws(() => childOwnership(admin, admin, "admin"));
});

test("phone variants normalize to one identity", () => {
	assert.equal(normalizePhone("20 123 456"), "+21620123456");
	assert.equal(normalizePhone("00216 20 123 456"), "+21620123456");
	assert.equal(normalizePhone("+216 (20) 123-456"), "+21620123456");
	for (const invalid of [
		"+216",
		"2012345",
		"+216201234560",
		"admin",
		"+00000000",
	])
		assert.throws(() => normalizePhone(invalid));
});
