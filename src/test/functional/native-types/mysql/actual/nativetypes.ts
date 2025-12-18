import * as z from "zod"
import { Decimal } from "decimal.js"
import { Status } from "../prisma/.client"

// Helper schema for JSON fields
type Literal = boolean | number | string
type Json = Literal | { [key: string]: Json } | Json[]
const literalSchema = z.union([z.string(), z.number(), z.boolean()])
const jsonSchema: z.ZodSchema<Json> = z.lazy(() => z.union([literalSchema, z.array(jsonSchema), z.record(z.string(), jsonSchema)]))

// Helper schema for Decimal fields
z
  .instanceof(Decimal)
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
  id: z.string(),
  title: z.string(),
  charField: z.string().max(100),
  description: z.string(),
  tinyText: z.string(),
  mediumText: z.string(),
  longText: z.string(),
  count: z.number().int(),
  tinyInt: z.number().int().min(-128).max(127),
  smallInt: z.number().int().min(-32768).max(32767),
  mediumInt: z.number().int(),
  bigNumber: z.bigint(),
  unsignedInt: z.number().int(),
  unsignedBig: z.bigint(),
  price: z.number(),
  floatVal: z.number(),
  doubleVal: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  dateOnly: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeOnly: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  timestamp: z.date(),
  isActive: z.boolean(),
  binaryData: z.instanceof(Buffer),
  varbinary: z.instanceof(Buffer),
  tinyBlob: z.instanceof(Buffer),
  blob: z.instanceof(Buffer),
  mediumBlob: z.instanceof(Buffer),
  longBlob: z.instanceof(Buffer),
  metadata: jsonSchema,
  config: jsonSchema,
  status: z.enum(Status),
})
