import * as z from 'zod'

export const PostModel = z.object({
	id: z.string(),
	title: z.string(),
	views: z.number().int().default(0),
	rating: z.number().default(4.5),
	published: z.boolean().default(false),
	createdAt: z.date(),
})
