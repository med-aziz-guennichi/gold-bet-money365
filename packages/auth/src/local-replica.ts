import { MongoClient } from "mongodb";

export function validateLocalMongoUrl(url: string) {
	const parsed = new URL(url);
	if (
		!["localhost", "127.0.0.1"].includes(parsed.hostname) ||
		(parsed.port && parsed.port !== "27017")
	) {
		throw new Error(
			"This setup supports only local MongoDB on port 27017. Configure remote replica sets separately.",
		);
	}
}

/** Local Windows setup only. Never reconfigures an existing replica set. */
export async function initializeLocalReplica(url: string, replicaSet: string) {
	validateLocalMongoUrl(url);
	const client = await new MongoClient(url, {
		directConnection: true,
		serverSelectionTimeoutMS: 10_000,
	}).connect();
	try {
		const admin = client.db("admin");
		const hello = await admin.command({ hello: 1 });
		if (hello.setName && hello.setName !== replicaSet)
			throw new Error(
				"Another replica set already exists. No changes were made.",
			);
		if (!hello.setName)
			await admin.command({
				replSetInitiate: {
					_id: replicaSet,
					members: [{ _id: 0, host: "127.0.0.1:27017" }],
				},
			});
		const deadline = Date.now() + 30_000;
		while (!(await admin.command({ hello: 1 })).isWritablePrimary) {
			if (Date.now() >= deadline)
				throw new Error(
					"Primary election timed out. Check the MongoDB service log.",
				);
			await new Promise((resolve) => setTimeout(resolve, 250));
		}
		// Prove a multi-document transaction commits before declaring setup successful.
		const session = client.startSession();
		try {
			const probes = client
				.db()
				.collection<{ _id: string; ready: boolean }>("walletSetupCheck");
			await session.withTransaction(
				async () => {
					await probes.updateOne(
						{ _id: "transactions" },
						{ $set: { ready: true } },
						{ upsert: true, session },
					);
					await probes.deleteOne({ _id: "transactions" }, { session });
				},
				{ writeConcern: { w: "majority" } },
			);
		} finally {
			await session.endSession();
		}
	} finally {
		await client.close();
	}
}
