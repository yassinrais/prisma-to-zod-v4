import * as z from 'zod'
import { roleSchema } from './enums'

export const UserModel = z.object({
	id: z.string(),
	email: z.string(),
	role: roleSchema,
	backup: roleSchema.nullish(),
})
