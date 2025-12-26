import * as z from 'zod'
import { statusSchema } from './enums'

export const PostModel = z.object({
	id: z.string(),
	title: z.string(),
	status: statusSchema,
	tags: statusSchema.array(),
	created: z.date(),
})
