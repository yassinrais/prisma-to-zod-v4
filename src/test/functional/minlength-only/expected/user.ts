import * as z from 'zod'

export const UserModel = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	email: z.string().nullish(),
})
