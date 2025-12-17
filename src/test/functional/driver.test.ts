import glob from 'fast-glob'
import { execa } from 'execa'
import { getDMMF, getConfig } from '@prisma/sdk'
import { readFile } from 'fs-extra'
import path from 'path'
import { Project } from 'ts-morph'
import { SemicolonPreference } from 'typescript'
import { describe, test, expect } from 'bun:test'
import { configSchema, PrismaOptions } from '../../config'
import { populateModelFile, generateBarrelFile } from '../../generator'

const ftForDir = (dir: string) => async () => {
	const schemaFile = path.resolve(__dirname, dir, 'prisma/schema.prisma')
	const expectedDir = path.resolve(__dirname, dir, 'expected')
	const actualDir = path.resolve(__dirname, dir, 'actual')

	const project = new Project()

	const datamodel = await readFile(schemaFile, 'utf-8')

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

	const outputPath = path.resolve(path.dirname(schemaFile), generator.output!.value)
	const clientPath = path.resolve(path.dirname(schemaFile), prismaClient.output!.value)

	const prismaOptions: PrismaOptions = {
		clientPath,
		outputPath,
		schemaPath: schemaFile,
	}

	const indexFile = project.createSourceFile(`${outputPath}/index.ts`, {}, { overwrite: true })

	generateBarrelFile(dmmf.datamodel.models, indexFile)

	indexFile.formatText({
		indentSize: 2,
		convertTabsToSpaces: true,
		semicolons: SemicolonPreference.Remove,
	})

	await indexFile.save()

	const actualIndexContents = await readFile(`${actualDir}/index.ts`, 'utf-8')

	const expectedIndexFile = path.resolve(expectedDir, `index.ts`)
	const expectedIndexContents = await readFile(
		path.resolve(expectedDir, expectedIndexFile),
		'utf-8'
	)

	expect(actualIndexContents).toStrictEqual(expectedIndexContents)

	await Promise.all(
		dmmf.datamodel.models.map(async (model) => {
			const sourceFile = project.createSourceFile(
				`${actualDir}/${model.name.toLowerCase()}.ts`,
				{},
				{ overwrite: true }
			)

			populateModelFile(model, sourceFile, config, prismaOptions)

			sourceFile.formatText({
				indentSize: 2,
				convertTabsToSpaces: true,
				semicolons: SemicolonPreference.Remove,
			})

			await sourceFile.save()
			const actualContents = await readFile(
				`${actualDir}/${model.name.toLowerCase()}.ts`,
				'utf-8'
			)

			const expectedFile = path.resolve(expectedDir, `${model.name.toLowerCase()}.ts`)
			const expectedContents = await readFile(
				path.resolve(expectedDir, expectedFile),
				'utf-8'
			)

			expect(actualContents).toStrictEqual(expectedContents)
		})
	)

	await project.save()
}

describe('Functional Tests', () => {
	// test('Basic', ftForDir('basic'))
	test('Native types (Postgres)', ftForDir('native-types/pg'))
	// test('Native types (Mongodb)', ftForDir('native-types/mongodb'))
	// test('Native types (SQL Server)', ftForDir('native-types/sql-server'))
	// test('Native types (Mysql)', ftForDir('native-types/mysql'))
	// test('Config', ftForDir('config'))
	// test('Docs', ftForDir('docs'))
	// test('Different Client Path', ftForDir('different-client-path'))
	// test('Recursive Schema', ftForDir('recursive'))
	// test('relationModel = false', ftForDir('relation-false'))
	// test('Relation - 1 to 1', ftForDir('relation-1to1'))
	// test('Imports', ftForDir('imports'))
	// test('JSON', ftForDir('json'))
	// test('Optional fields', ftForDir('optional'))
	// test('Config Import', ftForDir('config-import'))

	// test('Type Check Everything', async () => {
	// 	const typeCheckResults = await execa(
	// 		path.resolve(__dirname, '../../../node_modules/.bin/tsc'),
	// 		[
	// 			'--strict',
	// 			'--noEmit',
	// 			'--esModuleInterop',
	// 			'--skipLibCheck',
	// 			...(await glob(`${__dirname}/*/expected/*.ts`)),
	// 		]
	// 	)

	// 	expect(typeCheckResults.exitCode).toBe(0)
	// })
})