import { getConfig, getDMMF } from '@prisma/sdk'
import { describe, expect, test } from 'bun:test'
import glob from 'fast-glob'
import { readdirSync, readFile } from 'fs-extra'
import path from 'path'
import { Project, QuoteKind } from 'ts-morph'
import { SemicolonPreference } from 'typescript'
import { configSchema, PrismaOptions } from '../../config'
import { generateBarrelFile, generateEnumsFile, populateModelFile } from '../../generator'

const readAllPrismaFiles = async (prismaDir: string): Promise<string> => {
	const files = readdirSync(prismaDir).filter((f) => f.endsWith('.prisma'))
	let combined = ''

	for (const file of files) {
		let content = await readFile(path.join(prismaDir, file), 'utf-8')

		// Skip schema.prisma for now, we'll add it first
		if (file !== 'schema.prisma') {
			// Remove datasource/generator/import blocks from non-main files
			content = content.replace(/datasource\s+\w+\s*\{[^}]*\}/g, '')
			content = content.replace(/generator\s+\w+\s*\{[^}]*\}/g, '')
			content = content.replace(/import\s+["'].*?["']/g, '')

			combined += content + '\n'
		}
	}

	// Add schema.prisma first (with datasource/generator)
	const schemaContent = await readFile(path.join(prismaDir, 'schema.prisma'), 'utf-8')
	return schemaContent + '\n' + combined
}

const ftForDir = (dir: string) => async () => {
	const schemaDir = path.resolve(__dirname, dir, 'prisma')
	const expectedDir = path.resolve(__dirname, dir, 'expected')
	const actualDir = path.resolve(__dirname, dir, 'actual')

	const project = new Project({
		manipulationSettings: {
			quoteKind: QuoteKind.Single,
		},
	})

	const datamodel = await readAllPrismaFiles(schemaDir)

	const dmmf = await getDMMF({
		datamodel,
	})

	const { generators } = await getConfig({
		datamodel,
	})

	const generator = generators.find((generator) => generator.provider.value === 'zod-prisma')!
	const config = configSchema.parse(generator.config)

	const prismaClient = generators.find(
		(generator) => generator.provider.value === 'prisma-client-js'
	)!

	const outputPath = path.resolve(schemaDir, generator.output!.value)
	const clientPath = path.resolve(schemaDir, prismaClient.output!.value)

	const prismaOptions: PrismaOptions = {
		clientPath,
		outputPath,
		schemaPath: schemaDir,
	}

	const indexFile = project.createSourceFile(
		path.join(outputPath, 'index.ts'),
		{},
		{ overwrite: true }
	)

	generateBarrelFile(
		dmmf.datamodel.models as never,
		indexFile,
		config,
		dmmf.datamodel.enums.length > 0
	)

	indexFile.formatText({
		indentSize: 2,
		convertTabsToSpaces: false,
		semicolons: SemicolonPreference.Remove,
	})

	await indexFile.save()

	if (config.useStandaloneEnums && dmmf.datamodel.enums.length > 0) {
		const enumsFile = project.createSourceFile(
			path.join(outputPath, 'enums.ts'),
			{},
			{ overwrite: true }
		)

		generateEnumsFile(dmmf.datamodel.enums as never, enumsFile, config)

		enumsFile.formatText({
			indentSize: 2,
			convertTabsToSpaces: false,
			semicolons: SemicolonPreference.Remove,
		})

		await enumsFile.save()

		const actualEnumsContents = await readFile(path.join(actualDir, 'enums.ts'), 'utf-8')
		const expectedEnumsFile = path.resolve(expectedDir, 'enums.ts')
		const expectedEnumsContents = await readFile(expectedEnumsFile, 'utf-8')

		expect(actualEnumsContents).toStrictEqual(expectedEnumsContents)
	}

	const actualIndexContents = await readFile(path.join(actualDir, 'index.ts'), 'utf-8')

	const expectedIndexFile = path.resolve(expectedDir, 'index.ts')
	const expectedIndexContents = await readFile(expectedIndexFile, 'utf-8')

	expect(actualIndexContents).toStrictEqual(expectedIndexContents)

	await Promise.all(
		dmmf.datamodel.models.map(async (model) => {
			const sourceFile = project.createSourceFile(
				path.join(actualDir, `${model.name.toLowerCase()}.ts`),
				{},
				{ overwrite: true }
			)

			populateModelFile(model as never, sourceFile, config, prismaOptions)

			sourceFile.formatText({
				indentSize: 4,
				convertTabsToSpaces: false,
				semicolons: SemicolonPreference.Remove,
			})

			await sourceFile.save()
			const actualContents = await readFile(
				path.join(actualDir, `${model.name.toLowerCase()}.ts`),
				'utf-8'
			)

			const expectedFile = path.resolve(expectedDir, `${model.name.toLowerCase()}.ts`)
			const expectedContents = await readFile(expectedFile, 'utf-8')

			expect(actualContents).toStrictEqual(expectedContents)
		})
	)

	await project.save()
}

describe('Functional Tests', () => {
	test('Multiple Schema', ftForDir('multiple-schema'))
	test('Basic', ftForDir('basic'))
	test('Use Coerce', ftForDir('coerce'))
	test('Standalone Enums', ftForDir('standalone-enums'))
	test('Native types (Postgres)', ftForDir('native-types/pg'))
	test('Native types (Mongodb)', ftForDir('native-types/mongodb'))
	test('Native types (SQL Server)', ftForDir('native-types/sql-server'))
	test('Native types (Mysql)', ftForDir('native-types/mysql'))
	test('Config', ftForDir('config'))
	test('Docs', ftForDir('docs'))
	test('Different Client Path', ftForDir('different-client-path'))
	test('Recursive Schema', ftForDir('recursive'))
	test('relationModel = false', ftForDir('relation-false'))
	test('Relation - 1 to 1', ftForDir('relation-1to1'))
	test('Imports', ftForDir('imports'))
	test('JSON', ftForDir('json'))
	test('Optional fields', ftForDir('optional'))
	test('Config Import', ftForDir('config-import'))
	test('Min Length with Trim', ftForDir('minlength'))
	test('Min Length Only', ftForDir('minlength-only'))
	test('Zod Import Path - v4', ftForDir('zod-import-v4'))
	test('Zod Import Path - v3', ftForDir('zod-import-v3'))
	test('Default Values', ftForDir('default-values'))

	test('Type Check Everything', async () => {
		const tscPath = path.resolve(__dirname, '../../../node_modules/.bin/tsc')

		const files = await glob(`${__dirname}/*/expected/*.ts`)

		const proc = Bun.spawn(
			[tscPath, '--strict', '--noEmit', '--esModuleInterop', '--skipLibCheck', ...files],
			{
				stdout: 'pipe',
				stderr: 'pipe',
			}
		)

		const exitCode = await proc.exited

		expect(exitCode).toBe(0)
	})
})
