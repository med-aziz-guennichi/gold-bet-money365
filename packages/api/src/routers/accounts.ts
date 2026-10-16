import { normalizePhone, roles } from "@gold-bet-clean-money365/auth/access";
import { ManagementError } from "@gold-bet-clean-money365/auth/management";
import { parseTnd } from "@gold-bet-clean-money365/auth/money";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";

const id = z.string().regex(/^[a-f\d]{24}$/i);
const name = z.string().trim().min(2).max(100);
const password = z.string().min(12).max(128);
const amount = z
	.string()
	.max(20)
	.superRefine((value, context) => {
		try {
			parseTnd(value);
		} catch (error) {
			context.addIssue({
				code: "custom",
				message: error instanceof Error ? error.message : "Invalid TND amount.",
			});
		}
	});
const phoneNumber = z
	.string()
	.max(32)
	.transform((value, context) => {
		try {
			return normalizePhone(value);
		} catch {
			context.addIssue({
				code: "custom",
				message: "Enter a valid phone number with country code.",
			});
			return z.NEVER;
		}
	});

const managerProcedure = protectedProcedure.use(async ({ next }) => {
	try {
		return await next();
	} catch (error) {
		if (error instanceof ManagementError)
			throw new ORPCError(error.code, { message: error.message });
		throw error;
	}
});

export const accountsRouter = {
	wallet: managerProcedure
		.route({ method: "GET" })
		.handler(({ context }) => context.accounts.wallet(context.session.user.id)),
	walletHistory: managerProcedure
		.route({ method: "GET" })
		.input(
			z
				.object({
					accountId: id.optional(),
					page: z.number().int().min(1).max(10000).default(1),
					limit: z.number().int().min(1).max(100).default(20),
				})
				.strict(),
		)
		.handler(({ context, input }) =>
			context.accounts.walletHistory(context.session.user.id, input),
		),
	topUp: managerProcedure
		.route({ method: "POST" })
		.input(z.object({ id, amount, requestId: z.uuid() }).strict())
		.handler(({ context, input }) =>
			context.accounts.topUp(context.session.user.id, input),
		),
	me: managerProcedure
		.route({ method: "GET" })
		.handler(({ context }) =>
			context.accounts.requireManager(context.session.user.id),
		),
	list: managerProcedure
		.route({ method: "GET" })
		.input(
			z
				.object({
					page: z.number().int().min(1).max(10000).default(1),
					limit: z.number().int().min(1).max(100).default(20),
					search: z.string().trim().max(80).optional(),
					role: z.enum(roles).optional(),
					parentId: id.optional(),
				})
				.strict(),
		)
		.handler(({ context, input }) =>
			context.accounts.list(context.session.user.id, input),
		),
	create: managerProcedure
		.route({ method: "POST" })
		.input(
			z
				.object({
					name,
					phoneNumber,
					password,
					role: z.enum(["fournisseur", "client", "user"]),
					parentId: id,
					initialAmount: amount.default("0"),
					requestId: z.uuid(),
				})
				.strict(),
		)
		.handler(({ context, input }) =>
			context.accounts.create(context.session.user.id, input),
		),
	update: managerProcedure
		.route({ method: "POST" })
		.input(z.object({ id, name }).strict())
		.handler(({ context, input }) =>
			context.accounts.update(context.session.user.id, input),
		),
	setDisabled: managerProcedure
		.route({ method: "POST" })
		.input(z.object({ id, disabled: z.boolean() }).strict())
		.handler(({ context, input }) =>
			context.accounts.setDisabled(context.session.user.id, input),
		),
	resetPassword: managerProcedure
		.route({ method: "POST" })
		.input(z.object({ id, password }).strict())
		.handler(({ context, input }) =>
			context.accounts.resetPassword(context.session.user.id, input),
		),
};
