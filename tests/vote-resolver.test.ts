import { describe, test, expect } from "bun:test";
import { resolveVoteOption } from "../src/server/vote-resolver";

const OPTIONS = [
	{ number: 1, label: "Apple" },
	{ number: 2, label: "Orange" },
	{ number: 3, label: "Banana Split" },
];

describe("resolveVoteOption — NUMBER polls", () => {
	test("single digit 1-9 maps to matching option number", () => {
		expect(resolveVoteOption("NUMBER", OPTIONS, "1")).toBe(1);
		expect(resolveVoteOption("NUMBER", OPTIONS, "3")).toBe(3);
	});

	test("trims surrounding whitespace", () => {
		expect(resolveVoteOption("NUMBER", OPTIONS, "  2  ")).toBe(2);
	});

	test("digit without a matching option returns null", () => {
		expect(resolveVoteOption("NUMBER", OPTIONS, "4")).toBeNull();
		expect(resolveVoteOption("NUMBER", OPTIONS, "9")).toBeNull();
	});

	const invalid = ["", "0", "10", "111", "1a", "a1", "a", " ", "!", "apple"];
	for (const content of invalid) {
		test(`"${content}" does not resolve`, () => {
			expect(resolveVoteOption("NUMBER", OPTIONS, content)).toBeNull();
		});
	}
});

describe("resolveVoteOption — TEXT polls", () => {
	test("exact label match maps to option number", () => {
		expect(resolveVoteOption("TEXT", OPTIONS, "Apple")).toBe(1);
		expect(resolveVoteOption("TEXT", OPTIONS, "Orange")).toBe(2);
	});

	test("matching is case-insensitive", () => {
		expect(resolveVoteOption("TEXT", OPTIONS, "apple")).toBe(1);
		expect(resolveVoteOption("TEXT", OPTIONS, "ORANGE")).toBe(2);
	});

	test("trims surrounding whitespace", () => {
		expect(resolveVoteOption("TEXT", OPTIONS, "  apple  ")).toBe(1);
	});

	test("matches multi-word labels", () => {
		expect(resolveVoteOption("TEXT", OPTIONS, "banana split")).toBe(3);
	});

	test("non-matching text returns null", () => {
		expect(resolveVoteOption("TEXT", OPTIONS, "grape")).toBeNull();
		expect(resolveVoteOption("TEXT", OPTIONS, "")).toBeNull();
	});

	test("a bare digit does not match a text poll unless it is a label", () => {
		expect(resolveVoteOption("TEXT", OPTIONS, "1")).toBeNull();
	});

	test("numeric labels can still be matched by text", () => {
		const opts = [
			{ number: 1, label: "2024" },
			{ number: 2, label: "2025" },
		];
		expect(resolveVoteOption("TEXT", opts, "2025")).toBe(2);
	});
});
