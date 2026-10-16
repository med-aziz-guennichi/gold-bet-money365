/** Bounded process-local TTL cache with shared in-flight loads. */
export class AsyncCache<T> {
	private readonly entries = new Map<string, { value: T; expiresAt: number }>();
	private readonly pending = new Map<string, Promise<T>>();

	constructor(
		private readonly ttlMs: number,
		private readonly maxEntries: number,
		private readonly nullTtlMs = ttlMs,
		private readonly now = Date.now,
	) {}

	get(key: string, load: () => Promise<T>, forceRefresh = false): Promise<T> {
		const cached = this.entries.get(key);
		if (!forceRefresh && cached && cached.expiresAt > this.now()) {
			return Promise.resolve(cached.value);
		}
		this.entries.delete(key);
		const pending = this.pending.get(key);
		if (pending) return pending;

		const request = Promise.resolve()
			.then(load)
			.then((value) => {
				for (const [id, entry] of this.entries) {
					if (entry.expiresAt <= this.now()) this.entries.delete(id);
				}
				if (this.entries.size >= this.maxEntries) {
					const oldest = this.entries.keys().next();
					if (!oldest.done) this.entries.delete(oldest.value);
				}
				this.entries.set(key, {
					value,
					expiresAt:
						this.now() + (value === null ? this.nullTtlMs : this.ttlMs),
				});
				return value;
			})
			.finally(() => {
				this.pending.delete(key);
			});
		this.pending.set(key, request);
		return request;
	}
}
