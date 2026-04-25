import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getPolls, startPoll, importPoll } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Poll } from '@/types';

const statusColors: Record<Poll['status'], string> = {
  DRAFT: 'bg-gray-500',
  LIVE: 'bg-green-500',
  ENDED: 'bg-blue-500',
};

export default function Home() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState({ messageId: '', channelId: '', guildId: '' });

  const { data: polls, isLoading } = useQuery({
    queryKey: ['polls'],
    queryFn: getPolls,
  });

  const startMutation = useMutation({
    mutationFn: startPoll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      toast.success('Poll started');
    },
    onError: (error) => {
      toast.error((error as { error?: string }).error || 'Failed to start poll');
    },
  });

  const importMutation = useMutation({
    mutationFn: importPoll,
    onSuccess: (poll) => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      setImportOpen(false);
      setImportData({ messageId: '', channelId: '', guildId: '' });
      toast.success('Poll imported');
      navigate(`/poll/${poll.id}`);
    },
    onError: (error) => {
      toast.error((error as { error?: string }).error || 'Failed to import poll');
    },
  });

  return (
    <div className="container mx-auto p-4 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Polly</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">User: {userId}</span>
          <Button onClick={() => navigate('/poll/new')}>Create Poll</Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>Import</Button>
        </div>
      </header>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : polls?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No polls yet. Create one to get started!
          </CardContent>
        </Card>
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
                {poll.status === 'DRAFT' && (
                  <Button size="sm" onClick={() => startMutation.mutate(poll.id)}>
                    Start
                  </Button>
                )}
                {poll.status === 'LIVE' && (
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/poll/${poll.id}/live`)}>
                    View Live
                  </Button>
                )}
                {poll.status === 'ENDED' && (
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/poll/${poll.id}/results`)}>
                    View Results
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => navigate(`/poll/${poll.id}`)}>
                  Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Poll from Discord</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="messageId">Message ID</Label>
              <Input
                id="messageId"
                value={importData.messageId}
                onChange={(e) => setImportData({ ...importData, messageId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channelId">Channel ID</Label>
              <Input
                id="channelId"
                value={importData.channelId}
                onChange={(e) => setImportData({ ...importData, channelId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guildId">Guild ID</Label>
              <Input
                id="guildId"
                value={importData.guildId}
                onChange={(e) => setImportData({ ...importData, guildId: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={() => importMutation.mutate(importData)} disabled={importMutation.isPending}>
              {importMutation.isPending ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}