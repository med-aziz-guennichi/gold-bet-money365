import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { MongoClient, ObjectId } from "mongodb";
import { aboveCreditThreshold, NotificationService } from "./notifications";
import { ensureAuthIndexes } from "./storage";
import { WalletService } from "./wallets";

test("80% threshold uses exact integer boundaries", () => {
	assert.equal(aboveCreditThreshold(100000, 80000), false);
	assert.equal(aboveCreditThreshold(100000, 80001), true);
	assert.equal(aboveCreditThreshold(0, 1), false);
});

test("transactional credit notifications, threshold reset and recipient isolation", {
	skip: process.env.RUN_AUTH_INTEGRATION !== "1",
}, async () => {
	// Explicit isolated local database; this test never touches production wallets.
	const connection = await new MongoClient(
		process.env.AUTH_TEST_DATABASE_URL ??
			"mongodb://127.0.0.1:27017/?replicaSet=goldbet-wallets",
		{ serverSelectionTimeoutMS: 5000 },
	).connect();
	const db = connection.db(
		`goldbet_notification_test_${randomUUID().replaceAll("-", "")}`,
	);
	try {
		await ensureAuthIndexes(db);
		const admin = new ObjectId();
		const supplier = new ObjectId();
		const other = new ObjectId();
		const client = new ObjectId();
		const user = new ObjectId();
		const now = new Date();
		await db.collection("user").insertMany(
			[
				{ _id: admin, name: "Admin", role: "admin" },
				{
					_id: supplier,
					name: "Supplier",
					role: "fournisseur",
					parentId: admin.toHexString(),
				},
				{
					_id: other,
					name: "Other supplier",
					role: "fournisseur",
					parentId: admin.toHexString(),
				},
				{
					_id: client,
					name: "Client",
					role: "client",
					parentId: supplier.toHexString(),
					fournisseurId: supplier.toHexString(),
				},
				{
					_id: user,
					name: "User",
					role: "user",
					parentId: client.toHexString(),
					clientId: client.toHexString(),
					fournisseurId: supplier.toHexString(),
				},
			].map((x) => ({
				...x,
				email: `${x._id.toHexString()}@test.invalid`,
				banned: false,
				createdAt: now,
				updatedAt: now,
			})),
		);
		await db
			.collection<{ _id: string; balanceMillimes: number; updatedAt: Date }>(
				"wallet",
			)
			.insertMany(
				[supplier, other, client, user].map((id) => ({
					_id: id.toHexString(),
					balanceMillimes: id === supplier ? 1000000 : 0,
					updatedAt: now,
				})),
			);
		const wallet = new WalletService(db, randomUUID() + randomUUID());
		const notifications = new NotificationService(db);
		const topup = (
			actor: ObjectId,
			target: ObjectId,
			amount: string,
			requestId = randomUUID(),
		) =>
			wallet.topUp(actor.toHexString(), {
				id: target.toHexString(),
				amount,
				requestId,
			});
		await topup(supplier, client, "100");
		await topup(client, user, "80");
		assert.equal(
			(await notifications.list(supplier.toHexString())).items.length,
			0,
		);
		const requestId = randomUUID();
		await topup(client, user, "0.001", requestId);
		await topup(client, user, "0.001", requestId);
		await topup(client, user, "1");
		assert.equal(
			(await notifications.list(supplier.toHexString())).items.length,
			1,
		);
		assert.equal(
			(await notifications.list(admin.toHexString())).items.length,
			3,
		);
		await topup(supplier, client, "100");
		await topup(client, user, "80");
		assert.equal(
			(await notifications.list(supplier.toHexString())).items.length,
			2,
		);
		assert.equal(
			(await notifications.list(other.toHexString())).items.length,
			0,
		);
		const adminNotice = (await notifications.list(admin.toHexString()))
			.items[0];
		assert.ok(adminNotice);
		await notifications.markRead(other.toHexString(), adminNotice.id);
		assert.equal((await notifications.list(admin.toHexString())).unread, 4);
		await notifications.markRead(admin.toHexString(), adminNotice.id);
		assert.equal((await notifications.list(admin.toHexString())).unread, 3);
		await assert.rejects(() => topup(client, user, "10000"));
		assert.equal(
			(await notifications.list(admin.toHexString())).items.length,
			4,
		);
	} finally {
		await db.dropDatabase();
		await connection.close();
	}
});
