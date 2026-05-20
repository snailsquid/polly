import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPoll, updatePoll, deletePoll, startPoll, endPoll, deleteRun } from '@/lib/api';
import { updatePollSchema } from '@/lib/schemas';
import { useAuth } from '@/contexts/useAuth';
import { toast } from 'sonner';
import type { Poll, Option } from '@/types';

const THEMES = ['bar', 'pie', 'number'] as const;

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

interface FieldErrors {
  question?: string;
  options?: string;
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { data: poll, isLoading } = useQuery({
    queryKey: ['poll', id],
    queryFn: () => getPoll(id!),
    enabled: !!id,
  });

  const initRef = useRef(false);
  useEffect(() => {
    if (poll && !initRef.current) {
      initRef.current = true;
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
    onSuccess: (poll) => {
      queryClient.invalidateQueries({ queryKey: ['poll', id] });
      toast.success('Poll started');
      navigate(`/poll/${poll.pollId}/live`);
    },
    onError: (error) => {
      toast.error((error as { error?: string }).error || 'Failed to start poll');
    },
  });

  const endMutation = useMutation({
    mutationFn: () => endPoll(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poll', id] });
      toast.success('Poll ended');
    },
    onError: (error) => {
      toast.error((error as { error?: string }).error || 'Failed to end poll');
    },
  });

  const validateForm = useCallback((): boolean => {
    const validOptions = options.filter((o) => o.label.trim());
    const result = updatePollSchema.safeParse({
      question,
      channelId,
      guildId,
      liveTheme,
      resultTheme,
      options: validOptions.map((o) => ({ label: o.label, number: o.number })),
    });

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const err of result.error.issues) {
        if (err.path[0] === 'options' && err.path.length === 1) {
          errors.options = err.message;
        } else if (err.path[0] === 'question') {
          errors.question = err.message;
        }
      }
      setFieldErrors(errors);
      return false;
    }
    setFieldErrors({});
    return true;
  }, [question, channelId, guildId, liveTheme, resultTheme, options]);

  const debouncedSave = useCallback(() => {
    if (poll && question !== poll.question) {
      updateMutation.mutate({ question });
    }
  }, [poll, question, updateMutation]);

  useEffect(() => {
    const timer = setTimeout(debouncedSave, 1000);
    return () => clearTimeout(timer);
  }, [debouncedSave]);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateForm();
  };

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
  const showError = (field: keyof FieldErrors) => touched[field] && fieldErrors[field];

  return (
    <div id="main-content" className="container mx-auto p-4 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Poll</h1>
        <div className="flex gap-2">
          {(() => {
            const hasLiveRun = poll.runs?.some(r => r.status === 'LIVE');
            if (hasLiveRun) {
              return (
                <Button variant="secondary" onClick={() => navigate(`/poll/${poll.id}/live`)}>
                  View Live
                </Button>
              );
            }
            if (poll.status === 'DRAFT') {
              return (
                <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
                  {startMutation.isPending ? 'Starting...' : 'Start Poll'}
                </Button>
              );
            }
            if (poll.status === 'ENDED') {
              return (
                <Button variant="secondary" onClick={() => navigate(`/poll/${poll.id}/results`)}>
                  View Results
                </Button>
              );
            }
            return null;
          })()}
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
              onBlur={() => handleBlur('question')}
              disabled={!isOwner}
            />
            {showError('question') && (
              <p className="text-sm text-destructive">{fieldErrors.question}</p>
            )}
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
                onBlur={() => handleBlur('options')}
                placeholder={`Option ${option.number}`}
                className="flex-1"
                disabled={!isOwner}
              />
            </div>
          ))}
          {fieldErrors.options && touched.options && (
            <p className="text-sm text-destructive">{fieldErrors.options}</p>
          )}
          {isOwner && poll.status === 'DRAFT' && (
            <Button type="button" variant="outline" onClick={addOption} disabled={options.length >= 9}>
              Add Option
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Run History</CardTitle>
        </CardHeader>
        <CardContent>
          {poll.runs && poll.runs.length > 0 ? (
            <div className="space-y-2">
              {poll.runs.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm px-2 py-1 bg-muted rounded">
                      Run {run.runNumber}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      run.status === 'LIVE' ? 'bg-green-100 text-green-800' :
                      run.status === 'ENDED' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {run.status}
                    </span>
                    {run._count && (
                      <span className="text-sm text-muted-foreground">
                        {run._count.votes} vote{run._count.votes !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {run.status === 'LIVE' ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => endMutation.mutate()}
                      disabled={endMutation.isPending}
                    >
                      {endMutation.isPending ? 'Ending...' : 'End Live'}
                    </Button>
                  ) : run.status === 'ENDED' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/poll/${poll.id}/results`)}
                      >
                        See Results
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete Run ${run.runNumber}? This cannot be undone.`)) {
                            deleteRun(poll.id, run.id).then(() => {
                              queryClient.invalidateQueries({ queryKey: ['poll', id] });
                              toast.success(`Run ${run.runNumber} deleted`);
                            }).catch((err) => {
                              toast.error(err.error || 'Failed to delete run');
                            });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No runs yet. Start the poll to create Run 1.</p>
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