import * as z from 'zod'

// Helper schema for JSON fields
type Literal = boolean | number | string
type Json = Literal | { [key: string]: Json } | Json[]
const literalSchema = z.union([z.string(), z.number(), z.boolean()])
const jsonSchema: z.ZodSchema<Json> = z.lazy(() =>
	z.union([literalSchema, z.array(jsonSchema), z.record(z.string(), jsonSchema)])
)

export const NativeTypesModel = z.object({
	id: z.string().regex(/^[0-9a-f]{24}$/i),
	title: z.string(),
	description: z.string().nullish(),
	slug: z.string(),
	userId: z.string().regex(/^[0-9a-f]{24}$/i),
	count: z.number().int(),
	views: z.number().int(),
	rating: z.coerce.number(),
	createdAt: z.date(),
	updatedAt: z.date(),
	publishedAt: z.date().nullish(),
	expiresAt: z.date().nullish(),
	isActive: z.boolean(),
	isPublished: z.boolean(),
	signature: z.instanceof(Buffer).nullish(),
	metadata: jsonSchema,
	config: jsonSchema,
	tags: z.string().array(),
	ratings: z.number().int().array(),
	flags: z.boolean().array(),
	status: z.string(),
})
