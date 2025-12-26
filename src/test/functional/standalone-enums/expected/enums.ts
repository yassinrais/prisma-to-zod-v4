import * as z from 'zod'

export const statusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])

export type StatusSchema = z.infer<typeof statusSchema>

export const roleSchema = z.enum(['USER', 'ADMIN', 'MODERATOR'])

export type RoleSchema = z.infer<typeof roleSchema>

export const lowerCaseRoleSchema = z.enum(['user', 'admin', 'moderator'])

export type LowerCaseRoleSchema = z.infer<typeof lowerCaseRoleSchema>
