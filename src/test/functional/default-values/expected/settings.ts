import * as z from 'zod'

export const SettingsModel = z.object({
	id: z.string(),
	isActive: z.boolean().default(true),
	isPublic: z.boolean().default(false),
	retryCount: z.number().int().default(3),
	threshold: z.number().default(0.5),
	status: z.string().default("pending"),
	emptyDefault: z.string().default(""),
	noDefault: z.string(),
	optionalWithDefault: z.number().int().default(10).nullish(),
})
