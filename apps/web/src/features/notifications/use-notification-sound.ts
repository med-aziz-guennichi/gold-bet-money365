"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const preferenceKey = "fieldhouse.notification-sound";
const chimeNotes = [
	[659.25, 0],
	[830.61, 0.14],
] as const;

/** A quiet two-note chime generated locally; no downloads or autoplay on load. */
export function useNotificationSound() {
	const [enabled, setEnabled] = useState(true);
	const enabledRef = useRef(true);
	const context = useRef<AudioContext | null>(null);
	const lastPlayed = useRef(Number.NEGATIVE_INFINITY);
	useEffect(() => {
		try {
			const value = localStorage.getItem(preferenceKey) !== "off";
			enabledRef.current = value;
			setEnabled(value);
		} catch {
			/* Sound still works when storage is unavailable. */
		}
		const unlock = () => {
			if (typeof window.AudioContext !== "function") return;
			try {
				context.current ??= new AudioContext();
				if (context.current.state === "suspended")
					void context.current.resume().catch(() => {});
			} catch {
				/* Unsupported audio must never interrupt notifications. */
			}
		};
		document.addEventListener("pointerdown", unlock, { capture: true });
		document.addEventListener("keydown", unlock, { capture: true });
		return () => {
			document.removeEventListener("pointerdown", unlock, true);
			document.removeEventListener("keydown", unlock, true);
			void context.current?.close().catch(() => {});
			context.current = null;
		};
	}, []);
	const play = useCallback(() => {
		const audio = context.current;
		if (
			!enabledRef.current ||
			!audio ||
			audio.state !== "running" ||
			performance.now() - lastPlayed.current < 1000
		)
			return;
		lastPlayed.current = performance.now();
		const start = audio.currentTime;
		// A gentle ascending major third, with a short attack and natural decay.
		for (const [frequency, offset] of chimeNotes) {
			const oscillator = audio.createOscillator();
			const envelope = audio.createGain();
			oscillator.type = "sine";
			oscillator.frequency.value = frequency;
			const at = start + offset;
			envelope.gain.setValueAtTime(0, at);
			envelope.gain.linearRampToValueAtTime(0.09, at + 0.012);
			envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.46);
			oscillator.connect(envelope);
			envelope.connect(audio.destination);
			oscillator.start(at);
			oscillator.stop(at + 0.48);
			oscillator.onended = () => {
				oscillator.disconnect();
				envelope.disconnect();
			};
		}
	}, []);
	const toggle = useCallback(() => {
		const value = !enabledRef.current;
		enabledRef.current = value;
		setEnabled(value);
		try {
			localStorage.setItem(preferenceKey, value ? "on" : "off");
		} catch {
			/* Optional preference persistence. */
		}
	}, []);
	return { enabled, toggle, play };
}
