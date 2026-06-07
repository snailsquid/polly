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

const THEMES = ['bar', 'pie', 'number', 'tree'] as const;

interface VoteCount {
  option: number;
  count: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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

const TREE_PALETTE = [
  { trunk: '#854d0e', leaves: '#15803d', bloom: '#4ade80' },
  { trunk: '#78350f', leaves: '#b45309', bloom: '#fbbf24' },
  { trunk: '#7f1d1d', leaves: '#be123c', bloom: '#fb7185' },
  { trunk: '#1e3a8a', leaves: '#1d4ed8', bloom: '#60a5fa' },
  { trunk: '#4c1d95', leaves: '#6d28d9', bloom: '#c084fc' },
  { trunk: '#134e4a', leaves: '#0f766e', bloom: '#2dd4bf' },
  { trunk: '#831843', leaves: '#9d174d', bloom: '#f9a8d4' },
  { trunk: '#365314', leaves: '#4d7c0f', bloom: '#a3e635' },
];

interface Branch { x1: number; y1: number; x2: number; y2: number; width: number; level: number; }
interface Tip { x: number; y: number; r: number; }

function buildTree(cx: number, groundY: number, votes: number, seed: number = 0): { branches: Branch[]; tips: Tip[]; topY: number } {
  if (votes === 0) return { branches: [], tips: [], topY: groundY - 8 };

  // Seeded LCG — stable per-tree randomness, no re-randomization on re-render
  let s = (seed * 1664525 + 1013904223) >>> 0;
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967295; };

  // Rapid early growth (sprout phase), then steady upward growth
  const trunkH = votes <= 5
    ? votes * 17
    : Math.min(85 + (votes - 5) * 6, 190);

  // Thick central trunk — the main character
  const trunkW = Math.min(2 + votes * 0.55, 12);

  const branches: Branch[] = [];
  const tips: Tip[] = [];

  // The one big trunk — straight up
  branches.push({ x1: cx, y1: groundY, x2: cx, y2: groundY - trunkH, width: trunkW, level: 0 });

  // Side branches: each branch is a single independent arm on one random side
  if (votes >= 3) {
    const numBranches = Math.min(1 + Math.floor(votes / 2), 7);
    const usedH: number[] = [];

    const addBranch = (bY: number, baseBLen: number, bW: number, dir: number) => {
      const bLen = baseBLen * (0.80 + rng() * 0.40);
      const ex = cx + dir * bLen * (0.78 + (rng() - 0.5) * 0.24);
      const ey = bY - bLen * (0.38 + (rng() - 0.5) * 0.22);
      branches.push({ x1: cx, y1: bY, x2: ex, y2: ey, width: bW, level: 1 });

      // ~30% chance: fork into 2 sub-branches; leaves live on sub-branches, not main tip
      if (rng() < 0.30 && bLen > 9) {
        const subW = Math.max(bW * 0.55, 0.5);
        // sub 1 — continues mostly outward
        const s1Len = bLen * (0.35 + rng() * 0.28);
        const s1x = ex + dir * s1Len * (0.55 + rng() * 0.38);
        const s1y = ey - s1Len * (0.50 + rng() * 0.38);
        branches.push({ x1: ex, y1: ey, x2: s1x, y2: s1y, width: subW, level: 2 });
        const r1 = Math.min(Math.max(2.5, s1Len * 0.28), 5.5) * (0.75 + rng() * 0.50);
        tips.push({ x: s1x, y: s1y - r1 * 0.2, r: r1 });
        // sub 2 — veers more upward
        const s2Len = bLen * (0.35 + rng() * 0.28);
        const s2x = ex + dir * s2Len * (0.12 + rng() * 0.28);
        const s2y = ey - s2Len * (0.68 + rng() * 0.28);
        branches.push({ x1: ex, y1: ey, x2: s2x, y2: s2y, width: subW, level: 2 });
        const r2 = Math.min(Math.max(2.5, s2Len * 0.28), 5.5) * (0.75 + rng() * 0.50);
        tips.push({ x: s2x, y: s2y - r2 * 0.2, r: r2 });
      } else {
        // No fork: leaf sits at the main branch tip
        const leafR = Math.min(Math.max(3.5, bLen * 0.27), 7) * (0.75 + rng() * 0.50);
        tips.push({ x: ex, y: ey - leafR * 0.2, r: leafR });
      }
    };

    for (let i = 0; i < numBranches; i++) {
      let hFrac = 0.14 + rng() * 0.64;
      let tries = 0;
      while (tries++ < 8 && usedH.some(h => Math.abs(h - hFrac) < 0.11)) {
        hFrac = 0.14 + rng() * 0.64;
      }
      if (hFrac > 0.85) continue;
      usedH.push(hFrac);

      const bY = groundY - trunkH * hFrac;
      const spreadRatio = votes <= 8
        ? Math.max(0.28 - i * 0.025, 0.10)
        : Math.max(0.18 - i * 0.018, 0.07);
      const baseBLen = Math.min(trunkH * spreadRatio, 20);
      const bW = Math.max(trunkW * (0.22 + rng() * 0.10), 0.75);
      addBranch(bY, baseBLen, bW, rng() < 0.5 ? -1 : 1);
    }
  }

  // Leaf canopy crown at top of trunk
  const topTrunkY = groundY - trunkH;
  const canopyR = Math.min(8 + votes * 1.4, 38);

  tips.push({ x: cx, y: topTrunkY - canopyR * 0.35, r: canopyR });
  if (votes >= 4) {
    tips.push({ x: cx - canopyR * 0.55, y: topTrunkY + canopyR * 0.1, r: canopyR * 0.65 });
    tips.push({ x: cx + canopyR * 0.55, y: topTrunkY + canopyR * 0.1, r: canopyR * 0.65 });
  }
  if (votes >= 12) {
    tips.push({ x: cx - canopyR * 0.25, y: topTrunkY - canopyR * 0.88, r: canopyR * 0.5 });
    tips.push({ x: cx + canopyR * 0.25, y: topTrunkY - canopyR * 0.88, r: canopyR * 0.5 });
  }

  const topY = topTrunkY - canopyR * (votes >= 12 ? 1.45 : 1.0) - 4;
  return { branches, tips, topY };
}

function treeHeightNeeded(votes: number): number {
  if (votes === 0) return 14;
  const trunkH = votes <= 5 ? votes * 17 : Math.min(85 + (votes - 5) * 6, 190);
  const canopyR = Math.min(8 + votes * 1.4, 38);
  return trunkH + canopyR * (votes >= 12 ? 1.5 : 1.1) + 10;
}

function ForestChart({ votes, options }: { votes: VoteCount[]; options: Option[] }) {
  const maxVotes = Math.max(...votes.map((v) => v.count), 0);
  const n = votes.length;
  const treeSpacing = Math.max(110, Math.min(180, 700 / n));
  const svgW = Math.max(400, n * treeSpacing);

  // Dynamic height: always fits the tallest tree
  const maxTreeH = Math.max(...votes.map((v) => treeHeightNeeded(v.count)), 30);
  const groundH = 52;
  const topPad = 22;
  const svgH = maxTreeH + groundH + topPad;
  const groundY = svgH - groundH;

  return (
    <div className="w-full overflow-x-auto rounded-lg">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minHeight: '160px' }}>
        <defs>
          <linearGradient id="fSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bfdbfe" />
            <stop offset="100%" stopColor="#d1fae5" />
          </linearGradient>
          <linearGradient id="fGround" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="55%" stopColor="#166534" />
            <stop offset="100%" stopColor="#052e16" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={svgW} height={svgH} fill="url(#fSky)" rx="8" />
        <rect x="0" y={groundY} width={svgW} height={svgH - groundY} fill="url(#fGround)" />
        <line x1="0" y1={groundY} x2={svgW} y2={groundY} stroke="#86efac" strokeWidth="1.5" />

        {votes.map((vote, i) => {
          const opt = options.find((o) => o.number === vote.option);
          const cx = treeSpacing * i + treeSpacing / 2;
          const color = TREE_PALETTE[i % TREE_PALETTE.length];
          const isLeading = vote.count > 0 && vote.count === maxVotes;
          const { branches, tips, topY } = buildTree(cx, groundY, vote.count, i);

          return (
            <g key={vote.option}>
              {/* Seed for 0 votes */}
              {vote.count === 0 && (
                <ellipse cx={cx} cy={groundY - 4} rx={6} ry={4}
                  fill="#854d0e" opacity={0.75} />
              )}

              {/* Trunk + side branches */}
              {branches.map((b, bi) => (
                <line key={bi}
                  x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
                  stroke={color.trunk}
                  strokeWidth={b.width}
                  strokeLinecap="round"
                  style={{ transition: 'all 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                />
              ))}

              {/* Leaf canopy blobs */}
              {tips.map((tip, ti) => (
                <circle key={ti}
                  cx={tip.x} cy={tip.y} r={tip.r}
                  fill={isLeading ? color.bloom : color.leaves}
                  opacity={0.88}
                  style={{ transition: 'all 0.55s ease' }}
                />
              ))}

              {/* Crown above leader */}
              {isLeading && (
                <text x={cx} y={topY - 4} textAnchor="middle" fontSize="16"
                  style={{ transition: 'all 0.55s ease' }}>
                  👑
                </text>
              )}

              {/* Label + count below ground */}
              <text x={cx} y={groundY + 17} textAnchor="middle" fontSize="11"
                fontWeight={isLeading ? 'bold' : 'normal'}
                style={{ fill: '#fff', fontFamily: 'inherit' }}>
                {opt?.label || `Option ${vote.option}`}
              </text>
              <text x={cx} y={groundY + 31} textAnchor="middle" fontSize="10"
                style={{ fill: isLeading ? '#4ade80' : '#86efac', fontFamily: 'inherit' }}>
                {vote.count} vote{vote.count !== 1 ? 's' : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function LivePoll() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [theme, setTheme] = useState('bar');
  const { votes: wsVotes, pollStatus } = useWebSocket(id);
  const prevVotesRef = useRef<string>('');
  const lastAnnounceRef = useRef<number>(0);
  const [announcement, setAnnouncement] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const { data: poll, isLoading } = useQuery({
    queryKey: ['poll', id],
    queryFn: () => getPoll(id!),
    enabled: !!id,
  });

  // Navigate to results when poll is no longer LIVE (auto-ended by timer)
  useEffect(() => {
    if (pollStatus && pollStatus.status === 'ENDED' && id) {
      navigate(`/poll/${id}/results`);
    }
  }, [pollStatus, id, navigate]);

  // Countdown timer for timed polls
  const liveRun = poll?.runs?.find((r: PollRun) => r.status === 'LIVE');
  useEffect(() => {
    if (!liveRun?.duration) {
      setTimeLeft(null);
      return;
    }

    const calculate = () => {
      const elapsed = (Date.now() - new Date(liveRun.createdAt).getTime()) / 1000;
      const remaining = Math.max(0, Math.ceil((liveRun!.duration ?? 0) - elapsed));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        navigate(`/poll/${id}/results`);
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [liveRun?.id, liveRun?.duration, liveRun?.createdAt, id, navigate]);

  const votes: VoteCount[] = useMemo(() => {
    const runVotes = wsVotes.length > 0 ? wsVotes : (liveRun?.votes || []);
    const countMap = new Map<number, number>();
    runVotes.forEach((v: { option: number }) => {
      countMap.set(v.option, (countMap.get(v.option) || 0) + 1);
    });
    return poll?.options.map((o) => ({
      option: o.number,
      count: countMap.get(o.number) || 0,
    })) || [];
  }, [wsVotes, poll, liveRun]);

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
      navigate(`/poll/${id}/results`);
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
  const isLive = !!liveRun;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/poll/${id}`)}>
            ← Back to Edit
          </Button>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-center flex-col sm:flex-row">
          <h1 className="text-xl font-bold text-center">{poll.question}</h1>
          {isLive && timeLeft !== null && (
            <span className={`font-mono text-sm px-3 py-1 rounded ${
              timeLeft <= 10 ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-muted text-muted-foreground'
            }`}>
              {formatTime(timeLeft)}
            </span>
          )}
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
            {theme === 'tree' && <ForestChart votes={votes} options={poll.options} />}
          </CardContent>
        </Card>
      </main>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
