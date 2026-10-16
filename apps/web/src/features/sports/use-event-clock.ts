"use client";
import { useEffect, useState } from "react";

/** Local clock only: reaching kickoff must close a pre-match offer immediately. */
export function useEventClock() {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);
	return now;
}
