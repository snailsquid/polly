import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPoll, endPoll } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/contexts/useAuth';
import { toast } from 'sonner';
import type { Option, PollRun } from '@/types';

const THEMES = ['bar', 'pie', 'number'] as const;

interface VoteCount {
  option: number;
  count: number;
}

function BarChart({ votes, options }: { votes: VoteCount[]; options: Option[] }) {
  const maxVotes = Math.max(...votes.map((v) => v.count), 1);
  return (
    <div className="space-y-3">
      {votes.map((vote) => {
        const option = options.find((o) => o.number === vote.option);
        const percentage = (vote.count / maxVotes) * 100;
        return (
          <div key={vote.option} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{option?.label || `Option ${vote.option}`}</span>
              <span className="font-mono">{vote.count}</span>
            </div>
            <div className="h-4 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PieChart({ votes, options }: { votes: VoteCount[]; options: Option[] }) {
  const total = votes.reduce((sum, v) => sum + v.count, 0);
  const slices = useMemo(() => {
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#06b6d4', '#f97316', '#64748b'];
    const colorMap = new Map(options.map((o, i) => [o.number, colors[i % colors.length]]));
    return votes.reduce<Array<{
      option: number;
      label: string;
      count: number;
      percentage: number;
      startAngle: number;
      endAngle: number;
      color: string;
    }>>((acc, vote, i) => {
      const option = options.find((o) => o.number === vote.option);
      const percentage = total > 0 ? (vote.count / total) * 100 : 0;
      const sliceAngle = (percentage / 100) * 360;
      const startAngle = i === 0 ? 0 : acc[i - 1].endAngle;
      acc.push({
        option: vote.option,
        label: option?.label || `Option ${vote.option}`,
        count: vote.count,
        percentage,
        startAngle,
        endAngle: startAngle + sliceAngle,
        color: colorMap.get(vote.option) || colors[vote.option - 1],
      });
      return acc;
    }, []);
  }, [votes, options, total]);

  const radius = 80;
  const centerX = 100;
  const centerY = 100;

  const describeArc = (startAngle: number, endAngle: number) => {
    const start = (startAngle - 90) * (Math.PI / 180);
    const end = (endAngle - 90) * (Math.PI / 180);
    const x1 = centerX + radius * Math.cos(start);
    const y1 = centerY + radius * Math.sin(start);
    const x2 = centerX + radius * Math.cos(end);
    const y2 = centerY + radius * Math.sin(end);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 200 200" className="w-48 h-48">
        {slices.map((slice, i) => (
          <path key={i} d={describeArc(slice.startAngle, slice.endAngle)} fill={slice.color} />
        ))}
      </svg>
      <div className="flex flex-wrap justify-center gap-3">
        {slices.map((slice) => (
          <div key={slice.option} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: slice.color }} />
            <span>{slice.label}: {slice.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NumberDisplay({ votes, options }: { votes: VoteCount[]; options: Option[] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {votes.map((vote) => {
        const option = options.find((o) => o.number === vote.option);
        return (
          <Card key={vote.option}>
            <CardContent className="text-center py-6">
              <div className="text-4xl font-bold">{vote.count}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {option?.label || `Option ${vote.option}`}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function LivePoll() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [theme, setTheme] = useState('bar');
  const { votes: wsVotes } = useWebSocket(id);
  const prevVotesRef = useRef<string>('');
  const lastAnnounceRef = useRef<number>(0);
  const [announcement, setAnnouncement] = useState('');

  const { data: poll, isLoading } = useQuery({
    queryKey: ['poll', id],
    queryFn: () => getPoll(id!),
    enabled: !!id,
  });

  const votes: VoteCount[] = useMemo(() => {
    const liveRun = poll?.runs?.find((r: PollRun) => r.status === 'LIVE');
    const runVotes = wsVotes.length > 0 ? wsVotes : (liveRun?.votes || []);
    const countMap = new Map<number, number>();
    runVotes.forEach((v: { option: number }) => {
      countMap.set(v.option, (countMap.get(v.option) || 0) + 1);
    });
    return poll?.options.map((o) => ({
      option: o.number,
      count: countMap.get(o.number) || 0,
    })) || [];
  }, [wsVotes, poll]);

  useEffect(() => {
    const voteKey = votes.map((v) => `${v.option}:${v.count}`).join(',');
    if (prevVotesRef.current && prevVotesRef.current !== voteKey) {
      const now = Date.now();
      if (now - lastAnnounceRef.current >= 3000) {
        const parts = votes.map((v) => {
          const option = poll?.options.find((o) => o.number === v.option);
          const label = option?.label || `Option ${v.option}`;
          return `${label}: ${v.count} votes`;
        });
        setAnnouncement(parts.join(', '));
        lastAnnounceRef.current = now;
      }
    }
    prevVotesRef.current = voteKey;
  }, [votes, poll?.options]);

  const endMutation = useMutation({
    mutationFn: endPoll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poll', id] });
      toast.success('Poll ended');
      navigate(`/poll/${id}`);
    },
    onError: (error) => {
      toast.error((error as { error?: string }).error || 'Failed to end poll');
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!poll) {
    return <div className="text-center py-8">Poll not found</div>;
  }

  const isOwner = poll.ownerId === userId;
  const liveRun = poll.runs?.find((r: PollRun) => r.status === 'LIVE');
  const isLive = !!liveRun;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/poll/${id}`)}>
            ← Back to Edit
          </Button>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-center">
          <h1 className="text-xl font-bold text-center">{poll.question}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!isLive ? (
            <Button variant="secondary" size="sm" onClick={() => navigate(`/poll/${id}/results`)}>
              View Results
            </Button>
          ) : (
            <Select value={theme} onValueChange={(v) => v && setTheme(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEMES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isOwner && isLive && (
            <Button onClick={() => endMutation.mutate(poll.id)} disabled={endMutation.isPending}>
              {endMutation.isPending ? 'Ending...' : 'End Live'}
            </Button>
          )}
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-center">{isLive ? 'Live Results' : 'Results'}</CardTitle>
          </CardHeader>
          <CardContent>
            {theme === 'bar' && <BarChart votes={votes} options={poll.options} />}
            {theme === 'pie' && <PieChart votes={votes} options={poll.options} />}
            {theme === 'number' && <NumberDisplay votes={votes} options={poll.options} />}
          </CardContent>
        </Card>
      </main>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}