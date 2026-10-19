import { google } from "@/lib/google-config";

export function GET() {
	if (!google.publisherId)
		return new Response("AdSense is not configured.\n", {
			status: 404,
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	return new Response(
		`google.com, ${google.publisherId.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n`,
		{
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "public, max-age=3600",
			},
		},
	);
}
