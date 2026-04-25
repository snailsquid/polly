import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/useAuth';

export default function Login() {
  const [inputId, setInputId] = useState('');
  const navigate = useNavigate();
  const { setUserId } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputId.trim()) {
      setUserId(inputId.trim());
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome to Polly</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discord-id">Discord User ID</Label>
              <Input
                id="discord-id"
                type="text"
                placeholder="Enter your Discord User ID"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                You can find your Discord User ID by enabling Developer Mode and right-clicking your username.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={!inputId.trim()}>
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}