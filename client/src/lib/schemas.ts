import { z } from 'zod';

export const optionSchema = z.object({
  label: z.string().min(1, 'Option label is required'),
  number: z.number().int().min(1).max(9),
});

export const createPollSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  channelId: z.string().optional(),
  guildId: z.string().optional(),
  liveTheme: z.enum(['bar', 'pie', 'number']),
  resultTheme: z.enum(['bar', 'pie', 'number']),
  options: z.array(optionSchema).min(2, 'At least 2 options are required').max(9, 'Maximum 9 options allowed'),
});

export const updatePollSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  channelId: z.string().optional(),
  guildId: z.string().optional(),
  liveTheme: z.enum(['bar', 'pie', 'number']),
  resultTheme: z.enum(['bar', 'pie', 'number']),
  options: z.array(optionSchema).min(2, 'At least 2 options are required').max(9, 'Maximum 9 options allowed'),
});

export type CreatePollInput = z.infer<typeof createPollSchema>;
export type UpdatePollInput = z.infer<typeof updatePollSchema>;