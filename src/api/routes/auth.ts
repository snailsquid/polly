import { Router, Request, Response } from 'express';

const DISCORD_OAUTH_URL = 'https://discord.com/api/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_API_URL = 'https://discord.com/api/v10';

export function createAuthRouter(): Router {
  const router = Router();

  router.get('/discord', (_req: Request, res: Response) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

    if (!clientId) {
      res.status(500).json({ error: 'Discord OAuth not configured' });
      return;
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify',
    });

    const oauthUrl = `${DISCORD_OAUTH_URL}?${params.toString()}`;
    res.redirect(oauthUrl);
  });

  router.get('/callback', async (req: Request, res: Response) => {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Missing authorization code' });
      return;
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

    if (!clientId || !clientSecret) {
      res.status(500).json({ error: 'Discord OAuth not configured' });
      return;
    }

    try {
      const tokenResponse = await fetch(DISCORD_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', await tokenResponse.text());
        res.status(401).json({ error: 'Failed to exchange code for token' });
        return;
      }

      const tokenData = await tokenResponse.json() as { access_token: string };

      const userResponse = await fetch(`${DISCORD_API_URL}/users/@me`, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        console.error('User fetch failed:', await userResponse.text());
        res.status(401).json({ error: 'Failed to fetch user info' });
        return;
      }

      const userData = await userResponse.json() as { id: string; username: string; avatar: string };

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/login?user=${encodeURIComponent(JSON.stringify({
        id: userData.id,
        username: userData.username,
        avatar: userData.avatar,
      }))}`;

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).json({ error: 'OAuth callback failed' });
    }
  });

  return router;
}