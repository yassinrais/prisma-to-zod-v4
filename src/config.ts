import { z } from "zod"

const stringBoolean = z.enum(["true", "false"])
const configBoolean = stringBoolean.default("true").transform((arg) => arg === "true")

export const configSchema = z.object({
  relationModel: z.union([z.literal("default"), configBoolean]),
  modelSuffix: z.string().default("Model"),
  modelCase: z.enum(["PascalCase", "camelCase"]).default("PascalCase"),
  useDecimalJs: configBoolean,
  imports: z.string().optional(),
  prismaJsonNullability: configBoolean,
})

export type Config = z.infer<typeof configSchema>

export type PrismaOptions = {
  schemaPath: string
  clientPath: string
  outputPath?: string | null
}

export type Names = {
  model: string
  related: string
}
