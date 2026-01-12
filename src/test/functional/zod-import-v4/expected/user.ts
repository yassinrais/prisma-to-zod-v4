import * as z from 'zod/v4'

export const UserModel = z.object({
	id: z.string(),
	email: z.string(),
	name: z.string(),
})
