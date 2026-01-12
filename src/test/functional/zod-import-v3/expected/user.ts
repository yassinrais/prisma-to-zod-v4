import * as z from 'zod/v3'

export const UserModel = z.object({
	id: z.string(),
	email: z.string(),
	name: z.string(),
})
