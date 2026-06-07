import { useState, useRef, useEffect, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Moon, Sun, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { getPolls, startPoll, getPollByCode, deletePoll } from '@/lib/api';
import { UserMenu } from '@/components/user-menu';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/useAuth';
import { toast } from 'sonner';
import type { Poll } from '@/types';

const statusColors: Record<Poll['status'], string> = {
  DRAFT: 'bg-gray-500',
  LIVE: 'bg-green-500',
  ENDED: 'bg-blue-500',
};

function HomeSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-1/3 mt-2" />
          </CardHeader>
          <CardContent className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [codeOpen, setCodeOpen] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const codeButtonRef = useRef<HTMLButtonElement>(null);
  const codeTitleId = useId();

  const handleCodeOpenChange = (open: boolean) => {
    setCodeOpen(open);
    if (!open) {
      setShareCode('');
      setCodeError('');
      setTimeout(() => codeButtonRef.current?.focus(), 0);
    }
  };

  useEffect(() => {
    if (!codeOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCodeOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [codeOpen]);

  const { data: polls, isLoading } = useQuery({
    queryKey: ['polls'],
    queryFn: getPolls,
  });

  const startMutation = useMutation({
    mutationFn: (pollId: string, _ctx?: unknown) => startPoll(pollId),
    onMutate: async (pollId) => {
      await queryClient.cancelQueries({ queryKey: ['polls'] });
      const previousPolls = queryClient.getQueryData<Poll[]>(['polls']);
      queryClient.setQueryData<Poll[]>(['polls'], (old) =>
        old ? old.map((p) => (p.id === pollId ? { ...p, status: 'LIVE' as const } : p)) : []
      );
      return { previousPolls };
    },
    onSuccess: (poll) => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      toast.success('Poll started');
      navigate(`/poll/${poll.pollId}/live`);
    },
    onError: (_error, _pollId, context) => {
      if (context?.previousPolls) {
        queryClient.setQueryData(['polls'], context.previousPolls);
      }
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      toast.error('Failed to start poll. Changes reverted.');
    },
  });

  const handleCodeSubmit = async () => {
    if (!shareCode.trim()) return;
    setCodeError('');
    setCodeLoading(true);
    try {
      const config = await getPollByCode(shareCode.trim());
      setCodeOpen(false);
      navigate('/poll/new', { state: { prefill: config } });
    } catch (err) {
      const apiErr = err as { error?: string };
      if (apiErr.error === 'Poll not found') {
        setCodeError('Code not found');
      } else {
        setCodeError('Failed to look up code');
      }
    } finally {
      setCodeLoading(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: deletePoll,
    onMutate: async (pollId) => {
      await queryClient.cancelQueries({ queryKey: ['polls'] });
      const previousPolls = queryClient.getQueryData<Poll[]>(['polls']);
      queryClient.setQueryData<Poll[]>(['polls'], (old) =>
        old ? old.filter((p) => p.id !== pollId) : []
      );
      return { previousPolls };
    },
    onError: (_error, _pollId, context) => {
      if (context?.previousPolls) {
        queryClient.setQueryData(['polls'], context.previousPolls);
      }
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      toast.error('Failed to delete poll. Changes reverted.');
    },
    onSuccess: () => {
      toast.success('Poll deleted');
    },
  });

  return (
    <div className="container mx-auto p-4 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold shrink-0">Polly</h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="cursor-pointer min-h-[44px] min-w-[44px]"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            aria-label="Logout"
            className="cursor-pointer min-h-[44px] min-w-[44px]"
          >
            <LogOut className="h-5 w-5" />
          </Button>
          <UserMenu />
          <Button onClick={() => navigate('/poll/new')} size="sm" className="min-h-[44px]">Create Poll</Button>
          <Button ref={codeButtonRef} variant="outline" onClick={() => setCodeOpen(true)} aria-label="Paste from code" size="sm" className="min-h-[44px]">Paste from code</Button>
        </div>
      </header>

      {isLoading ? (
        <HomeSkeleton />
      ) : polls?.length === 0 ? (
        <EmptyState
          title="No polls yet"
          description="Create your first poll to start collecting votes from your Discord community."
          actionLabel="Create Poll"
          onAction={() => navigate('/poll/new')}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {polls?.map((poll) => (
            <Card key={poll.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{poll.question}</CardTitle>
                  <span className={`text-xs text-white px-2 py-1 rounded ${statusColors[poll.status]}`}>
                    {poll.status}
                  </span>
                </div>
                <CardDescription>{poll.options.length} options</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                {(() => {
                  const hasLiveRun = poll.runs?.some(r => r.status === 'LIVE');
                  if (hasLiveRun) {
                    return (
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/poll/${poll.id}/live`)}>
                        View Live
                      </Button>
                    );
                  }
                  if (poll.status === 'DRAFT') {
                    return (
                      <Button size="sm" onClick={() => startMutation.mutate(poll.id)}>
                        Start
                      </Button>
                    );
                  }
                  if (poll.status === 'ENDED') {
                    return (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => startMutation.mutate(poll.id)}>
                          Start Another Run
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/poll/${poll.id}/results`)}>
                          Results
                        </Button>
                      </div>
                    );
                  }
                  return null;
                })()}
                <Button size="sm" variant="ghost" onClick={() => navigate(`/poll/${poll.id}`)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(poll.id)}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={codeOpen} onOpenChange={handleCodeOpenChange}>
        <DialogContent titleId={codeTitleId}>
          <DialogHeader>
            <DialogTitle id={codeTitleId}>Paste from code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shareCode">Share code</Label>
              <Input
                id="shareCode"
                value={shareCode}
                onChange={(e) => { setShareCode(e.target.value); setCodeError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
                placeholder="Enter 6-character code"
              />
              {codeError && <p className="text-sm text-destructive">{codeError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCodeOpen(false)}>Cancel</Button>
            <Button onClick={handleCodeSubmit} disabled={codeLoading || !shareCode.trim()}>
              {codeLoading ? 'Looking up...' : 'Use code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
