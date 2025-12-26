import * as z from 'zod'

export const statusSchema = z.enum(['draft', 'live', 'archived'])

export type StatusSchema = z.infer<typeof statusSchema>
