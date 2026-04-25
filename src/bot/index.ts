import { EventEmitter } from 'events';
import { Client, GatewayIntentBits } from 'discord.js';
import { messageCreateHandler } from './handlers/messageCreate';
import { env } from '../env';

export const botEvents = new EventEmitter();

export const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

discordClient.on('messageCreate', (message) => {
  messageCreateHandler(message, botEvents);
});

discordClient.on('ready', () => {
  console.log('Connected to Discord');
});

export function startBot(): void {
  discordClient.login(env.DISCORD_BOT_TOKEN);
}