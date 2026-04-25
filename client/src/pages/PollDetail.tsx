import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPoll, updatePoll, deletePoll, startPoll } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Poll, Option } from '@/types';

const THEMES = ['bar', 'pie', 'number'] as const;

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export default function PollDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [question, setQuestion] = useState('');
  const [channelId, setChannelId] = useState('');
  const [guildId, setGuildId] = useState('');
  const [liveTheme, setLiveTheme] = useState('bar');
  const [resultTheme, setResultTheme] = useState('bar');
  const [options, setOptions] = useState<Option[]>([]);

  const { data: poll, isLoading } = useQuery({
    queryKey: ['poll', id],
    queryFn: () => getPoll(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (poll) {
      setQuestion(poll.question);
      setChannelId(poll.channelId);
      setGuildId(poll.guildId);
      setLiveTheme(poll.liveTheme);
      setResultTheme(poll.resultTheme);
      setOptions(poll.options);
    }
  }, [poll]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Poll>) => updatePoll(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poll', id] });
      toast.success('Poll updated');
    },
    onError: (error) => {
      toast.error((error as { error?: string }).error || 'Failed to update poll');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePoll(id!),
    onSuccess: () => {
      toast.success('Poll deleted');
      navigate('/');
    },
    onError: (error) => {
      toast.error((error as { error?: string }).error || 'Failed to delete poll');
    },
  });

  const startMutation = useMutation({
    mutationFn: () => startPoll(id!),
    onSuccess: (updatedPoll) => {
      queryClient.invalidateQueries({ queryKey: ['poll', id] });
      toast.success('Poll started');
      navigate(`/poll/${updatedPoll.id}/live`);
    },
    onError: (error) => {
      toast.error((error as { error?: string }).error || 'Failed to start poll');
    },
  });

  const debouncedSave = useCallback(() => {
    if (poll && question !== poll.question) {
      updateMutation.mutate({ question });
    }
  }, [poll, question, updateMutation]);

  useEffect(() => {
    const timer = setTimeout(debouncedSave, 1000);
    return () => clearTimeout(timer);
  }, [debouncedSave]);

  const addOption = () => {
    if (options.length < 9) {
      setOptions([...options, { id: generateId(), number: options.length + 1, label: '' }]);
    }
  };

  const updateOption = (id: string, label: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, label } : o)));
    updateMutation.mutate({ options: options.map((o) => (o.id === id ? { ...o, label } : o)) });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!poll) {
    return <div className="text-center py-8">Poll not found</div>;
  }

  const isOwner = poll.ownerId === userId;

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Poll</h1>
        <div className="flex gap-2">
          {poll.status === 'DRAFT' && (
            <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
              {startMutation.isPending ? 'Starting...' : 'Start Poll'}
            </Button>
          )}
          {poll.status === 'LIVE' && (
            <Button variant="secondary" onClick={() => navigate(`/poll/${poll.id}/live`)}>
              View Live
            </Button>
          )}
          {poll.status === 'ENDED' && (
            <Button variant="secondary" onClick={() => navigate(`/poll/${poll.id}/results`)}>
              View Results
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={!isOwner}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="channelId">Channel ID</Label>
              <Input
                id="channelId"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                disabled={!isOwner}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guildId">Guild ID</Label>
              <Input
                id="guildId"
                value={guildId}
                onChange={(e) => setGuildId(e.target.value)}
                disabled={!isOwner}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Themes</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Live Theme</Label>
            <Select value={liveTheme} onValueChange={(v) => v && setLiveTheme(v)} disabled={!isOwner}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEMES.map((theme) => (
                  <SelectItem key={theme} value={theme}>
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Result Theme</Label>
            <Select value={resultTheme} onValueChange={(v) => v && setResultTheme(v)} disabled={!isOwner}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEMES.map((theme) => (
                  <SelectItem key={theme} value={theme}>
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {options.map((option) => (
            <div key={option.id} className="flex gap-2 items-center">
              <span className="w-8 text-center font-mono">{option.number}</span>
              <Input
                value={option.label}
                onChange={(e) => updateOption(option.id, e.target.value)}
                placeholder={`Option ${option.number}`}
                className="flex-1"
                disabled={!isOwner}
              />
            </div>
          ))}
          {isOwner && poll.status === 'DRAFT' && (
            <Button type="button" variant="outline" onClick={addOption} disabled={options.length >= 9}>
              Add Option
            </Button>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <div className="flex justify-between">
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm('Are you sure you want to delete this poll?')) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Poll'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back
          </Button>
        </div>
      )}
    </div>
  );
}