"use client";
import { parseTnd } from "@gold-bet-clean-money365/api/access";
import {
	CASINO_VERSION,
	type CasinoInput,
	casinoGames,
} from "@gold-bet-clean-money365/api/casino-catalog";
import {
	casinoPayout,
	playCasino,
} from "@gold-bet-clean-money365/api/casino-engine";
import type {
	GameSession,
	SessionGame,
} from "@gold-bet-clean-money365/api/casino-sessions";
import type {
	Action,
	CasinoOutcome,
	GameId,
	GameState,
	TableProps,
} from "@gold-bet-clean-money365/casino-core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	useCallback,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { practiceEngines, randomInt } from "./practice";

type Operation =
	| { kind: "instant"; input: CasinoInput }
	| {
			kind: "start";
			input: {
				requestId: string;
				game: SessionGame;
				version: string;
				stake: string;
			};
	  }
	| {
			kind: "action";
			input: { id: string; requestId: string; action: Action };
	  };
export function useGameRoom(gameId: GameId) {
	const game = casinoGames.find((g) => g.id === gameId)!;
	const { data: auth } = authClient.useSession();
	const userId = auth?.user.id;
	const canUseWallet = auth?.user.role === "user";
	const cache = useQueryClient();
	const [mode, setMode] = useState<"practice" | "wallet">("practice");
	const [stake, setStake] = useState("1.000");
	const [choice, setChoice] = useState<string>(game.choices[0]);
	const [numbers, setNumbers] = useState<number[]>([]);
	const [phase, setPhase] = useState<TableProps["phase"]>("ready");
	const [busy, setBusy] = useState(false);
	const guard = useRef(false);
	const [error, setError] = useState("");
	const [outcome, setOutcome] = useState<CasinoOutcome | null>(null);
	const [session, setSession] = useState<GameSession | null>(null);
	const [demoState, setDemoState] = useState<GameState | null>(null);
	const [demoBalance, setDemoBalance] = useState(1_000_000);
	const [pending, setPending] = useState<Operation | null>(null);
	const [lastNet, setLastNet] = useState<number | null>(null);
	const [sound, setSound] = useState(true);
	const audio = useRef<AudioContext | null>(null);
	const key = userId ? `fieldhouse.casino.v2.${userId}.${gameId}` : null;
	const wallet = useQuery(
		orpc.accounts.wallet.queryOptions({
			queryKey: ["management", userId, "wallet"],
			enabled: !!canUseWallet && mode === "wallet",
			staleTime: 5000,
			retry: false,
		}),
	);
	const active = useQuery(
		orpc.casino.active.queryOptions({
			input: { game: gameId as SessionGame },
			queryKey: ["casino", userId, gameId, "active"],
			enabled:
				!!canUseWallet && mode === "wallet" && game.mode === "session" && !busy,
			refetchInterval: gameId === "crash" && phase === "active" ? 700 : false,
			retry: false,
			staleTime: 0,
		}),
	);
	const recent = useQuery(
		orpc.casino.history.queryOptions({
			input: { page: 1, game: gameId },
			queryKey: ["casino", userId, gameId, "history"],
			enabled: !!canUseWallet && mode === "wallet",
			retry: false,
			staleTime: 10000,
		}),
	);
	const applySession = useCallback((next: GameSession) => {
		setSession(next);
		setOutcome(next.outcome);
		setPhase(next.status === "active" ? "active" : "settled");
		if (next.outcome)
			setLastNet(
				casinoPayout(next.stakeMillimes, next.outcome.multiplierHundredths) -
					next.stakeMillimes,
			);
	}, []);
	useEffect(() => {
		if (active.data) applySession(active.data);
	}, [active.data, applySession]);
	useEffect(() => {
		if (!key) return;
		try {
			const raw = sessionStorage.getItem(key);
			if (raw) {
				const op = JSON.parse(raw) as Operation;
				if (!["instant", "start", "action"].includes(op.kind) || !op.input)
					throw new Error();
				setPending(op);
				setMode("wallet");
			}
		} catch {
			setError(
				"Could not read saved request. Check round history before playing.",
			);
		}
	}, [key]);
	function playSound(win: boolean) {
		if (!sound) return;
		try {
			const ctx = audio.current ?? new AudioContext();
			audio.current = ctx;
			void ctx.resume();
			for (let i = 0; i < (win ? 3 : 1); i++) {
				const o = ctx.createOscillator();
				const gain = ctx.createGain();
				o.type = "sine";
				o.frequency.value = (win ? [523.25, 659.25, 783.99] : [220])[i]!;
				const t = ctx.currentTime + i * 0.12;
				gain.gain.setValueAtTime(0, t);
				gain.gain.linearRampToValueAtTime(0.035, t + 0.02);
				gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
				o.connect(gain);
				gain.connect(ctx.destination);
				o.start(t);
				o.stop(t + 0.32);
			}
		} catch {
			/* Audio is optional. */
		}
	}
	useEffect(
		() => () => {
			void audio.current?.close();
		},
		[],
	);
	async function refresh() {
		await Promise.all([
			cache.invalidateQueries({ queryKey: ["casino", userId] }),
			cache.invalidateQueries({ queryKey: ["management", userId, "wallet"] }),
		]);
	}
	async function send(op: Operation) {
		if (guard.current || !canUseWallet || !key) return;
		guard.current = true;
		setBusy(true);
		setError("");
		setPending(op);
		if (op.kind !== "action") {
			setOutcome(null);
			setPhase("playing");
		}
		try {
			sessionStorage.setItem(key, JSON.stringify(op));
			if (op.kind === "instant") {
				const receipt = await orpc.casino.play.call(op.input);
				await new Promise((resolve) =>
					setTimeout(resolve, gameId === "slots" ? 1800 : 1200),
				);
				await refresh();
				setOutcome(receipt.outcome);
				setLastNet(receipt.payoutMillimes - receipt.stakeMillimes);
				setPhase("settled");
				playSound(receipt.payoutMillimes > receipt.stakeMillimes);
			} else {
				const next =
					op.kind === "start"
						? await orpc.casino.start.call(op.input)
						: await orpc.casino.action.call(op.input);
				await refresh();
				applySession(next);
				if (next.outcome) playSound(next.outcome.multiplierHundredths > 100);
			}
			setPending(null);
			sessionStorage.removeItem(key);
		} catch (e) {
			if (
				e &&
				typeof e === "object" &&
				"code" in e &&
				["BAD_REQUEST", "TOO_MANY_REQUESTS", "FORBIDDEN"].includes(
					String(e.code),
				)
			) {
				setPending(null);
				sessionStorage.removeItem(key);
			}
			setError(
				e instanceof Error
					? e.message
					: "Connection interrupted. Retry the saved request.",
			);
			setPhase(session?.status === "active" ? "active" : "ready");
		} finally {
			setBusy(false);
			guard.current = false;
		}
	}
	function finishDemo(
		state: GameState,
		nextOutcome: CasinoOutcome | undefined,
		amount: number,
	) {
		setDemoState(state);
		const view = practiceEngines[gameId]?.view(
			state,
			!!nextOutcome,
			Date.now(),
		);
		setSession({
			id: "practice",
			game: gameId as SessionGame,
			status: nextOutcome ? "settled" : "active",
			view,
			outcome: nextOutcome ?? null,
			stakeMillimes: amount,
			balanceMillimes: demoBalance,
			createdAt: new Date().toISOString(),
			version: CASINO_VERSION,
			serverTime: Date.now(),
		});
		setPhase(nextOutcome ? "settled" : "active");
		setOutcome(nextOutcome ?? null);
		if (nextOutcome) {
			const pay = casinoPayout(amount, nextOutcome.multiplierHundredths);
			setDemoBalance((b) => b + pay);
			setLastNet(pay - amount);
			playSound(pay > amount);
		}
	}
	function act(action: Action) {
		if (guard.current || busy || pending || phase !== "active") return;
		if (mode === "wallet") {
			if (session)
				void send({
					kind: "action",
					input: { id: session.id, requestId: crypto.randomUUID(), action },
				});
			return;
		}
		try {
			if (!demoState || !session) return;
			const next = practiceEngines[gameId]?.act(demoState, action, Date.now());
			finishDemo(next.state, next.outcome, session.stakeMillimes);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Invalid action.");
		}
	}
	const expirePracticeCrash = useEffectEvent(() => {
		if (demoState?.kind === "crash" && Date.now() >= demoState.bustAt)
			act({ type: "cashout" });
	});
	useEffect(() => {
		if (
			mode !== "practice" ||
			phase !== "active" ||
			demoState?.kind !== "crash"
		)
			return;
		const timer = setInterval(expirePracticeCrash, 100);
		return () => clearInterval(timer);
	}, [mode, phase, demoState]);
	async function start() {
		if (busy || guard.current || pending || phase === "active") return;
		setError("");
		let amount: number;
		try {
			amount = parseTnd(stake);
			if (amount < 100 || amount > 100000) throw new Error();
		} catch {
			setError("Stake must be 0.100–100.000 TND.");
			return;
		}
		if (gameId === "roulette" && choice === "number" && !numbers.length) {
			setError("Place your chip on a number.");
			return;
		}
		if (mode === "wallet") {
			const requestId = crypto.randomUUID();
			void send(
				game.mode === "session"
					? {
							kind: "start",
							input: {
								game: gameId as SessionGame,
								requestId,
								version: CASINO_VERSION,
								stake,
							},
						}
					: {
							kind: "instant",
							input: {
								game: gameId,
								requestId,
								version: CASINO_VERSION,
								stake,
								choice,
								numbers: choice === "number" ? numbers : [],
							},
						},
			);
			return;
		}
		if (amount > demoBalance) {
			setError("Practice balance is too low. Reset practice credits below.");
			return;
		}
		setDemoBalance((b) => b - amount);
		setOutcome(null);
		setLastNet(null);
		setBusy(true);
		guard.current = true;
		setPhase("playing");
		try {
			await new Promise((resolve) =>
				setTimeout(
					resolve,
					game.mode === "session" ? 250 : gameId === "slots" ? 1800 : 1200,
				),
			);
			if (game.mode === "session") {
				const next = practiceEngines[gameId]?.create(randomInt, Date.now());
				finishDemo(next.state, next.outcome, amount);
			} else {
				const next = playCasino(gameId, choice, numbers, randomInt);
				const pay = casinoPayout(amount, next.multiplierHundredths);
				setOutcome(next);
				setDemoBalance((b) => b + pay);
				setLastNet(pay - amount);
				setPhase("settled");
				playSound(pay > amount);
			}
		} finally {
			setBusy(false);
			guard.current = false;
		}
	}
	function switchMode(next: "practice" | "wallet") {
		if (busy || pending || phase === "active") return;
		setMode(next);
		setOutcome(null);
		setSession(null);
		setDemoState(null);
		setPhase("ready");
		setLastNet(null);
		setError("");
	}
	const props: TableProps = {
		outcome,
		view: session?.view ?? null,
		busy: busy || !!pending,
		disabled:
			busy ||
			!!pending ||
			phase === "active" ||
			(mode === "wallet" && !canUseWallet),
		choice,
		numbers,
		onChoice: (c) => {
			if (!busy && !pending && phase !== "active") {
				setChoice(c);
				setOutcome(null);
			}
		},
		onNumber: (n) => {
			if (!busy && !pending) setNumbers([n]);
		},
		onStart: () => void start(),
		onAction: act,
		phase,
	};
	async function recoverSaved() {
		if (!pending || !key || guard.current) return;
		guard.current = true;
		setBusy(true);
		setError("");
		try {
			if (pending.kind === "instant") {
				const found = await orpc.casino.recover.call({
					requestId: pending.input.requestId,
				});
				if (!found) {
					setError(
						"No saved result yet. Retry the identical request to finish checking it.",
					);
					return;
				}
				setOutcome(found.outcome);
				setLastNet(found.payoutMillimes - found.stakeMillimes);
				setPhase("settled");
			} else {
				const id =
					pending.kind === "start"
						? `${userId}:${pending.input.requestId}`
						: pending.input.id;
				const found = await orpc.casino.session.call({ id });
				if (!found) {
					setError(
						"No saved session yet. Retry the identical request to finish checking it.",
					);
					return;
				}
				applySession(found);
			}
			setPending(null);
			sessionStorage.removeItem(key);
			await refresh();
		} catch (e) {
			setError(
				e instanceof Error
					? e.message
					: "Recovery failed. Retry the saved request.",
			);
		} finally {
			setBusy(false);
			guard.current = false;
		}
	}
	return {
		game,
		canUseWallet,
		mode,
		switchMode,
		sound,
		setSound,
		busy,
		pending,
		phase,
		props,
		outcome,
		lastNet,
		demoBalance,
		wallet,
		stake,
		setStake,
		error,
		send,
		recoverSaved,
		recent,
		setDemoBalance,
	};
}
