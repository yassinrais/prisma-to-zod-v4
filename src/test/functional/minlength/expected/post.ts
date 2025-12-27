import * as z from 'zod'

export const PostModel = z.object({
	id: z.string().trim().min(1),
	title: z.string().max(255).trim().min(1),
	contents: z.string().trim().min(1),
	slug: z.string().trim().min(1),
})
