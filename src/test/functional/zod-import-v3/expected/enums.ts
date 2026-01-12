import * as z from 'zod/v3'

export const roleSchema = z.enum(['USER', 'ADMIN'])

export type RoleSchema = z.infer<typeof roleSchema>
