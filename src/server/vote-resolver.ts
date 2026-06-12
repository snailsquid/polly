type VoteType = "NUMBER" | "TEXT";

interface ResolvableOption {
	number: number;
	label: string;
}

/**
 * Resolve a raw Discord message token into a poll option number.
 *
 * - NUMBER polls: the token must be a single digit 1-9 that maps to an
 *   existing option number.
 * - TEXT polls: the token is matched (case-insensitive, trimmed) against
 *   option labels; the matching option's number is returned.
 *
 * Returns null when the token does not resolve to a valid option.
 */
export function resolveVoteOption(
	voteType: VoteType,
	options: ResolvableOption[],
	rawText: string,
): number | null {
	const text = rawText.trim();
	if (!text) return null;

	if (voteType === "NUMBER") {
		if (!/^[1-9]$/.test(text)) return null;
		const num = parseInt(text, 10);
		return options.some((o) => o.number === num) ? num : null;
	}

	// TEXT: match against option labels, case-insensitive
	const normalized = text.toLowerCase();
	const match = options.find(
		(o) => o.label.trim().toLowerCase() === normalized,
	);
	return match ? match.number : null;
}
