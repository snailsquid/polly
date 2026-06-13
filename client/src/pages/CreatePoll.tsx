import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { createPoll, checkChannel } from "@/lib/api";
import { createPollSchema } from "@/lib/schemas";
import { toast } from "sonner";
import type { Option, PollTemplate } from "@/types";

const THEMES = ["bar", "pie", "number", "tree"] as const;

function generateId(): string {
	return Math.random().toString(36).substring(2, 15);
}

interface FieldErrors {
	question?: string;
	options?: string;
}

export default function CreatePoll() {
	const navigate = useNavigate();
	const location = useLocation();
	const prefill = (location.state as { prefill?: PollTemplate } | null)
		?.prefill;

	const [question, setQuestion] = useState(prefill?.question ?? "");
	const [channelId, setChannelId] = useState(prefill?.channelId ?? "");
	const [guildId, setGuildId] = useState(prefill?.guildId ?? "");
	const [liveTheme, setLiveTheme] = useState<string>(
		prefill?.liveTheme ?? "bar",
	);
	const [voteType, setVoteType] = useState<"NUMBER" | "TEXT">(
		prefill?.voteType ?? "NUMBER",
	);
	const [options, setOptions] = useState<Option[]>(
		prefill?.options?.map((o) => ({
			id: generateId(),
			number: o.number,
			label: o.label,
			image: o.image,
		})) ?? [
			{ id: generateId(), number: 1, label: "" },
			{ id: generateId(), number: 2, label: "" },
		],
	);
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
	const [touched, setTouched] = useState<Record<string, boolean>>({});
	const [channelCheckStatus, setChannelCheckStatus] = useState<
		"idle" | "checking" | "accessible" | "error"
	>("idle");
	const [channelCheckError, setChannelCheckError] = useState<string>("");

	const mutation = useMutation({
		mutationFn: createPoll,
		onSuccess: (poll) => {
			toast.success("Poll created");
			navigate(`/poll/${poll.id}`);
		},
		onError: (error) => {
			toast.error(
				(error as { error?: string }).error || "Failed to create poll",
			);
		},
	});

	const validateForm = useCallback((): boolean => {
		const validOptions = options.filter((o) => o.label.trim());
		const result = createPollSchema.safeParse({
			question,
			channelId,
			guildId,
			voteType,
			liveTheme,
			options: validOptions.map((o) => ({ label: o.label, number: o.number })),
		});

		if (!result.success) {
			const errors: FieldErrors = {};
			for (const err of result.error.issues) {
				if (err.path[0] === "options" && err.path.length === 1) {
					errors.options = err.message;
				} else if (err.path[0] === "question") {
					errors.question = err.message;
				}
			}
			setFieldErrors(errors);
			return false;
		}
		setFieldErrors({});
		return true;
	}, [question, channelId, guildId, voteType, liveTheme, options]);

	useEffect(() => {
		const timer = setTimeout(async () => {
			if (guildId.length >= 18 && channelId.length >= 18) {
				setChannelCheckStatus("checking");
				try {
					const result = await checkChannel(guildId, channelId);
					setChannelCheckStatus(result.accessible ? "accessible" : "error");
					setChannelCheckError(result.error || "");
				} catch {
					setChannelCheckStatus("error");
					setChannelCheckError("Failed to check channel");
				}
			} else {
				setChannelCheckStatus("idle");
			}
		}, 500);
		return () => clearTimeout(timer);
	}, [guildId, channelId]);

	const handleBlur = (field: string) => {
		setTouched((prev) => ({ ...prev, [field]: true }));
		validateForm();
	};

	const addOption = () => {
		if (options.length < 9) {
			setOptions([
				...options,
				{ id: generateId(), number: options.length + 1, label: "" },
			]);
		}
	};

	const removeOption = (id: string) => {
		if (options.length > 1) {
			setOptions(
				options
					.filter((o) => o.id !== id)
					.map((o, i) => ({ ...o, number: i + 1 })),
			);
		}
	};

	const updateOption = (id: string, label: string) => {
		setOptions(options.map((o) => (o.id === id ? { ...o, label } : o)));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setTouched({ question: true, options: true });
		if (!validateForm()) {
			return;
		}
		mutation.mutate({
			question,
			channelId,
			guildId,
			voteType,
			liveTheme,
			options: options.filter((o) => o.label.trim()),
		});
	};

	const showError = (field: keyof FieldErrors) =>
		touched[field] && fieldErrors[field];

	return (
		<div id="main-content" className="container mx-auto p-4 max-w-2xl">
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
								onBlur={() => handleBlur("question")}
								placeholder="What would you like to ask?"
							/>
							{showError("question") && (
								<p className="text-sm text-destructive">
									{fieldErrors.question}
								</p>
							)}
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
								<div className="flex items-center gap-2 min-h-5">
									{channelCheckStatus === "checking" && (
										<span className="text-sm text-muted-foreground animate-pulse">
											Checking access...
										</span>
									)}
									{channelCheckStatus === "accessible" && (
										<span className="text-sm text-green-600">
											✓ Bot has access
										</span>
									)}
									{channelCheckStatus === "error" && (
										<div className="flex items-center gap-2">
											<span className="text-sm text-red-600">
												✗ {channelCheckError}
											</span>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={async () => {
													setChannelCheckStatus("checking");
													try {
														const result = await checkChannel(
															guildId,
															channelId,
														);
														setChannelCheckStatus(
															result.accessible ? "accessible" : "error",
														);
														setChannelCheckError(result.error || "");
													} catch {
														setChannelCheckStatus("error");
														setChannelCheckError("Failed to check channel");
													}
												}}
											>
												Check
											</Button>
										</div>
									)}
								</div>
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
						<CardTitle>Vote Type & Theme</CardTitle>
					</CardHeader>
					<CardContent className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Vote Type</Label>
							<Select
								value={voteType}
								onValueChange={(v) => v && setVoteType(v as "NUMBER" | "TEXT")}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="NUMBER">Number (1-9)</SelectItem>
									<SelectItem value="TEXT">Text (option word)</SelectItem>
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								{voteType === "NUMBER"
									? "Voters send a single digit matching the option number."
									: 'Voters send the exact option word (e.g. "apple").'}
							</p>
						</div>
						<div className="space-y-2">
							<Label>Live Theme</Label>
							<Select
								value={liveTheme}
								onValueChange={(v) => v && setLiveTheme(v)}
							>
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
								{voteType === "NUMBER" ? (
									<Select
										value={String(option.number)}
										onValueChange={(v) => {
											if (v) {
												const num = parseInt(v, 10);
												setOptions(
													options.map((o) =>
														o.id === option.id ? { ...o, number: num } : o,
													),
												);
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
								) : (
									<span className="w-8 text-center font-mono text-muted-foreground">
										{index + 1}
									</span>
								)}
								<Input
									value={option.label}
									onChange={(e) => updateOption(option.id, e.target.value)}
									onBlur={() => handleBlur("options")}
									placeholder={
										voteType === "TEXT"
											? `Word voters type, e.g. "apple"`
											: `Option ${index + 1}`
									}
									className="flex-1"
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => removeOption(option.id)}
									disabled={options.length <= 1}
									aria-label={`Remove option ${option.number}`}
								>
									×
								</Button>
							</div>
						))}
						{fieldErrors.options && (
							<p className="text-sm text-destructive">{fieldErrors.options}</p>
						)}
						{options.length < 9 && (
							<Button type="button" variant="outline" onClick={addOption}>
								Add Option
							</Button>
						)}
					</CardContent>
				</Card>

				<div className="flex justify-end gap-2">
					<Button type="button" variant="outline" onClick={() => navigate("/")}>
						Cancel
					</Button>
					<Button type="submit" disabled={mutation.isPending}>
						{mutation.isPending ? "Creating..." : "Create Poll"}
					</Button>
				</div>
			</form>
		</div>
	);
}
