import { startBot, botEvents } from "./bot";
import { startServer } from "./server";
import { serverEvents } from "./events";
import { prisma } from "./db/client";

botEvents.on(
	"vote",
	(data: { pollId: string; text: string; userId: string }) => {
		serverEvents.emit("vote", data);
	},
);

botEvents.on("poll:start", (data: { pollId: string }) => {
	serverEvents.emit("poll:start", data);
});

botEvents.on("poll:end", (data: { pollId: string }) => {
	serverEvents.emit("poll:end", data);
});

async function shutdown(): Promise<void> {
	console.log("Shutting down gracefully...");
	await prisma.$disconnect();
	process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startBot();
startServer();
