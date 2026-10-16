import type { Database } from "@gold-bet-clean-money365/db";
import { type ClientSession, ObjectId } from "mongodb";
import { type AccountIdentity, isRole } from "./access";

export { type ClientSession, ObjectId } from "mongodb";

export type AccountDocument = {
	_id: ObjectId;
	email?: string;
	emailVerified?: boolean;
	walletGuard?: number;
	name: string;
	phoneNumber?: string;
	phoneNumberVerified?: boolean;
	role?: string;
	parentId?: string | null;
	fournisseurId?: string | null;
	clientId?: string | null;
	banned?: boolean | null;
	createdAt: Date;
	updatedAt: Date;
};

export function userCollection(db: Database) {
	return db.collection<AccountDocument>("user");
}

export async function findAccount(
	db: Database,
	id: string,
	session?: ClientSession,
) {
	if (!/^[a-f\d]{24}$/i.test(id)) return null;
	const user = await userCollection(db).findOne(
		{ _id: new ObjectId(id) },
		{ session },
	);
	if (!user || !isRole(user.role)) return null;
	return { ...user, id: user._id.toHexString(), role: user.role };
}

/** Check every ancestor on each authenticated request, without a claims cache. */
export async function activeAccount(
	db: Database,
	id: string,
	session?: ClientSession,
): Promise<AccountIdentity | null> {
	const account = await findAccount(db, id, session);
	if (!account || account.banned) return null;
	let current = account;
	const seen = new Set<string>();
	for (let depth = 0; depth < 4; depth++) {
		if (seen.has(current.id) || current.banned) return null;
		seen.add(current.id);
		if (current.role === "admin") return current.parentId ? null : account;
		if (!current.parentId) return null;
		const parent = await findAccount(db, current.parentId, session);
		if (!parent) return null;
		if (
			current.role === "user" &&
			(parent.role !== "client" ||
				current.clientId !== parent.id ||
				current.fournisseurId !== parent.fournisseurId)
		)
			return null;
		if (
			current.role === "client" &&
			(parent.role !== "fournisseur" || current.fournisseurId !== parent.id)
		)
			return null;
		if (current.role === "fournisseur" && parent.role !== "admin") return null;
		current = parent;
	}
	return null;
}

export async function ensureAuthIndexes(db: Database) {
	await Promise.all([
		db
			.collection("notification")
			.createIndex({ userId: 1, createdAt: -1, _id: -1 }),
		db.collection("notification").createIndex({ userId: 1, readAt: 1 }),
		db
			.collection("bet")
			.createIndex({ userId: 1, requestId: 1 }, { unique: true }),
		db.collection("bet").createIndex({ userId: 1, createdAt: -1 }),
		db.collection("bet").createIndex({ userId: 1, status: 1, createdAt: -1 }),
		db.collection("bet").createIndex({ status: 1, checkedAt: 1, createdAt: 1 }),
		db.collection("walletTransfer").createIndex({ targetId: 1, createdAt: -1 }),
		db.collection("walletTransfer").createIndex({ sourceId: 1, createdAt: -1 }),
		db.collection("walletTransfer").createIndex({ actorId: 1, createdAt: -1 }),
		userCollection(db).createIndex({ email: 1 }, { unique: true }),
		userCollection(db).createIndex(
			{ phoneNumber: 1 },
			{
				unique: true,
				partialFilterExpression: { phoneNumber: { $type: "string" } },
				name: "unique_phone_number",
			},
		),
		userCollection(db).createIndex({ fournisseurId: 1, createdAt: -1 }),
		userCollection(db).createIndex({ clientId: 1, createdAt: -1 }),
		userCollection(db).createIndex({ parentId: 1 }),
		db
			.collection("securityRateLimit")
			.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
		db.collection("session").createIndex({ token: 1 }, { unique: true }),
		db.collection("session").createIndex({ userId: 1 }),
		db
			.collection("session")
			.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
		db.collection("account").createIndex({ userId: 1 }),
		db
			.collection("account")
			.createIndex({ providerId: 1, accountId: 1 }, { unique: true }),
		db.collection("managementAudit").createIndex({ actorId: 1, createdAt: -1 }),
	]);
}
