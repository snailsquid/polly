import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/useAuth';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUserId, setUser } = useAuth();

  useEffect(() => {
    const userParam = searchParams.get('user');
    if (userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam)) as {
          id: string;
          username: string;
          avatar: string;
        };
        setUserId(userData.id);
        setUser(userData);
        navigate('/');
      } catch {
        console.error('Failed to parse user data');
      }
    }
  }, [searchParams, setUserId, setUser, navigate]);

  const handleDiscordLogin = () => {
    window.location.href = `${BASE_URL}/api/auth/discord`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome to Polly</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <p className="text-muted-foreground text-center">
            Login with your Discord account to create and manage polls
          </p>
          <Button onClick={handleDiscordLogin} size="lg" className="w-full">
            Login with Discord
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}