import * as z from "zod"
import { Decimal } from "decimal.js"

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
  varchar: z.string().max(255),
  char: z.string().max(100),
  text: z.string(),
  count: z.number().int(),
  tinyInt: z.number().int().min(-128).max(127),
  smallInt: z.number().int().min(-32768).max(32767),
  bigNumber: z.bigint(),
  price: z.number(),
  floatVal: z.number(),
  doubleVal: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  dateOnly: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeOnly: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  dateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTime2: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  smallDt: z.date(),
  dateTimeOffset: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isActive: z.boolean(),
  binaryData: z.instanceof(Buffer),
  varbinary: z.instanceof(Buffer),
  image: z.instanceof(Buffer),
  status: z.string().max(50),
})
