import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createPoll } from '@/lib/api';
import { toast } from 'sonner';
import type { Option } from '@/types';

const THEMES = ['bar', 'pie', 'number'] as const;

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export default function CreatePoll() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [channelId, setChannelId] = useState('');
  const [guildId, setGuildId] = useState('');
  const [liveTheme, setLiveTheme] = useState<string>('bar');
  const [resultTheme, setResultTheme] = useState<string>('bar');
  const [options, setOptions] = useState<Option[]>([
    { id: generateId(), number: 1, label: '' },
    { id: generateId(), number: 2, label: '' },
  ]);

  const mutation = useMutation({
    mutationFn: createPoll,
    onSuccess: (poll) => {
      toast.success('Poll created');
      navigate(`/poll/${poll.id}`);
    },
    onError: (error) => {
      toast.error((error as { error?: string }).error || 'Failed to create poll');
    },
  });

  const debouncedSave = useCallback(() => {
    if (question.trim() && options.some((o) => o.label.trim())) {
      mutation.mutate({
        question,
        channelId,
        guildId,
        liveTheme,
        resultTheme,
        options: options.filter((o) => o.label.trim()),
      });
    }
  }, [question, channelId, guildId, liveTheme, resultTheme, options, mutation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (question.trim()) {
        debouncedSave();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [question, debouncedSave]);

  const addOption = () => {
    if (options.length < 9) {
      setOptions([...options, { id: generateId(), number: options.length + 1, label: '' }]);
    }
  };

  const removeOption = (id: string) => {
    if (options.length > 1) {
      setOptions(options.filter((o) => o.id !== id).map((o, i) => ({ ...o, number: i + 1 })));
    }
  };

  const updateOption = (id: string, label: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, label } : o)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error('Question is required');
      return;
    }
    if (options.filter((o) => o.label.trim()).length < 2) {
      toast.error('At least 2 options are required');
      return;
    }
    mutation.mutate({
      question,
      channelId,
      guildId,
      liveTheme,
      resultTheme,
      options: options.filter((o) => o.label.trim()),
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Create Poll</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="What would you like to ask?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="channelId">Channel ID</Label>
                <Input
                  id="channelId"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  placeholder="Discord channel ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guildId">Guild ID</Label>
                <Input
                  id="guildId"
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                  placeholder="Discord guild ID"
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
              <Select value={liveTheme} onValueChange={(v) => v && setLiveTheme(v)}>
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
              <Select value={resultTheme} onValueChange={(v) => v && setResultTheme(v)}>
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
            {options.map((option, index) => (
              <div key={option.id} className="flex gap-2 items-center">
                <Select
                  value={String(option.number)}
                  onValueChange={(v) => {
                    if (v) {
                      const num = parseInt(v, 10);
                      setOptions(options.map((o) => (o.id === option.id ? { ...o, number: num } : o)));
                    }
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={option.label}
                  onChange={(e) => updateOption(option.id, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(option.id)}
                  disabled={options.length <= 1}
                >
                  ×
                </Button>
              </div>
            ))}
            {options.length < 9 && (
              <Button type="button" variant="outline" onClick={addOption}>
                Add Option
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Poll'}
          </Button>
        </div>
      </form>
    </div>
  );
}