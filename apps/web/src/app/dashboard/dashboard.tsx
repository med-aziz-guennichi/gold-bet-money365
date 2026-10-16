"use client";

import {
	type AccountSummary,
	canUseDashboard,
	formatTnd,
	type Role,
} from "@gold-bet-clean-money365/api/access";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import UserMenu from "@/components/user-menu";
import { WalletPanel } from "@/features/accounts/wallet-panel";
import type { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

const field =
	"w-full rounded-xl border border-white/15 bg-[#151d17] px-3 py-2.5 text-sm text-white outline-none focus:border-[#c6f36b]";
const button =
	"rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold transition hover:border-[#c6f36b]/60 disabled:opacity-40";
type Action = {
	kind: "rename" | "password" | "disable" | "fund";
	requestId: string;
	account: AccountSummary;
};

export default function Dashboard({
	session,
}: {
	session: typeof authClient.$Infer.Session;
}) {
	const cache = useQueryClient();
	const actorId = session.user.id;
	const role = session.user.role as Role;
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [roleFilter, setRoleFilter] = useState<Role | "">(
		role === "admin" ? "fournisseur" : "",
	);
	const [branch, setBranch] = useState<AccountSummary[]>([]);
	function navigateBranch(next: AccountSummary[]) {
		setBranch(next);
		setSearch("");
		setDebouncedSearch("");
		setPage(1);
		const parent = next.at(-1);
		setRoleFilter(
			parent?.role === "fournisseur"
				? "client"
				: parent?.role === "client"
					? "user"
					: role === "admin"
						? "fournisseur"
						: "",
		);
	}
	const [createOpen, setCreateOpen] = useState(false);
	const [action, setAction] = useState<Action | null>(null);
	const [notice, setNotice] = useState("");
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(search);
			setPage(1);
		}, 300);
		return () => clearTimeout(timer);
	}, [search]);
	const input = {
		page,
		limit: 20,
		search: debouncedSearch || undefined,
		role: roleFilter || undefined,
		parentId: branch.at(-1)?.id,
	};
	const accounts = useQuery(
		orpc.accounts.list.queryOptions({
			input,
			queryKey: ["management", actorId, "list", input],
			retry: false,
			refetchOnWindowFocus: false,
		}),
	);
	const refresh = async () => {
		await cache.invalidateQueries({ queryKey: ["management", actorId] });
	};
	const actionMutation = useMutation({
		gcTime: 0,
		mutationFn: async ({
			form,
			current,
		}: {
			form: FormData;
			current: Action;
		}) => {
			if (current.kind === "fund")
				return orpc.accounts.topUp.call({
					id: current.account.id,
					amount: String(form.get("amount") ?? ""),
					requestId: current.requestId,
				});
			if (current.kind === "rename")
				return orpc.accounts.update.call({
					id: current.account.id,
					name: String(form.get("name") ?? ""),
				});
			if (current.kind === "password")
				return orpc.accounts.resetPassword.call({
					id: current.account.id,
					password: String(form.get("password") ?? ""),
				});
			return orpc.accounts.setDisabled.call({
				id: current.account.id,
				disabled: !current.account.banned,
			});
		},
		onSuccess: async () => {
			setAction(null);
			actionMutation.reset();
			setNotice("Account updated successfully.");
			await refresh();
		},
	});
	function openAction(next: Omit<Action, "requestId">) {
		actionMutation.reset();
		setAction({ ...next, requestId: crypto.randomUUID() });
		setNotice("");
	}
	const rows = accounts.data?.items ?? [];
	const totalPages = Math.max(1, Math.ceil((accounts.data?.total ?? 0) / 20));
	const availableRoles: Role[] =
		role === "admin"
			? ["fournisseur", "client", "user"]
			: role === "fournisseur"
				? ["client", "user"]
				: ["user"];
	return (
		<main className="min-h-screen bg-[#080b0a] px-4 py-7 text-[#f4f5f2] sm:px-8">
			<div className="mx-auto max-w-6xl">
				<header className="flex flex-wrap items-center justify-between gap-4 border-white/10 border-b pb-6">
					<div>
						<Link href="/" className="text-[#c6f36b] text-sm">
							Fieldhouse / Management
						</Link>
						<h1 className="mt-3 font-bold text-3xl">Account management</h1>
						<p className="mt-2 text-sm text-white/50">
							{session.user.name} · <span className="capitalize">{role}</span>
						</p>
					</div>
					<UserMenu />
				</header>
				<WalletPanel
					key={branch.at(-1)?.id ?? "root"}
					actorId={actorId}
					accountId={branch.at(-1)?.id}
					accountName={branch.at(-1)?.name}
				/>
				<div className="mt-6 grid gap-4 sm:grid-cols-3">
					<div className="rounded-2xl border border-white/10 bg-[#111713] p-5">
						<p className="text-white/40 text-xs uppercase tracking-wider">
							Accounts in this view
						</p>
						<p className="mt-3 font-bold text-3xl text-[#c6f36b]">
							{accounts.data?.total ?? "—"}
						</p>
					</div>
					<div className="rounded-2xl border border-white/10 bg-[#111713] p-5 sm:col-span-2">
						<p className="font-semibold">
							{role === "admin"
								? "Full network access"
								: role === "fournisseur"
									? "Your clients and their users"
									: "Your users"}
						</p>
						<p className="mt-2 text-sm text-white/50 leading-6">
							Create accounts, update names, reset passwords, and suspend
							access. Suspending a manager also blocks access for their entire
							branch.
						</p>
					</div>
				</div>
				<nav
					aria-label="Account hierarchy"
					className="mt-6 flex flex-wrap items-center gap-2 text-sm"
				>
					<button
						type="button"
						className={button}
						onClick={() => navigateBranch([])}
					>
						{role === "admin"
							? "All fournisseurs"
							: role === "fournisseur"
								? "My clients and users"
								: "My users"}
					</button>
					{branch.map((account, index) => (
						<span key={account.id} className="flex items-center gap-2">
							<span aria-hidden="true" className="text-white/30">
								/
							</span>
							<button
								type="button"
								className={button}
								onClick={() => navigateBranch(branch.slice(0, index + 1))}
							>
								{account.name}{" "}
								<span className="text-white/40">({account.role})</span>
							</button>
						</span>
					))}
					{branch.length > 0 && (
						<span className="text-white/45">
							/ {branch.at(-1)?.role === "fournisseur" ? "Clients" : "Users"}
						</span>
					)}
				</nav>
				{role === "admin" && branch.length === 0 && (
					<p className="mt-3 text-sm text-white/50">
						Open a fournisseur to see their clients, then open a client to see
						their users. Choose “All roles” to see the entire network.
					</p>
				)}

				<div className="my-6 flex flex-wrap items-center gap-3">
					<input
						className={`${field} sm:max-w-xs`}
						aria-label="Search accounts"
						placeholder="Search by name or phone"
						maxLength={80}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<select
						className={`${field} sm:max-w-44`}
						aria-label="Filter by role"
						value={roleFilter}
						onChange={(e) => {
							setRoleFilter(e.target.value as Role | "");
							setPage(1);
						}}
					>
						<option value="">All roles</option>
						{[...(role === "admin" ? ["admin"] : []), ...availableRoles].map(
							(item) => (
								<option key={item} value={item}>
									{item}
								</option>
							),
						)}
					</select>
					<button
						type="button"
						className="rounded-xl bg-[#c6f36b] px-5 py-2.5 font-bold text-[#11160b] text-sm sm:ms-auto"
						onClick={() => {
							setCreateOpen(true);
							setNotice("");
						}}
					>
						Create account
					</button>
				</div>
				{notice && (
					<p role="status" className="mb-4 text-[#c6f36b] text-sm">
						{notice}
					</p>
				)}
				{accounts.error && (
					<p role="alert" className="mb-4 text-red-300 text-sm">
						{accounts.error.message}
					</p>
				)}
				<div className="min-w-0 rounded-2xl border border-white/10 bg-[#111713]">
					<table className="account-table w-full text-start text-sm">
						<thead className="border-white/10 border-b text-start text-white/45 text-xs">
							<tr>
								{[
									"Account",
									"Phone",
									"Role",
									"Wallet",
									"Status",
									"Actions",
								].map((label) => (
									<th key={label} className="px-5 py-4 text-start font-medium">
										{label}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{rows.map((account) => (
								<tr
									key={account.id}
									className="border-white/5 border-b last:border-0"
								>
									<td data-label="Account" className="px-5 py-4 font-semibold">
										{account.name}
										{account.id === actorId && (
											<span className="ms-2 text-white/40 text-xs">You</span>
										)}
									</td>
									<td data-label="Phone" className="px-5 py-4" dir="ltr">
										{account.phoneNumber || "Not configured"}
									</td>
									<td data-label="Role" className="px-5 py-4 capitalize">
										{account.role}
									</td>
									<td data-label="Wallet" className="px-5 py-4 text-[#c6f36b]">
										{account.role === "admin"
											? "Admin allocation"
											: formatTnd(account.balanceMillimes)}
									</td>
									<td className="px-5 py-4">
										<span
											className={
												account.banned ? "text-red-300" : "text-[#c6f36b]"
											}
										>
											{account.banned ? "Suspended" : "Active"}
										</span>
									</td>
									<td className="px-5 py-4">
										{(account.role === "fournisseur" ||
											account.role === "client") && (
											<button
												type="button"
												className={`${button} mb-2`}
												onClick={() => navigateBranch([...branch, account])}
											>
												{account.role === "fournisseur"
													? "View clients"
													: "View users"}
											</button>
										)}
										{account.role !== "admin" && account.id !== actorId && (
											<div className="flex flex-wrap gap-2">
												<button
													type="button"
													className={button}
													disabled={Boolean(account.banned)}
													onClick={() => openAction({ kind: "fund", account })}
												>
													Add funds
												</button>
												<button
													type="button"
													className={button}
													onClick={() =>
														openAction({ kind: "rename", account })
													}
												>
													Edit
												</button>
												<button
													type="button"
													className={button}
													onClick={() =>
														openAction({ kind: "password", account })
													}
												>
													Reset password
												</button>
												<button
													type="button"
													className={button}
													onClick={() =>
														openAction({ kind: "disable", account })
													}
												>
													{account.banned ? "Enable" : "Suspend"}
												</button>
											</div>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
					{accounts.isPending && (
						<p role="status" className="p-8 text-center text-white/50">
							Loading accounts…
						</p>
					)}
					{!accounts.isPending && rows.length === 0 && (
						<p className="p-8 text-center text-white/50">No accounts found.</p>
					)}
				</div>
				<div className="mt-4 flex items-center justify-between text-white/50 text-xs">
					<button
						className={button}
						type="button"
						disabled={page <= 1 || accounts.isFetching}
						onClick={() => setPage((value) => value - 1)}
					>
						Previous
					</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button
						className={button}
						type="button"
						disabled={page >= totalPages || accounts.isFetching}
						onClick={() => setPage((value) => value + 1)}
					>
						Next
					</button>
				</div>
				{createOpen && (
					<CreateAccount
						actorId={actorId}
						actorRole={role}
						availableRoles={availableRoles}
						onClose={() => setCreateOpen(false)}
						onCreated={async () => {
							setCreateOpen(false);
							setNotice(
								"Account created. Share the credentials privately with its owner.",
							);
							await refresh();
						}}
					/>
				)}
				{action && (
					<Modal
						title={`${action.kind === "fund" ? "Add funds to" : action.kind === "rename" ? "Edit" : action.kind === "password" ? "Reset password for" : action.account.banned ? "Enable" : "Suspend"} ${action.account.name}`}
						onClose={() => {
							if (!actionMutation.isPending) setAction(null);
						}}
					>
						<form
							className="space-y-4"
							onSubmit={(event) => {
								event.preventDefault();
								if (!actionMutation.isPending)
									actionMutation.mutate({
										form: new FormData(event.currentTarget),
										current: action,
									});
							}}
						>
							{action.kind === "fund" && (
								<div className="space-y-3">
									<p className="text-sm text-white/60">
										Current balance: {formatTnd(action.account.balanceMillimes)}
										.
									</p>
									<p className="text-sm text-white/50">
										{action.account.role === "fournisseur"
											? "This adds a new admin allocation to the fournisseur's wallet."
											: `This amount is deducted from the ${action.account.role === "client" ? "fournisseur" : "client"} parent wallet and credited to this account.`}
									</p>
									<label className="block text-sm">
										Amount to add (TND)
										<input
											className={`${field} mt-2`}
											name="amount"
											type="number"
											min="0.001"
											max="1000000000"
											step="0.001"
											placeholder="5000.000"
											required
										/>
									</label>
								</div>
							)}
							{action.kind === "rename" && (
								<label className="block text-sm">
									Display name
									<input
										className={`${field} mt-2`}
										name="name"
										defaultValue={action.account.name}
										minLength={2}
										maxLength={100}
										required
									/>
								</label>
							)}
							{action.kind === "password" && (
								<label className="block text-sm">
									New password
									<input
										className={`${field} mt-2`}
										name="password"
										type="password"
										autoComplete="new-password"
										minLength={12}
										maxLength={128}
										required
									/>
									<span className="mt-2 block text-white/45 text-xs">
										Use at least 12 characters. Existing sessions will be
										revoked.
									</span>
								</label>
							)}
							{action.kind === "disable" && (
								<p className="text-sm text-white/60 leading-6">
									{action.account.banned
										? "This account can sign in again if its parent accounts are active."
										: "This account and all accounts under it will lose access. Existing sessions will be revoked."}
								</p>
							)}
							{actionMutation.error && (
								<p role="alert" className="text-red-300 text-sm">
									{actionMutation.error.message}
								</p>
							)}
							<button
								className="w-full rounded-xl bg-[#c6f36b] py-3 font-bold text-[#11160b] disabled:opacity-50"
								type="submit"
								disabled={actionMutation.isPending}
							>
								{actionMutation.isPending ? "Saving…" : "Confirm"}
							</button>
						</form>
					</Modal>
				)}
			</div>
		</main>
	);
}

function Modal({
	title,
	children,
	onClose,
}: {
	title: string;
	children: React.ReactNode;
	onClose: () => void;
}) {
	const dialog = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		const element = dialog.current;
		element?.showModal();
		return () => element?.close();
	}, []);
	return (
		<dialog
			ref={dialog}
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
			aria-label={title}
			className="m-auto max-h-[90vh] w-[90vw] max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-[#111713] p-6 text-white backdrop:bg-black/75"
		>
			<div className="mb-6 flex items-center justify-between gap-4">
				<h2 className="font-bold text-lg">{title}</h2>
				<button
					type="button"
					className={button}
					onClick={onClose}
					aria-label="Close dialog"
				>
					Close
				</button>
			</div>
			{children}
		</dialog>
	);
}

function CreateAccount({
	actorId,
	actorRole,
	availableRoles,
	onClose,
	onCreated,
}: {
	actorId: string;
	actorRole: Role;
	availableRoles: Role[];
	onClose: () => void;
	onCreated: () => Promise<void>;
}) {
	const [role, setRole] = useState(
		availableRoles[0] as "fournisseur" | "client" | "user",
	);
	const [requestId] = useState(() => crypto.randomUUID());
	const [parentId, setParentId] = useState("");
	const [parentSearch, setParentSearch] = useState("");
	const [debouncedParentSearch, setDebouncedParentSearch] = useState("");
	useEffect(() => {
		const timer = setTimeout(() => setDebouncedParentSearch(parentSearch), 300);
		return () => clearTimeout(timer);
	}, [parentSearch]);
	const parentRole: Role =
		role === "fournisseur"
			? "admin"
			: role === "client"
				? "fournisseur"
				: "client";
	const ownParent = parentRole === actorRole;
	const input = {
		page: 1,
		limit: 100,
		role: parentRole,
		search: debouncedParentSearch || undefined,
	};
	const parents = useQuery(
		orpc.accounts.list.queryOptions({
			input,
			enabled: !ownParent,
			queryKey: ["management", actorId, "parents", input],
			retry: false,
		}),
	);
	const create = useMutation({
		gcTime: 0,
		mutationFn: (input: Parameters<typeof orpc.accounts.create.call>[0]) =>
			orpc.accounts.create.call(input),
		onSuccess: onCreated,
	});
	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (create.isPending) return;
		const form = new FormData(event.currentTarget);
		create.mutate({
			name: String(form.get("name") ?? ""),
			phoneNumber: String(form.get("phoneNumber") ?? ""),
			password: String(form.get("password") ?? ""),
			role,
			parentId: ownParent ? actorId : parentId,
			initialAmount: String(form.get("initialAmount") ?? "0"),
			requestId,
		});
	}
	if (!canUseDashboard(actorRole)) return null;
	return (
		<Modal
			title="Create account"
			onClose={() => {
				if (!create.isPending) onClose();
			}}
		>
			<form onSubmit={submit} className="space-y-4">
				<label className="block text-sm">
					Role
					<select
						className={`${field} mt-2`}
						value={role}
						onChange={(event) => {
							setRole(event.target.value as typeof role);
							setParentId("");
							create.reset();
						}}
					>
						{availableRoles.map((item) => (
							<option key={item} value={item}>
								{item}
							</option>
						))}
					</select>
				</label>
				{!ownParent && (
					<div className="space-y-2">
						<label className="block text-sm" htmlFor="parent-search">
							Find {parentRole}
							<input
								id="parent-search"
								className={`${field} mt-2`}
								placeholder="Search parent by name or phone"
								maxLength={80}
								value={parentSearch}
								onChange={(e) => {
									setParentSearch(e.target.value);
									setParentId("");
								}}
							/>
						</label>
						<select
							aria-label={`Parent ${parentRole}`}
							className={field}
							value={parentId}
							onChange={(e) => setParentId(e.target.value)}
							required
						>
							<option value="">Select {parentRole}</option>
							{parents.data?.items
								.filter((item) => !item.banned)
								.map((item) => (
									<option value={item.id} key={item.id}>
										{item.name} · {item.phoneNumber}
									</option>
								))}
						</select>
						{parents.error && (
							<p role="alert" className="text-red-300 text-xs">
								{parents.error.message}
							</p>
						)}
						<p className="text-white/40 text-xs">
							Only your accessible accounts are available. Search to narrow the
							first 100 results.
						</p>
					</div>
				)}
				<label className="block text-sm">
					Display name
					<input
						className={`${field} mt-2`}
						name="name"
						autoComplete="off"
						minLength={2}
						maxLength={100}
						required
					/>
				</label>
				<label className="block text-sm">
					Phone number
					<input
						className={`${field} mt-2`}
						name="phoneNumber"
						type="tel"
						placeholder="+216 12 345 678"
						autoComplete="off"
						maxLength={32}
						required
					/>
				</label>
				<label className="block text-sm">
					Initial password
					<input
						className={`${field} mt-2`}
						name="password"
						type="password"
						autoComplete="new-password"
						minLength={12}
						maxLength={128}
						required
					/>
					<span className="mt-1 block text-white/40 text-xs">
						At least 12 characters. Share this privately with the account owner.
					</span>
				</label>
				<label className="block text-sm">
					Initial wallet amount (TND)
					<input
						className={`${field} mt-2`}
						name="initialAmount"
						type="number"
						min="0"
						max="1000000000"
						step="0.001"
						defaultValue="0"
						required
					/>
					<span className="mt-2 block text-white/45 text-xs">
						{role === "fournisseur"
							? "Admin allocates this amount to the new fournisseur."
							: `Deducted from the selected ${parentRole}'s wallet. The account and transfer are created together.`}
					</span>
				</label>

				{create.error && (
					<p role="alert" className="text-red-300 text-sm">
						{create.error.message}
					</p>
				)}
				<button
					type="submit"
					disabled={create.isPending || (!ownParent && !parentId)}
					className="w-full rounded-xl bg-[#c6f36b] py-3 font-bold text-[#11160b] disabled:opacity-50"
				>
					{create.isPending ? "Creating…" : "Create account"}
				</button>
			</form>
		</Modal>
	);
}
