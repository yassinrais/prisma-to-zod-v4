import * as z from 'zod'
import { Decimal } from 'decimal.js'
import { statusSchema } from './enums'

// Helper schema for JSON fields
type Literal = boolean | number | string
type Json = Literal | { [key: string]: Json } | Json[]
const literalSchema = z.union([z.string(), z.number(), z.boolean()])
const jsonSchema: z.ZodSchema<Json> = z.lazy(() => z.union([literalSchema, z.array(jsonSchema), z.record(z.string(), jsonSchema)]))

// Helper schema for Decimal fields
z.instanceof(Decimal)
	.or(z.string())
	.or(z.number())
	.refine((value) => {
		try {
			return new Decimal(value)
		} catch (error) {
			return false
		}
	})
	.transform((value) => new Decimal(value))

export const NativeTypesModel = z.object({
	id: z.uuid(),
	name: z.coerce.string(),
	logoId: z.uuid().nullish(),
	iconId: z.uuid().nullish(),
	uniqueSlug: z.coerce.string(),
	stripeCustomerId: z.coerce.string().nullish(),
	stripeSubscriptionId: z.coerce.string().nullish(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	title: z.coerce.string().max(255),
	slug: z.coerce.string().max(100),
	description: z.coerce.string(),
	uuid: z.uuid(),
	citext: z.coerce.string().toLowerCase(),
	bitfield: z.coerce.string(),
	count: z.coerce.number().int(),
	smallNumber: z.coerce.number().int().min(-32768).max(32767),
	bigNumber: z.coerce.bigint(),
	price: z.coerce.number(),
	rating: z.coerce.number(),
	accurate: z.coerce.number(),
	publishedAt: z.coerce.date(),
	scheduledFor: z.coerce.date(),
	eventDate: z.coerce.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	eventTime: z.coerce.string().regex(/^\d{2}:\d{2}:\d{2}$/),
	eventTimeTz: z.coerce.string().regex(/^\d{2}:\d{2}:\d{2}$/),
	isActive: z.coerce.boolean(),
	signature: z.instanceof(Buffer),
	metadata: jsonSchema,
	config: jsonSchema,
	tags: z.coerce.string().array(),
	ratings: z.coerce.number().int().array(),
	flags: z.coerce.boolean().array(),
	status: statusSchema,
	created: z.coerce.date(),
	updated: z.coerce.date(),
})
