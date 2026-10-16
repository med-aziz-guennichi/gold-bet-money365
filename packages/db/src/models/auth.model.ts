import mongoose from "mongoose";

const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;

const userSchema = new Schema(
	{
		_id: { type: ObjectId, auto: true },
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		emailVerified: { type: Boolean, required: true, default: false },
		image: { type: String },
		phoneNumber: { type: String },
		phoneNumberVerified: { type: Boolean, default: false },
		role: {
			type: String,
			enum: ["admin", "fournisseur", "client", "user"],
			default: "user",
		},
		parentId: { type: String },
		fournisseurId: { type: String },
		clientId: { type: String },
		banned: { type: Boolean, default: false },
		banReason: { type: String },
		banExpires: { type: Date },
		createdAt: { type: Date, required: true, default: Date.now },
		updatedAt: { type: Date, required: true, default: Date.now },
	},
	{ collection: "user" },
);

userSchema.index(
	{ phoneNumber: 1 },
	{
		unique: true,
		partialFilterExpression: { phoneNumber: { $type: "string" } },
		name: "unique_phone_number",
	},
);
userSchema.index({ fournisseurId: 1, createdAt: -1 });
userSchema.index({ clientId: 1, createdAt: -1 });
userSchema.index({ parentId: 1 });

const sessionSchema = new Schema(
	{
		_id: { type: ObjectId, auto: true },
		expiresAt: { type: Date, required: true },
		token: { type: String, required: true, unique: true },
		createdAt: { type: Date, required: true, default: Date.now },
		updatedAt: { type: Date, required: true, default: Date.now },
		ipAddress: { type: String },
		userAgent: { type: String },
		userId: { type: ObjectId, ref: "User", required: true },
	},
	{ collection: "session" },
);
sessionSchema.index({ userId: 1 });

const accountSchema = new Schema(
	{
		_id: { type: ObjectId, auto: true },
		accountId: { type: String, required: true },
		providerId: { type: String, required: true },
		userId: { type: ObjectId, ref: "User", required: true },
		accessToken: { type: String },
		refreshToken: { type: String },
		idToken: { type: String },
		accessTokenExpiresAt: { type: Date },
		refreshTokenExpiresAt: { type: Date },
		scope: { type: String },
		password: { type: String },
		createdAt: { type: Date, required: true, default: Date.now },
		updatedAt: { type: Date, required: true, default: Date.now },
	},
	{ collection: "account" },
);
accountSchema.index({ providerId: 1, accountId: 1 }, { unique: true });
accountSchema.index({ userId: 1 });

const verificationSchema = new Schema(
	{
		_id: { type: ObjectId, auto: true },
		identifier: { type: String, required: true },
		value: { type: String, required: true },
		expiresAt: { type: Date, required: true },
		createdAt: { type: Date, required: true, default: Date.now },
		updatedAt: { type: Date, required: true, default: Date.now },
	},
	{ collection: "verification" },
);
verificationSchema.index({ identifier: 1 });

const User = model("User", userSchema);
const Session = model("Session", sessionSchema);
const Account = model("Account", accountSchema);
const Verification = model("Verification", verificationSchema);

export { Account, Session, User, Verification };
