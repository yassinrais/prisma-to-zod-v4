import { z } from 'zod'

const stringBoolean = z.enum(['true', 'false'])
const configBoolean = stringBoolean.transform((arg) => arg === 'true')

export const configSchema = z.object({
	imports: z.string().optional(),
	modelSuffix: z.string().default('Model'),
	modelCase: z.enum(['PascalCase', 'camelCase']).default('PascalCase'),
	useCoerce: configBoolean.default(false),
	useDecimalJs: configBoolean.default(true),
	useStandaloneEnums: configBoolean.default(true),
	relationModel: z.union([z.literal('default'), configBoolean.default(true)]),
	prismaJsonNullability: configBoolean.default(true),
})

export type Config = z.infer<typeof configSchema>

export type PrismaOptions = {
	schemaPath: string
	clientPath: string
	outputPath: string
}

export type Names = {
	model: string
	related: string
}
