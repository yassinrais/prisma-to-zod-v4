import * as z from 'zod'

export const statusSchema = z.enum(['ACTIVE', 'INACTIVE', 'PENDING'])

export type StatusSchema = z.infer<typeof statusSchema>
