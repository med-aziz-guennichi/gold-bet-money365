import type { Currency } from "./money";
export const roles = ["admin", "fournisseur", "client", "user"] as const;
export type Role = (typeof roles)[number];

export type AccountIdentity = {
	currency?: Currency;
	id: string;
	role: Role;
	parentId?: string | null;
	fournisseurId?: string | null;
	clientId?: string | null;
	banned?: boolean | null;
};

export function isRole(value: unknown): value is Role {
	return roles.some((role) => role === value);
}

export function canUseDashboard(role: unknown) {
	return role === "admin" || role === "fournisseur" || role === "client";
}

export function canManage(actor: AccountIdentity, target: AccountIdentity) {
	if (actor.banned || actor.id === target.id || target.role === "admin")
		return false;
	if (actor.role === "admin") return true;
	if (actor.role === "fournisseur") {
		return (
			(target.role === "client" || target.role === "user") &&
			target.fournisseurId === actor.id
		);
	}
	return (
		actor.role === "client" &&
		target.role === "user" &&
		target.clientId === actor.id
	);
}

/** Ownership fields always come from a validated parent, never request input. */
export function childOwnership(
	actor: AccountIdentity,
	parent: AccountIdentity,
	role: Role,
) {
	if (actor.banned || parent.banned) throw new Error("Account is disabled.");
	const expectedParent = {
		fournisseur: "admin",
		client: "fournisseur",
		user: "client",
	};
	if (role === "admin" || expectedParent[role] !== parent.role) {
		throw new Error("Invalid account hierarchy.");
	}
	if (actor.id !== parent.id && !canManage(actor, parent)) {
		throw new Error("You cannot create an account under this parent.");
	}
	return {
		parentId: parent.id,
		fournisseurId:
			role === "client"
				? parent.id
				: role === "user"
					? parent.fournisseurId
					: null,
		clientId: role === "user" ? parent.id : null,
	};
}

export function normalizePhone(value: string) {
	const compact = value.trim().replace(/[\s().-]/g, "");
	const international = compact.startsWith("00")
		? `+${compact.slice(2)}`
		: compact;
	const phone = /^\d{8}$/.test(international)
		? `+216${international}`
		: international;
	if (
		!/^\+[1-9]\d{7,14}$/.test(phone) ||
		(phone.startsWith("+216") && !/^\+216\d{8}$/.test(phone))
	) {
		throw new Error("Enter a valid phone number with country code.");
	}
	return phone;
}
