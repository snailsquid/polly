import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPoll } from '@/lib/api';
import type { Option } from '@/types';

const THEMES = ['bar', 'pie', 'number'] as const;

interface VoteCount {
  option: number;
  count: number;
  percentage: number;
}

function AnimatedBar({ percentage, label, count, delay }: { percentage: number; label: string; count: number; delay: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), delay);
    return () => clearTimeout(timer);
  }, [percentage, delay]);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono">{count} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="h-6 bg-secondary rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all duration-700 ease-out" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function BarChart({ votes }: { votes: VoteCount[] }) {
  return (
    <div className="space-y-4">
      {votes.map((v, i) => (
        <AnimatedBar key={v.option} percentage={v.percentage} label={`Option ${v.option}`} count={v.count} delay={i * 200} />
      ))}
    </div>
  );
}

function PieChart({ votes, options }: { votes: VoteCount[]; options: Option[] }) {
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
      const sliceAngle = vote.percentage * 3.6;
      const startAngle = i === 0 ? 0 : acc[i - 1].endAngle;
      acc.push({
        option: vote.option,
        label: option?.label || `Option ${vote.option}`,
        count: vote.count,
        percentage: vote.percentage,
        startAngle,
        endAngle: startAngle + sliceAngle,
        color: colorMap.get(vote.option) || colors[vote.option - 1],
      });
      return acc;
    }, []);
  }, [votes, options]);

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
      {votes.map((vote, i) => {
        const option = options.find((o) => o.number === vote.option);
        return (
          <Card key={vote.option} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 200}ms`, animationFillMode: 'both' }}>
            <CardContent className="text-center py-6">
              <div className="text-5xl font-bold">{vote.count}</div>
              <div className="text-sm text-muted-foreground mt-2">{option?.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{vote.percentage.toFixed(1)}%</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [theme, setTheme] = useState('bar');

  const { data: poll, isLoading } = useQuery({
    queryKey: ['poll', id],
    queryFn: () => getPoll(id!),
    enabled: !!id,
  });

  const votes: VoteCount[] = useMemo(() => {
    const countMap = new Map<number, number>();
    poll?.votes.forEach((v) => {
      countMap.set(v.option, (countMap.get(v.option) || 0) + 1);
    });
    const total = poll?.votes.length || 0;
    return (poll?.options || []).map((o) => {
      const count = countMap.get(o.number) || 0;
      return {
        option: o.number,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      };
    });
  }, [poll]);

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!poll) {
    return <div className="text-center py-8">Poll not found</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{poll.question}</h1>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">Final Results</CardTitle>
        </CardHeader>
        <CardContent>
          {theme === 'bar' && <BarChart votes={votes} />}
          {theme === 'pie' && <PieChart votes={votes} options={poll.options} />}
          {theme === 'number' && <NumberDisplay votes={votes} options={poll.options} />}
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        Total votes: {poll.votes.length}
      </div>

      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={() => navigate('/')}>Back to Home</Button>
        <Button onClick={() => navigate('/poll/new')}>Start New Poll</Button>
      </div>
    </div>
  );
}