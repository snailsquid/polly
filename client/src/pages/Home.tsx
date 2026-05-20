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
import { getPolls, startPoll, importPoll, deletePoll } from '@/lib/api';
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
  const [importOpen, setImportOpen] = useState(false);
  const [importPollId, setImportPollId] = useState('');
  const { isDark, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const importButtonRef = useRef<HTMLButtonElement>(null);
  const importTitleId = useId();

  const handleImportOpenChange = (open: boolean) => {
    setImportOpen(open);
    if (!open) {
      setTimeout(() => importButtonRef.current?.focus(), 0);
    }
  };

  useEffect(() => {
    if (!importOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setImportOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [importOpen]);

  const { data: polls, isLoading } = useQuery({
    queryKey: ['polls'],
    queryFn: getPolls,
  });

  const startMutation = useMutation({
    mutationFn: startPoll,
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

  const importMutation = useMutation({
    mutationFn: (pollId: string) => importPoll(pollId),
    onSuccess: (poll) => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      setImportOpen(false);
      setImportPollId('');
      toast.success('Poll imported');
      navigate(`/poll/${poll.id}`);
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      toast.error((error as { error?: string }).error || 'Failed to import poll');
    },
  });

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
          <Button ref={importButtonRef} variant="outline" onClick={() => setImportOpen(true)} aria-label="Import poll" size="sm" className="min-h-[44px]">Import</Button>
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
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/poll/${poll.id}/results`)}>
                        View Results
                      </Button>
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

      <Dialog open={importOpen} onOpenChange={handleImportOpenChange}>
        <DialogContent titleId={importTitleId}>
          <DialogHeader>
            <DialogTitle id={importTitleId}>Import Poll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pollId">Poll ID</Label>
              <Input
                id="pollId"
                value={importPollId}
                onChange={(e) => setImportPollId(e.target.value)}
                placeholder="Paste the poll ID to import"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={() => importMutation.mutate(importPollId)} disabled={importMutation.isPending || !importPollId.trim()}>
              {importMutation.isPending ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
