import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { getPoll, startPoll, updatePoll } from "@/lib/api";
import { useAuth } from "@/contexts/useAuth";
import { toast } from "sonner";
import type { Option, PollRun } from "@/types";

interface VoteCount {
	option: number;
	count: number;
	percentage: number;
}

function AnimatedBar({
	percentage,
	label,
	count,
	delay,
}: {
	percentage: number;
	label: string;
	count: number;
	delay: number;
}) {
	const [width, setWidth] = useState(0);
	useEffect(() => {
		const timer = setTimeout(() => setWidth(percentage), delay);
		return () => clearTimeout(timer);
	}, [percentage, delay]);
	return (
		<div className="space-y-1">
			<div className="flex justify-between text-sm">
				<span>{label}</span>
				<span className="font-mono">
					{count} ({percentage.toFixed(1)}%)
				</span>
			</div>
			<div className="h-6 bg-secondary rounded-full overflow-hidden">
				<div
					className="h-full bg-primary transition-all duration-700 ease-out"
					style={{ width: `${width}%` }}
				/>
			</div>
		</div>
	);
}

function BarChart({
	votes,
	options,
}: {
	votes: VoteCount[];
	options: Option[];
}) {
	return (
		<div className="space-y-4">
			{votes.map((v, i) => {
				const option = options.find((o) => o.number === v.option);
				return (
					<AnimatedBar
						key={v.option}
						percentage={v.percentage}
						label={option?.label || `Option ${v.option}`}
						count={v.count}
						delay={i * 200}
					/>
				);
			})}
		</div>
	);
}

function PieChart({
	votes,
	options,
}: {
	votes: VoteCount[];
	options: Option[];
}) {
	const slices = useMemo(() => {
		const colors = [
			"#3b82f6",
			"#ef4444",
			"#22c55e",
			"#eab308",
			"#a855f7",
			"#ec4899",
			"#06b6d4",
			"#f97316",
			"#64748b",
		];
		const colorMap = new Map(
			options.map((o, i) => [o.number, colors[i % colors.length]]),
		);
		return votes.reduce<
			Array<{
				option: number;
				label: string;
				count: number;
				percentage: number;
				startAngle: number;
				endAngle: number;
				color: string;
			}>
		>((acc, vote, i) => {
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
					<path
						key={i}
						d={describeArc(slice.startAngle, slice.endAngle)}
						fill={slice.color}
					/>
				))}
			</svg>
			<div className="flex flex-wrap justify-center gap-3">
				{slices.map((slice) => (
					<div key={slice.option} className="flex items-center gap-2 text-sm">
						<div
							className="w-3 h-3 rounded-full"
							style={{ backgroundColor: slice.color }}
						/>
						<span>
							{slice.label}: {slice.count}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

function NumberDisplay({
	votes,
	options,
}: {
	votes: VoteCount[];
	options: Option[];
}) {
	return (
		<div className="grid grid-cols-3 gap-4">
			{votes.map((vote, i) => {
				const option = options.find((o) => o.number === vote.option);
				return (
					<Card
						key={vote.option}
						className="animate-in fade-in slide-in-from-bottom-4"
						style={{
							animationDelay: `${i * 200}ms`,
							animationFillMode: "both",
						}}
					>
						<CardContent className="text-center py-6">
							<div className="text-5xl font-bold">{vote.count}</div>
							<div className="text-sm text-muted-foreground mt-2">
								{option?.label}
							</div>
							<div className="text-xs text-muted-foreground mt-1">
								{vote.percentage.toFixed(1)}%
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}

const TREE_PALETTE = [
	{ trunk: "#854d0e", leaves: "#15803d", bloom: "#4ade80" },
	{ trunk: "#78350f", leaves: "#b45309", bloom: "#fbbf24" },
	{ trunk: "#7f1d1d", leaves: "#be123c", bloom: "#fb7185" },
	{ trunk: "#1e3a8a", leaves: "#1d4ed8", bloom: "#60a5fa" },
	{ trunk: "#4c1d95", leaves: "#6d28d9", bloom: "#c084fc" },
	{ trunk: "#134e4a", leaves: "#0f766e", bloom: "#2dd4bf" },
	{ trunk: "#831843", leaves: "#9d174d", bloom: "#f9a8d4" },
	{ trunk: "#365314", leaves: "#4d7c0f", bloom: "#a3e635" },
];

interface Branch {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	width: number;
	level: number;
}
interface Tip {
	x: number;
	y: number;
	r: number;
}

function buildTree(
	cx: number,
	groundY: number,
	votes: number,
	seed: number = 0,
): { branches: Branch[]; tips: Tip[]; topY: number } {
	if (votes === 0) return { branches: [], tips: [], topY: groundY - 8 };

	let s = (seed * 1664525 + 1013904223) >>> 0;
	const rng = () => {
		s = (s * 1664525 + 1013904223) >>> 0;
		return s / 4294967295;
	};

	const trunkH = votes <= 5 ? votes * 17 : Math.min(85 + (votes - 5) * 6, 190);
	const trunkW = Math.min(2 + votes * 0.55, 12);

	const branches: Branch[] = [];
	const tips: Tip[] = [];

	branches.push({
		x1: cx,
		y1: groundY,
		x2: cx,
		y2: groundY - trunkH,
		width: trunkW,
		level: 0,
	});

	if (votes >= 3) {
		const numBranches = Math.min(1 + Math.floor(votes / 2), 7);
		const usedH: number[] = [];

		const addBranch = (
			bY: number,
			baseBLen: number,
			bW: number,
			dir: number,
		) => {
			const bLen = baseBLen * (0.8 + rng() * 0.4);
			const ex = cx + dir * bLen * (0.78 + (rng() - 0.5) * 0.24);
			const ey = bY - bLen * (0.38 + (rng() - 0.5) * 0.22);
			branches.push({ x1: cx, y1: bY, x2: ex, y2: ey, width: bW, level: 1 });

			if (rng() < 0.3 && bLen > 9) {
				const subW = Math.max(bW * 0.55, 0.5);
				const s1Len = bLen * (0.35 + rng() * 0.28);
				const s1x = ex + dir * s1Len * (0.55 + rng() * 0.38);
				const s1y = ey - s1Len * (0.5 + rng() * 0.38);
				branches.push({
					x1: ex,
					y1: ey,
					x2: s1x,
					y2: s1y,
					width: subW,
					level: 2,
				});
				const r1 =
					Math.min(Math.max(2.5, s1Len * 0.28), 5.5) * (0.75 + rng() * 0.5);
				tips.push({ x: s1x, y: s1y - r1 * 0.2, r: r1 });
				const s2Len = bLen * (0.35 + rng() * 0.28);
				const s2x = ex + dir * s2Len * (0.12 + rng() * 0.28);
				const s2y = ey - s2Len * (0.68 + rng() * 0.28);
				branches.push({
					x1: ex,
					y1: ey,
					x2: s2x,
					y2: s2y,
					width: subW,
					level: 2,
				});
				const r2 =
					Math.min(Math.max(2.5, s2Len * 0.28), 5.5) * (0.75 + rng() * 0.5);
				tips.push({ x: s2x, y: s2y - r2 * 0.2, r: r2 });
			} else {
				const leafR =
					Math.min(Math.max(3.5, bLen * 0.27), 7) * (0.75 + rng() * 0.5);
				tips.push({ x: ex, y: ey - leafR * 0.2, r: leafR });
			}
		};

		for (let i = 0; i < numBranches; i++) {
			let hFrac = 0.14 + rng() * 0.64;
			let tries = 0;
			while (tries++ < 8 && usedH.some((h) => Math.abs(h - hFrac) < 0.11)) {
				hFrac = 0.14 + rng() * 0.64;
			}
			if (hFrac > 0.85) continue;
			usedH.push(hFrac);

			const bY = groundY - trunkH * hFrac;
			const spreadRatio =
				votes <= 8
					? Math.max(0.28 - i * 0.025, 0.1)
					: Math.max(0.18 - i * 0.018, 0.07);
			const baseBLen = Math.min(trunkH * spreadRatio, 20);
			const bW = Math.max(trunkW * (0.22 + rng() * 0.1), 0.75);
			addBranch(bY, baseBLen, bW, rng() < 0.5 ? -1 : 1);
		}
	}

	const topTrunkY = groundY - trunkH;
	const canopyR = Math.min(8 + votes * 1.4, 38);

	tips.push({ x: cx, y: topTrunkY - canopyR * 0.35, r: canopyR });
	if (votes >= 4) {
		tips.push({
			x: cx - canopyR * 0.55,
			y: topTrunkY + canopyR * 0.1,
			r: canopyR * 0.65,
		});
		tips.push({
			x: cx + canopyR * 0.55,
			y: topTrunkY + canopyR * 0.1,
			r: canopyR * 0.65,
		});
	}
	if (votes >= 12) {
		tips.push({
			x: cx - canopyR * 0.25,
			y: topTrunkY - canopyR * 0.88,
			r: canopyR * 0.5,
		});
		tips.push({
			x: cx + canopyR * 0.25,
			y: topTrunkY - canopyR * 0.88,
			r: canopyR * 0.5,
		});
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

function ForestChart({
	votes,
	options,
}: {
	votes: VoteCount[];
	options: Option[];
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [dims, setDims] = useState({ w: 1200, h: 600 });

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const obs = new ResizeObserver((entries) => {
			for (const e of entries) {
				const { width, height } = e.contentRect;
				setDims((prev) => {
					if (prev.w === width && prev.h === height) return prev;
					return { w: width, h: height };
				});
			}
		});
		obs.observe(el);
		return () => obs.disconnect();
	}, []);

	const maxVotes = Math.max(...votes.map((v) => v.count), 0);
	const n = votes.length;

	// Scale trees to fill available height
	const treeScale = Math.max(1, dims.h / 400);
	const treeSpacing = Math.max(80, dims.w / n);
	const svgW = Math.max(dims.w, n * treeSpacing);

	const maxTreeH = Math.max(
		...votes.map((v) => treeHeightNeeded(v.count) * treeScale),
		dims.h * 0.4,
	);
	const groundH = 60;
	const topPad = 22;
	const svgH = Math.max(dims.h, maxTreeH + groundH + topPad);
	const groundY = svgH - groundH;

	return (
		<div
			ref={containerRef}
			className="w-full h-full overflow-hidden rounded-lg"
		>
			<svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full">
				<defs>
					<linearGradient id="rSky" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#bfdbfe" />
						<stop offset="100%" stopColor="#d1fae5" />
					</linearGradient>
					<linearGradient id="rGround" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#4ade80" />
						<stop offset="55%" stopColor="#166534" />
						<stop offset="100%" stopColor="#052e16" />
					</linearGradient>
				</defs>

				<rect x="0" y="0" width={svgW} height={svgH} fill="url(#rSky)" rx="8" />
				<rect
					x="0"
					y={groundY}
					width={svgW}
					height={svgH - groundY}
					fill="url(#rGround)"
				/>
				<line
					x1="0"
					y1={groundY}
					x2={svgW}
					y2={groundY}
					stroke="#86efac"
					strokeWidth="1.5"
				/>

				{votes.map((vote, i) => {
					const opt = options.find((o) => o.number === vote.option);
					const cx = treeSpacing * i + treeSpacing / 2;
					const color = TREE_PALETTE[i % TREE_PALETTE.length];
					const isLeading = vote.count > 0 && vote.count === maxVotes;
					const { branches, tips, topY } = buildTree(
						cx,
						groundY,
						vote.count,
						i,
					);

					return (
						<g key={vote.option}>
							{/* Seed + tree visual — scaled to fill space */}
							<g
								transform={`translate(${cx}, ${groundY}) scale(${treeScale}) translate(${-cx}, ${-groundY})`}
							>
								{vote.count === 0 && (
									<ellipse
										cx={cx}
										cy={groundY - 4}
										rx={6}
										ry={4}
										fill="#854d0e"
										opacity={0.75}
									/>
								)}

								{branches.map((b, bi) => (
									<line
										key={bi}
										x1={b.x1}
										y1={b.y1}
										x2={b.x2}
										y2={b.y2}
										stroke={color.trunk}
										strokeWidth={b.width}
										strokeLinecap="round"
										style={{
											transition: "all 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)",
										}}
									/>
								))}

								{tips.map((tip, ti) => (
									<circle
										key={ti}
										cx={tip.x}
										cy={tip.y}
										r={tip.r}
										fill={isLeading ? color.bloom : color.leaves}
										opacity={0.88}
										style={{ transition: "all 0.55s ease" }}
									/>
								))}

								{isLeading && (
									<text
										x={cx}
										y={topY - 4}
										textAnchor="middle"
										fontSize="16"
										style={{ transition: "all 0.55s ease" }}
									>
										👑
									</text>
								)}
							</g>

							{/* Labels — always readable size */}
							<text
								x={cx}
								y={groundY + 17}
								textAnchor="middle"
								fontSize="11"
								fontWeight={isLeading ? "bold" : "normal"}
								style={{ fill: "#fff", fontFamily: "inherit" }}
							>
								{opt?.label || `Option ${vote.option}`}
							</text>
							<text
								x={cx}
								y={groundY + 31}
								textAnchor="middle"
								fontSize="10"
								style={{
									fill: isLeading ? "#4ade80" : "#86efac",
									fontFamily: "inherit",
								}}
							>
								{vote.count} vote{vote.count !== 1 ? "s" : ""}
							</text>

							<text
								x={cx}
								y={groundY + 47}
								textAnchor="middle"
								fontSize="9"
								fill="rgba(255,255,255,0.55)"
								fontFamily="inherit"
							>
								Vote {vote.option}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
}

export default function Results() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { userId } = useAuth();
	const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
	const [tieDialogOpen, setTieDialogOpen] = useState(false);
	const [tiedOptions, setTiedOptions] = useState<
		{ number: number; label: string; count: number }[]
	>([]);

	const { data: poll, isLoading } = useQuery({
		queryKey: ["poll", id],
		queryFn: () => getPoll(id!),
		enabled: !!id,
	});

	const endedRuns = useMemo(
		() =>
			(poll?.runs || [])
				.filter((r: PollRun) => r.status === "ENDED")
				.sort((a, b) => b.runNumber - a.runNumber),
		[poll],
	);

	useEffect(() => {
		if (endedRuns.length > 0 && !selectedRunId) {
			setSelectedRunId(endedRuns[0].id);
		}
	}, [endedRuns, selectedRunId]);

	const selectedRun = useMemo(
		() => endedRuns.find((r) => r.id === selectedRunId) ?? endedRuns[0] ?? null,
		[endedRuns, selectedRunId],
	);

	const votes: VoteCount[] = useMemo(() => {
		const runVotes = selectedRun?.votes || [];
		const countMap = new Map<number, number>();
		runVotes.forEach((v: { option: number }) => {
			countMap.set(v.option, (countMap.get(v.option) || 0) + 1);
		});
		const total = runVotes.length;
		return (poll?.options || []).map((o) => {
			const count = countMap.get(o.number) || 0;
			return {
				option: o.number,
				count,
				percentage: total > 0 ? (count / total) * 100 : 0,
			};
		});
	}, [poll, selectedRun]);

	const startMutation = useMutation({
		mutationFn: () => startPoll(id!),
		onSuccess: (pollRun) => {
			queryClient.invalidateQueries({ queryKey: ["poll", id] });
			toast.success("Poll started");
			navigate(`/poll/${pollRun.pollId}/live`);
		},
		onError: (error) => {
			toast.error(
				(error as { error?: string }).error || "Failed to start poll",
			);
		},
	});

	const removeWinnerAndRunAgainMutation = useMutation({
		mutationFn: async (winnerOption?: number) => {
			if (!poll || !selectedRun) throw new Error("No poll or run selected");

			if (!winnerOption) {
				// Find winner (option with most votes)
				const voteCounts = votes.reduce(
					(acc, v) => {
						acc[v.option] = v.count;
						return acc;
					},
					{} as Record<number, number>,
				);
				const maxEntry = Object.entries(voteCounts).reduce(
					(max, [opt, count]) =>
						count > max.count ? { option: parseInt(opt), count } : max,
					{ option: 0, count: -1 },
				);
				if (maxEntry.option === 0) throw new Error("No winner found");
				winnerOption = maxEntry.option;
			}

			// Remove winner from options
			const newOptions = poll.options.filter((o) => o.number !== winnerOption);
			if (newOptions.length < 2) {
				throw new Error("Cannot remove winner: poll needs at least 2 options");
			}
			// Update poll with new options
			await updatePoll(id!, { options: newOptions });
			// Start a new run
			return startPoll(id!);
		},
		onSuccess: (pollRun) => {
			queryClient.invalidateQueries({ queryKey: ["poll", id] });
			toast.success("Winner removed and new run started");
			navigate(`/poll/${pollRun.pollId}/live`);
		},
		onError: (error) => {
			const err = error as { error?: string; message?: string };
			toast.error(
				err.error || err.message || "Failed to remove winner and start",
			);
		},
	});

	const handleRemoveWinnerAndRunAgain = () => {
		if (!poll || !selectedRun) return;

		const voteCounts = votes.reduce(
			(acc, v) => {
				acc[v.option] = v.count;
				return acc;
			},
			{} as Record<number, number>,
		);

		const maxCount = Math.max(...Object.values(voteCounts));
		const tied = Object.entries(voteCounts)
			.filter(([, count]) => count === maxCount)
			.map(([opt]) => parseInt(opt));

		if (tied.length > 1) {
			setTiedOptions(
				tied.map((n) => ({
					number: n,
					label:
						poll!.options.find((o) => o.number === n)?.label || `Option ${n}`,
					count: voteCounts[n],
				})),
			);
			setTieDialogOpen(true);
		} else {
			removeWinnerAndRunAgainMutation.mutate(tied[0]);
		}
	};

	if (isLoading) {
		return <div className="text-center py-8">Loading...</div>;
	}

	if (!poll) {
		return <div className="text-center py-8">Poll not found</div>;
	}

	const isOwner = poll.ownerId === userId;
	const hasLiveRun = poll.runs?.some((r: PollRun) => r.status === "LIVE");
	const totalVotes = selectedRun?.votes?.length ?? 0;
	const theme = poll.liveTheme;

	return (
		<>
			{theme === "tree" ? (
				<div className="min-h-screen flex flex-col">
					{/* Compact bar: question, run selector, actions */}
					<div className="border-b p-3 flex items-center justify-between gap-4 shrink-0">
						<div className="flex items-center gap-3 min-w-0">
							<h1 className="text-lg font-bold truncate">{poll.question}</h1>
							{endedRuns.length >= 2 && (
								<Select
									value={selectedRunId ?? ""}
									onValueChange={(v) => v && setSelectedRunId(v)}
								>
									<SelectTrigger className="w-32">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{endedRuns.map((r) => (
											<SelectItem key={r.id} value={r.id}>
												Run {r.runNumber}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</div>
						<div className="flex items-center gap-3">
							<span className="text-sm text-muted-foreground">
								Total: {totalVotes} votes
							</span>
							<Button variant="outline" size="sm" onClick={() => navigate("/")}>
								Home
							</Button>
							{isOwner && !hasLiveRun && (
								<>
									<Button
										size="sm"
										onClick={() => startMutation.mutate()}
										disabled={startMutation.isPending}
									>
										{startMutation.isPending
											? "Starting..."
											: "Start Another Run"}
									</Button>
									{poll.options.length > 2 && totalVotes > 0 && (
										<Button
											variant="destructive"
											size="sm"
											onClick={handleRemoveWinnerAndRunAgain}
											disabled={removeWinnerAndRunAgainMutation.isPending}
										>
											{removeWinnerAndRunAgainMutation.isPending
												? "Removing..."
												: "Remove Winner & Run Again"}
										</Button>
									)}
								</>
							)}
						</div>
					</div>
					<div className="flex-1 p-4 min-h-0">
						<ForestChart votes={votes} options={poll.options} />
					</div>
				</div>
			) : (
				<div className="container mx-auto p-4 max-w-3xl space-y-6">
					<div className="flex items-center justify-between">
						<h1 className="text-2xl font-bold">{poll.question}</h1>
					</div>

					{endedRuns.length >= 2 && (
						<div className="flex items-center gap-3">
							<span className="text-sm text-muted-foreground">Run:</span>
							<Select
								value={selectedRunId ?? ""}
								onValueChange={(v) => v && setSelectedRunId(v)}
							>
								<SelectTrigger className="w-40">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{endedRuns.map((r) => (
										<SelectItem key={r.id} value={r.id}>
											Run {r.runNumber}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					<Card>
						<CardHeader>
							<CardTitle className="text-center">Final Results</CardTitle>
						</CardHeader>
						<CardContent>
							{theme === "bar" && (
								<BarChart votes={votes} options={poll.options} />
							)}
							{theme === "pie" && (
								<PieChart votes={votes} options={poll.options} />
							)}
							{theme === "number" && (
								<NumberDisplay votes={votes} options={poll.options} />
							)}
						</CardContent>
					</Card>

					<div className="text-center text-sm text-muted-foreground">
						Total votes: {totalVotes}
					</div>

					<div className="flex justify-center gap-4">
						<Button variant="outline" onClick={() => navigate("/")}>
							Back to Home
						</Button>
						{isOwner && !hasLiveRun && (
							<>
								<Button
									onClick={() => startMutation.mutate()}
									disabled={startMutation.isPending}
								>
									{startMutation.isPending
										? "Starting..."
										: "Start Another Run"}
								</Button>
								{poll.options.length > 2 && totalVotes > 0 && (
									<Button
										variant="destructive"
										onClick={handleRemoveWinnerAndRunAgain}
										disabled={removeWinnerAndRunAgainMutation.isPending}
									>
										{removeWinnerAndRunAgainMutation.isPending
											? "Removing..."
											: "Remove Winner & Run Again"}
									</Button>
								)}
							</>
						)}
					</div>
				</div>
			)}

			<Dialog open={tieDialogOpen} onOpenChange={setTieDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Multiple Winners</DialogTitle>
						<DialogDescription>
							Multiple options are tied for first place. Choose which one to
							remove and run again:
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-2">
						{tiedOptions.map((opt) => (
							<Button
								key={opt.number}
								variant="outline"
								className="w-full justify-between"
								onClick={() => {
									setTieDialogOpen(false);
									removeWinnerAndRunAgainMutation.mutate(opt.number);
								}}
							>
								<span>{opt.label}</span>
								<span className="text-muted-foreground">{opt.count} votes</span>
							</Button>
						))}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
