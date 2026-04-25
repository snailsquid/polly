// Bun automatically loads .env files via Bun.env
// For Node.js target, we use process.env directly

export const env = {
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN ?? '',
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  WS_PORT: parseInt(process.env.WS_PORT ?? '8080', 10),
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  WHITELIST_USER_IDS: (process.env.WHITELIST_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0),
} as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getEnv() {
  return {
    DISCORD_BOT_TOKEN: requireEnv('DISCORD_BOT_TOKEN'),
    DATABASE_URL: requireEnv('DATABASE_URL'),
    WS_PORT: parseInt(process.env.WS_PORT ?? '8080', 10),
    PORT: parseInt(process.env.PORT ?? '3000', 10),
    WHITELIST_USER_IDS: (process.env.WHITELIST_USER_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0),
  };
}