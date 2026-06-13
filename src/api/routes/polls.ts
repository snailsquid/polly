import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../../db/client";
import {
	authMiddleware,
	readOnlyAuthMiddleware,
	writeAuthMiddleware,
} from "../middleware/auth";
import { serverEvents } from "../../events";
import { discordClient } from "../../bot";

const SHARE_CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
function generateCode(): string {
	let code = "";
	for (let i = 0; i < 6; i++) {
		code +=
			SHARE_CODE_ALPHABET[
				Math.floor(Math.random() * SHARE_CODE_ALPHABET.length)
			];
	}
	return code;
}

const OptionInputSchema = z.object({
	number: z.number().int().min(1).max(9),
	label: z.string().min(1),
	image: z.string().nullable().optional(),
});

const CreatePollSchema = z.object({
	question: z.string().min(1),
	channelId: z.string().default(""),
	guildId: z.string().default(""),
	voteType: z.enum(["NUMBER", "TEXT"]).default("NUMBER"),
	liveTheme: z.string().default("bar"),
	options: z.array(OptionInputSchema).min(1).max(9),
});

const UpdatePollSchema = z.object({
	question: z.string().min(1).optional(),
	voteType: z.enum(["NUMBER", "TEXT"]).optional(),
	liveTheme: z.string().optional(),
	status: z.enum(["DRAFT", "LIVE", "ENDED"]).optional(),
	options: z.array(OptionInputSchema).optional(),
});

export function createApiRouter(): Router {
	const router = Router();

	router.get("/health", (_req: Request, res: Response) => {
		res.json({ status: "ok", timestamp: Date.now() });
	});

	router.get("/polls", authMiddleware, async (_req: Request, res: Response) => {
		try {
			const polls = await prisma.poll.findMany({
				include: {
					options: true,
					runs: {
						include: {
							votes: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});
			res.json(polls);
		} catch (error) {
			console.error("Failed to fetch polls:", error);
			res.status(500).json({ error: "Failed to fetch polls" });
		}
	});

	router.post(
		"/polls",
		writeAuthMiddleware,
		async (req: Request, res: Response) => {
			try {
				const data = CreatePollSchema.parse(req.body);
				const userId = req.headers["x-user-id"] as string;

				const poll = await prisma.poll.create({
					data: {
						question: data.question,
						channelId: data.channelId,
						guildId: data.guildId,
						voteType: data.voteType,
						liveTheme: data.liveTheme,
						ownerId: userId,
						options: {
							create: data.options.map((opt) => ({
								number: opt.number,
								label: opt.label,
								image: opt.image,
							})),
						},
					},
					include: {
						options: true,
					},
				});

				res.status(201).json(poll);
			} catch (error) {
				if (error instanceof z.ZodError) {
					res
						.status(400)
						.json({ error: "Invalid input", details: error.errors });
					return;
				}
				res.status(500).json({ error: "Failed to create poll" });
			}
		},
	);

	router.get(
		"/polls/by-code/:code",
		readOnlyAuthMiddleware,
		async (req: Request, res: Response) => {
			try {
				const code = req.params.code as string;
				const poll = await prisma.poll.findUnique({
					where: { shareCode: code },
					include: { options: true },
				});

				if (!poll) {
					res.status(404).json({ error: "Poll not found" });
					return;
				}

				res.json({
					question: poll.question,
					channelId: poll.channelId,
					guildId: poll.guildId,
					voteType: poll.voteType,
					liveTheme: poll.liveTheme,
					options: poll.options.map((o) => ({
						number: o.number,
						label: o.label,
						...(o.image ? { image: o.image } : {}),
					})),
				});
			} catch (error) {
				console.error("Failed to fetch poll by code:", error);
				res.status(500).json({ error: "Failed to fetch poll by code" });
			}
		},
	);

	router.get(
		"/polls/:id",
		authMiddleware,
		async (req: Request, res: Response) => {
			try {
				const pollId = req.params.id as string;
				const poll = await prisma.poll.findUnique({
					where: { id: pollId },
					include: {
						options: true,
						runs: {
							include: {
								votes: true,
							},
						},
					},
				});

				if (!poll) {
					res.status(404).json({ error: "Poll not found" });
					return;
				}

				res.json(poll);
			} catch (error) {
				console.error("Failed to fetch poll:", error);
				res.status(500).json({ error: "Failed to fetch poll" });
			}
		},
	);

	router.put(
		"/polls/:id",
		writeAuthMiddleware,
		async (req: Request, res: Response) => {
			try {
				const data = UpdatePollSchema.parse(req.body);
				const pollId = req.params.id as string;

				const existingPoll = await prisma.poll.findUnique({
					where: { id: pollId },
				});

				if (!existingPoll) {
					res.status(404).json({ error: "Poll not found" });
					return;
				}

				const poll = await prisma.$transaction(async (tx) => {
					await tx.poll.update({
						where: { id: pollId },
						data: {
							question: data.question,
							voteType: data.voteType,
							liveTheme: data.liveTheme,
							status: data.status,
						},
					});

					if (data.options) {
						await tx.option.deleteMany({ where: { pollId } });
						await tx.option.createMany({
							data: data.options.map((opt) => ({
								pollId,
								number: opt.number,
								label: opt.label,
								image: opt.image ?? null,
							})),
						});
					}

					return tx.poll.findUnique({
						where: { id: pollId },
						include: {
							options: true,
							runs: { include: { votes: true } },
						},
					});
				});

				res.json(poll);
			} catch (error) {
				if (error instanceof z.ZodError) {
					res
						.status(400)
						.json({ error: "Invalid input", details: error.errors });
					return;
				}
				res.status(500).json({ error: "Failed to update poll" });
			}
		},
	);

	router.delete(
		"/polls/:id",
		writeAuthMiddleware,
		async (req: Request, res: Response) => {
			try {
				const pollId = req.params.id as string;
				await prisma.poll.delete({
					where: { id: pollId },
				});
				res.status(204).send();
			} catch (error) {
				res.status(500).json({ error: "Failed to delete poll" });
			}
		},
	);

	router.post(
		"/polls/:id/start",
		writeAuthMiddleware,
		async (req: Request, res: Response) => {
			try {
				const pollId = req.params.id as string;
				const poll = await prisma.poll.findUnique({
					where: { id: pollId },
					include: { options: true },
				});

				if (!poll) {
					res.status(404).json({ error: "Poll not found" });
					return;
				}

				const existingLiveRun = await prisma.pollRun.findFirst({
					where: { pollId, status: "LIVE" },
				});

				if (existingLiveRun) {
					res.status(400).json({ error: "Poll already has a live run" });
					return;
				}

				const maxRunResult = await prisma.pollRun.findFirst({
					where: { pollId },
					orderBy: { runNumber: "desc" },
					select: { runNumber: true },
				});
				const nextRunNumber = (maxRunResult?.runNumber ?? 0) + 1;

				// Parse optional duration (in seconds) from request body
				const duration: number | undefined = req.body?.duration
					? parseInt(req.body.duration, 10)
					: undefined;
				const scheduledEnd =
					duration && duration > 0
						? new Date(Date.now() + duration * 1000)
						: undefined;

				const pollRun = await prisma.pollRun.create({
					data: {
						pollId,
						runNumber: nextRunNumber,
						status: "LIVE",
						duration: duration ?? null,
						scheduledEnd,
					},
				});

				await prisma.poll.update({
					where: { id: pollId },
					data: { status: "LIVE" },
				});

				serverEvents.emit("poll:started", {
					pollId: poll.id,
					runId: pollRun.id,
				});
				serverEvents.emit("poll:update", { pollId: poll.id });

				// Schedule auto-end if duration provided
				if (duration && duration > 0) {
					setTimeout(async () => {
						try {
							// Check there's still a LIVE run (might have been ended manually)
							const currentPoll = await prisma.poll.findUnique({
								where: { id: pollId },
							});
							if (!currentPoll || currentPoll.status !== "LIVE") return;

							const liveRun = await prisma.pollRun.findFirst({
								where: { pollId, status: "LIVE" },
							});
							if (!liveRun) return;

							await prisma.pollRun.update({
								where: { id: liveRun.id },
								data: { status: "ENDED" },
							});
							await prisma.poll.update({
								where: { id: pollId },
								data: { status: "ENDED" },
							});
							serverEvents.emit("poll:ended", { pollId });
							serverEvents.emit("poll:update", { pollId });
							console.log(`Auto-ended poll ${pollId} (timer expired)`);
						} catch (err) {
							console.error("Failed to auto-end poll:", err);
						}
					}, duration * 1000);
				}

				res.status(201).json(pollRun);
			} catch (error) {
				res.status(500).json({ error: "Failed to start poll" });
			}
		},
	);

	router.post(
		"/polls/:id/end",
		writeAuthMiddleware,
		async (req: Request, res: Response) => {
			try {
				const pollId = req.params.id as string;
				const poll = await prisma.poll.findUnique({
					where: { id: pollId },
					include: { options: true },
				});

				if (!poll) {
					res.status(404).json({ error: "Poll not found" });
					return;
				}

				const liveRun = await prisma.pollRun.findFirst({
					where: { pollId, status: "LIVE" },
				});

				if (!liveRun) {
					res.status(400).json({ error: "No live run to end" });
					return;
				}

				const endedRun = await prisma.pollRun.update({
					where: { id: liveRun.id },
					data: { status: "ENDED" },
				});

				await prisma.poll.update({
					where: { id: pollId },
					data: { status: "ENDED" },
				});

				serverEvents.emit("poll:ended", {
					pollId: poll.id,
					runId: endedRun.id,
				});

				res.json(endedRun);
			} catch (error) {
				res.status(500).json({ error: "Failed to end poll" });
			}
		},
	);

	router.get(
		"/polls/:id/runs",
		authMiddleware,
		async (req: Request, res: Response) => {
			try {
				const pollId = req.params.id as string;
				const runs = await prisma.pollRun.findMany({
					where: { pollId },
					include: {
						_count: {
							select: { votes: true },
						},
					},
					orderBy: { runNumber: "desc" },
				});

				res.json(runs);
			} catch (error) {
				res.status(500).json({ error: "Failed to fetch runs" });
			}
		},
	);

	router.delete(
		"/polls/:id/runs/:runId",
		writeAuthMiddleware,
		async (req: Request, res: Response) => {
			try {
				const { id: pollId, runId } = req.params as {
					id: string;
					runId: string;
				};

				const run = await prisma.pollRun.findUnique({
					where: { id: runId },
				});

				if (!run || run.pollId !== pollId) {
					res.status(404).json({ error: "Run not found" });
					return;
				}

				if (run.status === "LIVE") {
					res.status(400).json({ error: "End poll first" });
					return;
				}

				await prisma.pollRun.delete({
					where: { id: runId },
				});

				res.status(204).send();
			} catch (error) {
				res.status(500).json({ error: "Failed to delete run" });
			}
		},
	);

	router.post(
		"/polls/:id/share-code",
		writeAuthMiddleware,
		async (req: Request, res: Response) => {
			try {
				const pollId = req.params.id as string;
				const existing = await prisma.poll.findUnique({
					where: { id: pollId },
					select: { id: true, shareCode: true },
				});

				if (!existing) {
					res.status(404).json({ error: "Poll not found" });
					return;
				}

				if (existing.shareCode) {
					res.json({ shareCode: existing.shareCode });
					return;
				}

				let shareCode: string | null = null;
				for (let attempt = 0; attempt < 5; attempt++) {
					const candidate = generateCode();
					const conflict = await prisma.poll.findUnique({
						where: { shareCode: candidate },
						select: { id: true },
					});
					if (!conflict) {
						shareCode = candidate;
						break;
					}
				}

				if (!shareCode) {
					res
						.status(500)
						.json({ error: "Failed to generate unique share code" });
					return;
				}

				await prisma.poll.update({
					where: { id: pollId },
					data: { shareCode },
				});
				res.json({ shareCode });
			} catch (error) {
				res.status(500).json({ error: "Failed to generate share code" });
			}
		},
	);

	router.post(
		"/polls/:id/import",
		writeAuthMiddleware,
		async (req: Request, res: Response) => {
			try {
				const pollId = req.params.id as string;
				const sourcePoll = await prisma.poll.findUnique({
					where: { id: pollId },
					include: { options: true },
				});

				if (!sourcePoll) {
					res.status(404).json({ error: "Poll not found" });
					return;
				}

				const userId = req.headers["x-user-id"] as string;

				const newPoll = await prisma.poll.create({
					data: {
						question: sourcePoll.question,
						channelId: sourcePoll.channelId,
						guildId: sourcePoll.guildId,
						voteType: sourcePoll.voteType,
						liveTheme: sourcePoll.liveTheme,
						ownerId: userId,
						options: {
							create: sourcePoll.options.map((opt) => ({
								number: opt.number,
								label: opt.label,
								image: opt.image,
							})),
						},
					},
					include: {
						options: true,
					},
				});

				res.status(201).json(newPoll);
			} catch (error) {
				res.status(500).json({ error: "Failed to import poll" });
			}
		},
	);

	router.post(
		"/check-channel",
		writeAuthMiddleware,
		async (req: Request, res: Response) => {
			try {
				const { guildId, channelId } = req.body as {
					guildId: string;
					channelId: string;
				};

				if (!guildId || !channelId) {
					res
						.status(400)
						.json({ error: " guildId and channelId are required" });
					return;
				}

				try {
					const guild = await discordClient.guilds.fetch(guildId);
					const channel = await guild.channels.fetch(channelId);

					if (!channel) {
						res.json({ accessible: false, error: "Channel not found" });
						return;
					}

					const me = guild.members.me;
					if (!me) {
						res.json({ accessible: false, error: "Bot not in guild" });
						return;
					}

					const permissions = channel.permissionsFor(me);
					if (!permissions || !permissions.has("ViewChannel")) {
						res.json({
							accessible: false,
							error: "Bot lacks permission to view channel",
						});
						return;
					}

					res.json({ accessible: true });
				} catch (error: unknown) {
					const err = error as { code?: string; message?: string };
					console.error("Channel check error:", err);

					if (
						err.code === "UnknownGuild" ||
						err.message?.includes("Unknown Guild")
					) {
						res.json({
							accessible: false,
							error: "Guild not found or bot not in it",
						});
					} else if (err.code === "UnknownChannel") {
						res.json({ accessible: false, error: "Channel not found" });
					} else {
						res.json({
							accessible: false,
							error: err.message || "Failed to check channel",
						});
					}
				}
			} catch (error) {
				res.status(500).json({ error: "Failed to check channel" });
			}
		},
	);

	return router;
}
