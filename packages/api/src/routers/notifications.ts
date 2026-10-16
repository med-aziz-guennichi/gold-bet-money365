import { NotificationService } from "@gold-bet-clean-money365/auth/notifications";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const notificationsRouter = {
	list: protectedProcedure
		.input(
			z
				.object({ page: z.number().int().min(1).max(10000).default(1) })
				.strict(),
		)
		.handler(({ context, input }) =>
			new NotificationService(context.db).list(
				context.session.user.id,
				input.page,
			),
		),
	read: protectedProcedure
		.route({ method: "POST" })
		.input(z.object({ id: z.string().min(1).max(250) }).strict())
		.handler(({ context, input }) =>
			new NotificationService(context.db).markRead(
				context.session.user.id,
				input.id,
			),
		),
};
