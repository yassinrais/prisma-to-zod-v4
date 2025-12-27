import * as z from 'zod'

export const UserModel = z.object({
	id: z.string().trim().min(1),
	name: z.string().trim().min(1),
	email: z.string().nullish(),
	bio: z.string().nullish(),
})
