import path from 'path'
import { DMMF } from '@prisma/generator-helper'
import {
	ImportDeclarationStructure,
	SourceFile,
	StructureKind,
	VariableDeclarationKind,
} from 'ts-morph'
import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { Config, PrismaOptions } from './config'
import { dotSlash, needsRelatedModel, useModelNames, writeArray } from './util'
import { getJSDocs, computeCustomSchema } from './docs'
import { getZodConstructor } from './types'

export const parseNativeTypes = (schemaPath: string): Map<string, Map<string, string>> => {
	let schemaContent = ''
	let resolvedPath = schemaPath

	// Resolve file or directory
	if (!existsSync(resolvedPath)) {
		const withFile = path.join(schemaPath, 'schema.prisma')
		const parentDir = path.dirname(schemaPath)
		if (existsSync(withFile)) resolvedPath = withFile
		else if (existsSync(parentDir)) resolvedPath = parentDir
		else return new Map()
	}

	// Read schema content
	const stat = statSync(resolvedPath)
	if (stat.isFile()) schemaContent = readFileSync(resolvedPath, 'utf-8')
	else if (stat.isDirectory()) {
		const prismaFiles = findPrismaFiles(resolvedPath)
		if (prismaFiles.length === 0) return new Map()
		prismaFiles.forEach((filePath) => {
			schemaContent += readFileSync(filePath, 'utf-8') + '\n'
		})
	}

	const nativeTypes = new Map<string, Map<string, string>>()
	const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\}/g
	let modelMatch

	while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
		const modelName = modelMatch[1]
		const modelBody = modelMatch[2]
		const fields = new Map<string, string>()

		const lines = modelBody.split('\n')
		for (const line of lines) {
			const trimmed = line.trim()
			if (!trimmed || trimmed.startsWith('//')) continue

			const parts = trimmed.split(/\s+/)
			if (parts.length < 2) continue // must have field name + type

			const fieldName = parts[0]
			const attributes = parts.slice(2).join(' ')

			// Capture @db.* exactly
			const dbMatch = attributes.match(/@db\.([A-Za-z0-9_()]+)/)?.[1]
			if (dbMatch) fields.set(fieldName, dbMatch)
		}

		if (fields.size > 0) nativeTypes.set(modelName, fields)
	}

	return nativeTypes
}

/**
 * Recursively find all .prisma files in a directory
 */
const findPrismaFiles = (dir: string): string[] => {
	const prismaFiles: string[] = []

	try {
		const files = readdirSync(dir)

		files.forEach((file) => {
			const fullPath = path.join(dir, file)

			try {
				const stat = statSync(fullPath)

				if (stat.isDirectory() && !file.startsWith('.')) {
					prismaFiles.push(...findPrismaFiles(fullPath))
				} else if (file.endsWith('.prisma')) {
					prismaFiles.push(fullPath)
				}
			} catch (error) {
				console.warn(`Could not read ${fullPath}`)
			}
		})
	} catch (error) {
		console.error(`Error reading directory ${dir}`)
	}

	return prismaFiles
}

export const writeImportsForModel = (
	model: DMMF.Model,
	sourceFile: SourceFile,
	config: Config,
	{ schemaPath, outputPath, clientPath }: PrismaOptions
) => {
	const { relatedModelName } = useModelNames(config)
	const importList: ImportDeclarationStructure[] = [
		{
			kind: StructureKind.ImportDeclaration,
			namespaceImport: 'z',
			moduleSpecifier: 'zod',
		},
	]

	if (config.imports) {
		// If schemaPath is a directory, use it directly; otherwise use dirname
		const baseDir = schemaPath.endsWith('.prisma') ? path.dirname(schemaPath) : schemaPath

		importList.push({
			kind: StructureKind.ImportDeclaration,
			namespaceImport: 'imports',
			moduleSpecifier: dotSlash(path.relative(outputPath, path.resolve(baseDir, config.imports))),
		})
	}

	const hasNonCustomDecimalFieldForImports = model.fields.some(
		(f) => f.type === 'Decimal' && (!f.documentation || !computeCustomSchema(f.documentation))
	)

	if (config.useDecimalJs && hasNonCustomDecimalFieldForImports) {
		importList.push({
			kind: StructureKind.ImportDeclaration,
			namedImports: ['Decimal'],
			moduleSpecifier: 'decimal.js',
		})
	}

	const enumFields = model.fields.filter((f) => f.kind === 'enum')
	const relationFields = model.fields.filter((f) => f.kind === 'object')
	const relativePath = path.relative(outputPath, clientPath)

	if (enumFields.length > 0) {
		importList.push({
			kind: StructureKind.ImportDeclaration,
			isTypeOnly: enumFields.length === 0,
			moduleSpecifier: dotSlash(relativePath),
			namedImports: enumFields.map((f) => f.type),
		})
	}

	if (config.relationModel !== false && relationFields.length > 0) {
		const filteredFields = relationFields.filter((f) => f.type !== model.name)

		if (filteredFields.length > 0) {
			importList.push({
				kind: StructureKind.ImportDeclaration,
				moduleSpecifier: './index',
				namedImports: Array.from(
					new Set(filteredFields.flatMap((f) => [`Complete${f.type}`, relatedModelName(f.type)]))
				),
			})
		}
	}

	sourceFile.addImportDeclarations(importList)
}

export const writeTypeSpecificSchemas = (
	model: DMMF.Model,
	sourceFile: SourceFile,
	config: Config,
	_prismaOptions: PrismaOptions
) => {
	if (model.fields.some((f) => f.type === 'Json')) {
		sourceFile.addStatements((writer) => {
			writeArray(writer, [
				'',
				'// Helper schema for JSON fields',
				`type Literal = boolean | number | string${config.prismaJsonNullability ? '' : ' | null'}`,
				'type Json = Literal | { [key: string]: Json } | Json[]',
				`const literalSchema = z.union([z.string(), z.number(), z.boolean()${
					config.prismaJsonNullability ? '' : ', z.null()'
				}])`,
				// Keep jsonSchema initializer fully on one line
				'const jsonSchema: z.ZodSchema<Json> = z.lazy(() => z.union([literalSchema, z.array(jsonSchema), z.record(z.string(), jsonSchema)]))',
			])
		})
	}

	const hasNonCustomDecimalField = model.fields.some(
		(f) => f.type === 'Decimal' && (!f.documentation || !computeCustomSchema(f.documentation))
	)

	if (config.useDecimalJs && hasNonCustomDecimalField) {
		sourceFile.addStatements((writer) => {
			writer.newLine()
			writeArray(writer, [
				'// Helper schema for Decimal fields',
				'z.instanceof(Decimal)',
				'.or(z.string())',
				'.or(z.number())',
				'.refine((value) => {',
				'  try {',
				'    return new Decimal(value);',
				'  } catch (error) {',
				'    return false;',
				'  }',
				'})',
				'.transform((value) => new Decimal(value));',
			])
		})
	}
}

export const generateSchemaForModel = (
	model: DMMF.Model,
	sourceFile: SourceFile,
	config: Config,
	{ schemaPath }: PrismaOptions
) => {
	const { modelName } = useModelNames(config)

	const nativeTypes = parseNativeTypes(schemaPath)
	const modelNativeTypes = nativeTypes.get(model.name) || new Map()

	sourceFile.addVariableStatement({
		declarationKind: VariableDeclarationKind.Const,
		isExported: true,
		leadingTrivia: (writer) => writer.blankLineIfLastNot(),
		declarations: [
			{
				name: modelName(model.name),
				initializer(writer) {
					writer
						.write('z.object(')
						.inlineBlock(() => {
							model.fields
								.filter((f) => f.kind !== 'object')
								.forEach((field) => {
									writeArray(writer, getJSDocs(field.documentation))
									const nativeType = modelNativeTypes.get(field.name)
									writer
										.write(
											`${field.name}: ${getZodConstructor(
												field,
												undefined,
												nativeType,
												config.useCoerce
											)}`
										)
										.write(',')
										.newLine()
								})
						})
						.write(')')
				},
			},
		],
	})
}

export const generateRelatedSchemaForModel = (
	model: DMMF.Model,
	sourceFile: SourceFile,
	config: Config,
	_prismaOptions: PrismaOptions
) => {
	const { modelName, relatedModelName } = useModelNames(config)

	const relationFields = model.fields.filter((f) => f.kind === 'object')

	sourceFile.addInterface({
		name: `Complete${model.name}`,
		isExported: true,
		extends: [`z.infer<typeof ${modelName(model.name)}>`],
		properties: relationFields.map((f) => ({
			hasQuestionToken: !f.isRequired,
			name: f.name,
			type: `Complete${f.type}${f.isList ? '[]' : ''}${!f.isRequired ? ' | null' : ''}`,
		})),
	})

	sourceFile.addStatements((writer) =>
		writeArray(writer, [
			'',
			'/**',
			` * ${relatedModelName(
				model.name
			)} contains all relations on your model in addition to the scalars`,
			' *',
			' * NOTE: Lazy required in case of potential circular dependencies within schema',
			' */',
		])
	)

	sourceFile.addVariableStatement({
		declarationKind: VariableDeclarationKind.Const,
		isExported: true,
		declarations: [
			{
				name: relatedModelName(model.name),
				type: `z.ZodSchema<Complete${model.name}>`,
				initializer(writer) {
					writer
						.write('z.lazy(() =>')
						.newLine()
						.indent(() => {
							writer
								.write(`${modelName(model.name)}.extend({`)
								.newLine()
								.indent(() => {
									relationFields.forEach((field) => {
										writeArray(writer, getJSDocs(field.documentation))

										writer
											.write(
												`${field.name}: ${getZodConstructor(
													field,
													relatedModelName,
													null,
													config.useCoerce
												)},`
											)
											.newLine()
									})
								})
								.write('})')
						})
						.newLine()
						.write(')')
				},
			},
		],
	})
}

export const populateModelFile = (
	model: DMMF.Model,
	sourceFile: SourceFile,
	config: Config,
	prismaOptions: PrismaOptions
) => {
	writeImportsForModel(model, sourceFile, config, prismaOptions)
	writeTypeSpecificSchemas(model, sourceFile, config, prismaOptions)
	generateSchemaForModel(model, sourceFile, config, prismaOptions)
	if (needsRelatedModel(model, config))
		generateRelatedSchemaForModel(model, sourceFile, config, prismaOptions)
}

export const generateBarrelFile = (models: DMMF.Model[], indexFile: SourceFile) => {
	models.forEach((model) => {
		indexFile.addExportDeclaration({
			moduleSpecifier: `./${model.name.toLowerCase()}`,
		})
	})
}
