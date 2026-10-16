import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { test } from "node:test";
import { MongoClient } from "mongodb";
import { bootstrapAdmin } from "./bootstrap";
import { createAuthHttpHandler } from "./http";
import { createAuth } from "./index";
import { AccountManagement, ManagementError } from "./management";
import { createRateLimiter } from "./rate-limit";
import { activeAccount, ensureAuthIndexes, userCollection } from "./storage";

test("MongoDB authentication and isolated account hierarchies", {
	skip: process.env.RUN_AUTH_INTEGRATION !== "1",
}, async (t) => {
	loadEnvFile(new URL("../../../apps/server/.env", import.meta.url));
	const client = await new MongoClient(
		process.env.AUTH_TEST_DATABASE_URL ??
			process.env.DATABASE_URL ??
			"mongodb://127.0.0.1:27017",
		{ serverSelectionTimeoutMS: 5000 },
	).connect();
	const db = client.db(`goldbet_auth_test_${randomUUID().replaceAll("-", "")}`);
	try {
		await ensureAuthIndexes(db);
		const env = {
			BETTER_AUTH_URL: "http://localhost:3000",
			CORS_ORIGIN: "http://localhost:3001",
			BETTER_AUTH_SECRET: randomUUID() + randomUUID(),
		};
		const auth = createAuth(env, db);
		const management = new AccountManagement(auth, db, env.BETTER_AUTH_SECRET);
		const http = await createAuthHttpHandler(auth, db, env);
		const password = "Test-only-password-123!";
		await bootstrapAdmin(auth, db, {
			name: "Test admin",
			phoneNumber: "+21620000000",
			password,
		});
		const root = await userCollection(db).findOne({ role: "admin" });
		assert.ok(root);
		const admin = root._id.toHexString();
		const s1 = (
			await management.create(admin, {
				name: "Supplier One",
				phoneNumber: "+21620000001",
				password,
				role: "fournisseur",
				parentId: admin,
			})
		).id;
		const s2 = (
			await management.create(admin, {
				name: "Supplier Two",
				phoneNumber: "+21620000002",
				password,
				role: "fournisseur",
				parentId: admin,
			})
		).id;
		const c1 = (
			await management.create(s1, {
				name: "Client One",
				phoneNumber: "+21620000003",
				password,
				role: "client",
				parentId: s1,
			})
		).id;
		const c2 = (
			await management.create(s2, {
				name: "Client Two",
				phoneNumber: "+21620000004",
				password,
				role: "client",
				parentId: s2,
			})
		).id;
		const u1 = (
			await management.create(c1, {
				name: "User One",
				phoneNumber: "+21620000005",
				password,
				role: "user",
				parentId: c1,
			})
		).id;
		const u2 = (
			await management.create(c2, {
				name: "User Two",
				phoneNumber: "+21620000006",
				password,
				role: "user",
				parentId: c2,
			})
		).id;
		const login = (phoneNumber: string, secret = password, ip = "192.0.2.1") =>
			http(
				new Request(`${env.BETTER_AUTH_URL}/api/auth/sign-in/phone-number`, {
					method: "POST",
					headers: {
						"content-type": "application/json",
						origin: env.CORS_ORIGIN,
					},
					body: JSON.stringify({ phoneNumber, password: secret }),
				}),
				ip,
			);
		const forbidden = (error: unknown) =>
			error instanceof ManagementError && error.code === "FORBIDDEN";

		await t.test(
			"lists are filtered in the database for every role",
			async () => {
				const list = { page: 1, limit: 100 };
				assert.equal((await management.list(admin, list)).total, 7);
				assert.deepEqual(
					(await management.list(admin, { ...list, parentId: s1 })).items.map(
						(item) => item.id,
					),
					[c1],
				);
				assert.deepEqual(
					(await management.list(admin, { ...list, parentId: c1 })).items.map(
						(item) => item.id,
					),
					[u1],
				);
				assert.deepEqual(
					(await management.list(admin, { ...list, parentId: s2 })).items.map(
						(item) => item.id,
					),
					[c2],
				);
				assert.deepEqual(
					(await management.list(admin, { ...list, parentId: c2 })).items.map(
						(item) => item.id,
					),
					[u2],
				);
				assert.deepEqual(
					new Set(
						(await management.list(s1, list)).items.map((item) => item.id),
					),
					new Set([c1, u1]),
				);
				assert.deepEqual(
					(await management.list(c1, list)).items.map((item) => item.id),
					[u1],
				);
				assert.equal(
					(await management.list(s1, { ...list, parentId: c2 })).total,
					0,
				);
				await assert.rejects(management.list(u1, list), forbidden);
				await assert.rejects(management.requireManager(u1), forbidden);
			},
		);
		await t.test(
			"cross-branch writes and forged parents are rejected",
			async () => {
				await assert.rejects(
					management.update(s1, { id: c2, name: "Hacked" }),
					forbidden,
				);
				await assert.rejects(
					management.setDisabled(s1, { id: u2, disabled: true }),
					forbidden,
				);
				await assert.rejects(
					management.resetPassword(c1, { id: u2, password }),
					forbidden,
				);
				await assert.rejects(
					management.create(s1, {
						name: "Forged",
						phoneNumber: "+21620000007",
						password,
						role: "user",
						parentId: c2,
					}),
					forbidden,
				);
				await assert.rejects(
					management.create(c1, {
						name: "Escalated",
						phoneNumber: "+21620000008",
						password,
						role: "fournisseur",
						parentId: admin,
					}),
					forbidden,
				);
				await assert.rejects(
					management.setDisabled(admin, { id: admin, disabled: true }),
					forbidden,
				);
			},
		);
		await t.test(
			"duplicate phone identities are rejected and audit logs contain no credentials",
			async () => {
				await assert.rejects(
					management.create(c1, {
						name: "Duplicate",
						phoneNumber: "20 000 005",
						password,
						role: "user",
						parentId: c1,
					}),
					(error: unknown) =>
						error instanceof ManagementError && error.code === "CONFLICT",
				);
				const credentials = await db
					.collection("account")
					.findOne({ userId: root._id, providerId: "credential" });
				assert.ok(credentials && typeof credentials.password === "string");
				assert.notEqual(credentials.password, password);
				const audit = JSON.stringify(
					await db.collection("managementAudit").find().toArray(),
				);
				assert.equal(audit.includes(password), false);
				assert.equal(audit.includes("sessionToken"), false);
			},
		);

		await t.test(
			"public signup, admin APIs, OTP and email login are unreachable",
			async () => {
				for (const path of [
					"sign-up/email",
					"admin/create-user",
					"admin/set-role",
					"admin/impersonate-user",
					"phone-number/send-otp",
					"phone-number/verify",
					"sign-in/email",
					"update-user",
				]) {
					const response = await http(
						new Request(`${env.BETTER_AUTH_URL}/api/auth/${path}`, {
							method: "POST",
							headers: {
								origin: env.CORS_ORIGIN,
								"content-type": "application/json",
							},
							body: "{}",
						}),
						"192.0.2.2",
					);
					assert.equal(response.status, 404, path);
				}
				const badOrigin = await http(
					new Request(`${env.BETTER_AUTH_URL}/api/auth/sign-in/phone-number`, {
						method: "POST",
						headers: { origin: "https://attacker.invalid" },
						body: "{}",
					}),
					"192.0.2.2",
				);
				assert.equal(badOrigin.status, 403);
			},
		);
		await t.test(
			"phone/password login works without verification and uses HttpOnly cookies",
			async () => {
				const response = await login("20 000 005");
				assert.equal(response.status, 200, await response.clone().text());
				const cookies = response.headers.getSetCookie();
				assert.ok(
					cookies.some((cookie) => cookie.toLowerCase().includes("httponly")),
				);
				const session = await auth.api.getSession({
					headers: {
						cookie: cookies.map((cookie) => cookie.split(";")[0]).join("; "),
					},
				});
				assert.equal(session?.user.id, u1);
				assert.equal(session?.user.phoneNumberVerified, false);
				assert.equal(
					(await login("+21620000005", "wrong-password")).status,
					401,
				);
			},
		);
		await t.test(
			"suspending a supplier blocks descendants and revokes existing sessions",
			async () => {
				const response = await login("+21620000006");
				const cookie = response.headers
					.getSetCookie()
					.map((value) => value.split(";")[0])
					.join("; ");
				await management.setDisabled(admin, { id: s2, disabled: true });
				assert.equal(await activeAccount(db, u2), null);
				assert.equal(await activeAccount(db, c2), null);
				assert.equal(await auth.api.getSession({ headers: { cookie } }), null);
				assert.equal((await login("+21620000006")).status, 401);
				await management.setDisabled(admin, { id: s2, disabled: false });
				assert.ok(await activeAccount(db, u2));
				assert.equal(await auth.api.getSession({ headers: { cookie } }), null);
			},
		);
		await t.test(
			"password reset invalidates the old password and sessions",
			async () => {
				const response = await login("+21620000005", password, "192.0.2.5");
				const cookie = response.headers
					.getSetCookie()
					.map((value) => value.split(";")[0])
					.join("; ");
				await management.resetPassword(c1, {
					id: u1,
					password: "New-test-password-456!",
				});
				assert.equal(await auth.api.getSession({ headers: { cookie } }), null);
				assert.equal(
					(await login("+21620000005", password, "192.0.2.5")).status,
					401,
				);
				assert.equal(
					(await login("+21620000005", "New-test-password-456!", "192.0.2.5"))
						.status,
					200,
				);
			},
		);
		await t.test(
			"atomic shared limits cannot be bypassed by parallel requests",
			async () => {
				const consume = createRateLimiter(db, env.BETTER_AUTH_SECRET);
				const results = await Promise.all(
					Array.from({ length: 20 }, () =>
						consume("parallel-test", { window: 60, max: 5 }),
					),
				);
				assert.equal(results.filter((result) => result.allowed).length, 5);
				for (let attempt = 0; attempt < 10; attempt++)
					assert.equal(
						(
							await login(
								"+21629999999",
								"bad-password",
								`198.51.100.${attempt + 1}`,
							)
						).status,
						401,
					);
				const blocked = await login(
					"+21629999999",
					"bad-password",
					"198.51.100.99",
				);
				assert.equal(blocked.status, 429);
				assert.ok(blocked.headers.get("retry-after"));
			},
		);
		await t.test(
			"bootstrap is idempotent and never resets an existing password",
			async () => {
				assert.deepEqual(
					await bootstrapAdmin(auth, db, {
						name: "Test admin",
						phoneNumber: "+21620000000",
						password: "Should-not-replace-123!",
					}),
					{ created: false },
				);
				await assert.rejects(
					bootstrapAdmin(auth, db, {
						name: "Second admin",
						phoneNumber: "+21620000009",
						password,
					}),
				);
				assert.equal(
					(await login("+21620000000", password, "203.0.113.1")).status,
					200,
				);
			},
		);
		await t.test(
			"wallet funding is atomic, precise, and idempotent through the hierarchy",
			async () => {
				const requestId = randomUUID();
				await management.topUp(admin, { id: s1, amount: "100000", requestId });
				await management.topUp(admin, {
					id: s1,
					amount: "100000.000",
					requestId,
				});
				assert.equal(
					(await management.wallet(s1)).balanceMillimes,
					100_000_000,
				);
				await assert.rejects(
					management.topUp(admin, { id: s1, amount: "1", requestId }),
					(error: unknown) =>
						error instanceof ManagementError && error.code === "CONFLICT",
				);
				const creation = {
					name: "Funded client",
					phoneNumber: "+21620000010",
					password,
					role: "client" as const,
					parentId: s1,
					initialAmount: "5000.125",
					requestId: randomUUID(),
				};
				const fundedClient = (await management.create(s1, creation)).id;
				assert.equal((await management.create(s1, creation)).id, fundedClient);
				const fundedUser = (
					await management.create(fundedClient, {
						name: "Funded user",
						phoneNumber: "+21620000011",
						password,
						role: "user",
						parentId: fundedClient,
						initialAmount: "1000.001",
						requestId: randomUUID(),
					})
				).id;
				assert.equal((await management.wallet(s1)).balanceMillimes, 94_999_875);
				assert.equal(
					(await management.wallet(fundedClient)).balanceMillimes,
					4_000_124,
				);
				assert.equal(
					(await management.wallet(fundedUser)).balanceMillimes,
					1_000_001,
				);
				const topUp = {
					id: fundedClient,
					amount: "500.001",
					requestId: randomUUID(),
				};
				await Promise.all([
					management.topUp(s1, topUp),
					management.topUp(s1, topUp),
				]);
				assert.equal((await management.wallet(s1)).balanceMillimes, 94_499_874);
				assert.equal(
					(await management.wallet(fundedClient)).balanceMillimes,
					4_500_125,
				);
				assert.equal(
					await db
						.collection<{ _id: string }>("walletTransfer")
						.countDocuments({ _id: `${s1}:${topUp.requestId}` }),
					1,
				);
				// Failure after debiting the source must roll the source debit back.
				await db
					.collection<{ _id: string; balanceMillimes: number }>("wallet")
					.updateOne(
						{ _id: fundedClient },
						{ $set: { balanceMillimes: 1_000_000_000_000 } },
					);
				const before = (await management.wallet(s1)).balanceMillimes;
				await assert.rejects(
					management.topUp(s1, {
						id: fundedClient,
						amount: "0.001",
						requestId: randomUUID(),
					}),
				);
				assert.equal((await management.wallet(s1)).balanceMillimes, before);
				await db
					.collection<{ _id: string; balanceMillimes: number }>("wallet")
					.updateOne(
						{ _id: fundedClient },
						{ $set: { balanceMillimes: 4_500_125 } },
					);
				// An unfunded account creation must leave no login, wallet, or transfer behind.
				await assert.rejects(
					management.create(fundedClient, {
						name: "Cannot afford",
						phoneNumber: "+21620000012",
						password,
						role: "user",
						parentId: fundedClient,
						initialAmount: "999999",
						requestId: randomUUID(),
					}),
				);
				assert.equal(
					await userCollection(db).findOne({ phoneNumber: "+21620000012" }),
					null,
				);
				assert.equal(
					(await management.wallet(fundedClient)).balanceMillimes,
					4_500_125,
				);
				// Concurrent spending cannot overdraw a wallet.
				await management.topUp(s1, {
					id: c1,
					amount: "10",
					requestId: randomUUID(),
				});
				const raceUser = (
					await management.create(c1, {
						name: "Race user",
						phoneNumber: "+21620000013",
						password,
						role: "user",
						parentId: c1,
						requestId: randomUUID(),
					})
				).id;
				const results = await Promise.allSettled([
					management.topUp(c1, {
						id: u1,
						amount: "7",
						requestId: randomUUID(),
					}),
					management.topUp(c1, {
						id: raceUser,
						amount: "7",
						requestId: randomUUID(),
					}),
				]);
				assert.equal(
					results.filter((result) => result.status === "fulfilled").length,
					1,
				);
				assert.equal((await management.wallet(c1)).balanceMillimes, 3_000);
				assert.equal(
					(await management.wallet(u1)).balanceMillimes +
						(await management.wallet(raceUser)).balanceMillimes,
					7_000,
				);
				await assert.rejects(
					management.topUp(s1, {
						id: u2,
						amount: "1",
						requestId: randomUUID(),
					}),
					forbidden,
				);
				await assert.rejects(
					management.walletHistory(s1, { accountId: c2, page: 1, limit: 10 }),
					forbidden,
				);
				await assert.rejects(
					management.topUp(u1, {
						id: raceUser,
						amount: "1",
						requestId: randomUUID(),
					}),
					forbidden,
				);
				await assert.rejects(
					management.topUp(admin, {
						id: s1,
						amount: "-1",
						requestId: randomUUID(),
					}),
				);
				await assert.rejects(
					management.topUp(admin, {
						id: s1,
						amount: "0",
						requestId: randomUUID(),
					}),
				);
				const history = await management.walletHistory(admin, {
					accountId: fundedClient,
					page: 1,
					limit: 20,
				});
				assert.equal(history.total, 3);
				assert.equal(JSON.stringify(history).includes(password), false);
				assert.equal(JSON.stringify(history).includes("fingerprint"), false);
				const listed = await management.list(s1, { page: 1, limit: 100 });
				assert.equal(
					listed.items.find((item) => item.id === fundedClient)
						?.balanceMillimes,
					4_500_125,
				);
			},
		);
		await t.test(
			"standalone MongoDB refuses funded creation without changing accounts",
			async (subtest) => {
				const standalone = await new MongoClient(
					process.env.DATABASE_URL ?? "mongodb://127.0.0.1:27017",
					{ serverSelectionTimeoutMS: 5000 },
				).connect();
				const testDb = standalone.db(
					`goldbet_standalone_test_${randomUUID().replaceAll("-", "")}`,
				);
				try {
					if ((await standalone.db().command({ hello: 1 })).setName) {
						subtest.skip("Primary database already supports transactions");
						return;
					}
					await ensureAuthIndexes(testDb);
					const testAuth = createAuth(env, testDb);
					await bootstrapAdmin(testAuth, testDb, {
						name: "Standalone admin",
						phoneNumber: "+21621000000",
						password,
					});
					const adminDoc = await userCollection(testDb).findOne({
						role: "admin",
					});
					assert.ok(adminDoc);
					const testManagement = new AccountManagement(
						testAuth,
						testDb,
						env.BETTER_AUTH_SECRET,
					);
					await assert.rejects(
						testManagement.create(adminDoc._id.toHexString(), {
							name: "Must not exist",
							phoneNumber: "+21621000001",
							password,
							role: "fournisseur",
							parentId: adminDoc._id.toHexString(),
							initialAmount: "100000",
							requestId: randomUUID(),
						}),
						(error: unknown) =>
							error instanceof ManagementError &&
							error.code === "SERVICE_UNAVAILABLE",
					);
					assert.equal(await userCollection(testDb).countDocuments({}), 1);
					assert.equal(
						await testDb.collection("walletTransfer").countDocuments({}),
						0,
					);
					assert.equal(await testDb.collection("wallet").countDocuments({}), 0);
				} finally {
					assert.ok(testDb.databaseName.startsWith("goldbet_standalone_test_"));
					await testDb.dropDatabase();
					await standalone.close();
				}
			},
		);
	} finally {
		// This database was created above with a random test-only name.
		assert.ok(db.databaseName.startsWith("goldbet_auth_test_"));
		await db.dropDatabase();
		await client.close();
	}
});
