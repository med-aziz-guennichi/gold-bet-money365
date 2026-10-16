import type { Database } from "@gold-bet-clean-money365/db";
import { ObjectId } from "mongodb";
import { normalizePhone } from "./access";
import type { Auth } from "./index";
import { userCollection } from "./storage";

/** Explicit local bootstrap; never promotes an existing account or resets a password. */
export async function bootstrapAdmin(
	auth: Auth,
	db: Database,
	input: { name: string; phoneNumber: string; password: string },
) {
	const phoneNumber = normalizePhone(input.phoneNumber);
	if (
		input.name.trim().length < 2 ||
		input.name.length > 100 ||
		input.password.length < 12 ||
		input.password.length > 128
	)
		throw new Error("Invalid bootstrap credentials.");
	const existing = await userCollection(db).findOne({ phoneNumber });
	if (existing) {
		if (existing.role !== "admin" || existing.parentId || existing.banned)
			throw new Error(
				"Phone number belongs to an existing account. No changes were made.",
			);
		return { created: false };
	}
	if (await userCollection(db).findOne({ role: "admin" }))
		throw new Error(
			"An administrator already exists. Bootstrap will not create another.",
		);
	// Persistent unique lock prevents simultaneous bootstrap processes from making two admins.
	await db
		.collection<{ _id: string; createdAt: Date }>("bootstrapLock")
		.insertOne({ _id: "initial-admin", createdAt: new Date() });
	const result = await auth.api.createUser({
		body: {
			email: `${phoneNumber.slice(1)}@accounts.invalid`,
			name: input.name.trim(),
			password: input.password,
			role: "admin",
			data: { phoneNumber, phoneNumberVerified: false, banned: true },
		},
	});
	await db.collection("managementAudit").insertOne({
		actorId: "bootstrap",
		action: "admin.bootstrap",
		targetId: result.user.id,
		createdAt: new Date(),
	});
	await userCollection(db).updateOne(
		{ _id: new ObjectId(result.user.id) },
		{ $set: { banned: false, updatedAt: new Date() } },
	);
	return { created: true };
}
