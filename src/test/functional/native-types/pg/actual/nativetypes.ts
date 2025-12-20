import * as z from 'zod'
import { Decimal } from 'decimal.js'
import { Status } from '../prisma/.client'

// Helper schema for JSON fields
type Literal = boolean | number | string
type Json = Literal | { [key: string]: Json } | Json[]
const literalSchema = z.union([z.string(), z.number(), z.boolean()])
const jsonSchema: z.ZodSchema<Json> = z.lazy(() =>
	z.union([literalSchema, z.array(jsonSchema), z.record(z.string(), jsonSchema)])
)

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
	name: z.string(),
	logoId: z.uuid().nullish(),
	iconId: z.uuid().nullish(),
	uniqueSlug: z.string(),
	stripeCustomerId: z.string().nullish(),
	stripeSubscriptionId: z.string().nullish(),
	createdAt: z.date(),
	updatedAt: z.date(),
	title: z.string().max(255),
	slug: z.string().max(100),
	description: z.string(),
	uuid: z.uuid(),
	citext: z.string().toLowerCase(),
	bitfield: z.string(),
	count: z.number().int(),
	smallNumber: z.number().int().min(-32768).max(32767),
	bigNumber: z.bigint(),
	price: z.coerce.number(),
	rating: z.coerce.number(),
	accurate: z.coerce.number(),
	publishedAt: z.date(),
	scheduledFor: z.date(),
	eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	eventTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
	eventTimeTz: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
	isActive: z.boolean(),
	signature: z.instanceof(Buffer),
	metadata: jsonSchema,
	config: jsonSchema,
	tags: z.string().array(),
	ratings: z.number().int().array(),
	flags: z.boolean().array(),
	status: z.enum(Status),
	created: z.date(),
	updated: z.date(),
})
