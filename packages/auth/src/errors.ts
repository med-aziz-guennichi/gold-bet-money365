export class ManagementError extends Error {
	constructor(
		public readonly code:
			| "UNAUTHORIZED"
			| "FORBIDDEN"
			| "BAD_REQUEST"
			| "CONFLICT"
			| "TOO_MANY_REQUESTS"
			| "SERVICE_UNAVAILABLE",
		message: string,
	) {
		super(message);
	}
}
