/** A past kickoff is never evidence that an event is live. Require the feed. */
export function currentEventStatus(
	status: string,
	kickoff: string,
	now = Date.now(),
) {
	if (status === "TRADING" && !(Date.parse(kickoff) > now))
		return "AWAITING_RESULTS";
	return status;
}
