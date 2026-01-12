// @ts-ignore Importing package.json for automated synchronization of version numbers
import { version } from '../package.json'

import { generatorHandler } from '@prisma/generator-helper'
import { SemicolonPreference } from 'typescript'
import path from 'path'
import { configSchema, PrismaOptions } from './config'
import { populateModelFile, generateBarrelFile, generateEnumsFile } from './generator'
import { Project, QuoteKind } from 'ts-morph'

generatorHandler({
	onManifest() {
		return {
			version,
			prettyName: 'Zod Schemas',
			defaultOutput: 'zod',
		}
	},
	onGenerate(options) {
		const project = new Project({
			manipulationSettings: {
				quoteKind: QuoteKind.Single,
			},
		})

		const models = [...options.dmmf.datamodel.models]
		const enums = [...options.dmmf.datamodel.enums]

		const schemaPath = options.schemaPath
		// Get the directory containing the schema file(s)
		const schemaDir = path.dirname(schemaPath)

		const outputPath = options.generator.output!.value!
		const clientPath = options.otherGenerators.find(
			(each) => each.provider.value === 'prisma-client-js'
		)!.output!.value!

		const results = configSchema.safeParse(options.generator.config)
		if (!results.success)
			throw new Error(
				'Incorrect config provided. Please check the values you provided and try again.'
			)

		const config = results.data
		const prismaOptions: PrismaOptions = {
			clientPath,
			outputPath,
			schemaPath: schemaDir, // Pass the directory, not the file
		}

		const indexFile = project.createSourceFile(`${outputPath}/index.ts`, {}, { overwrite: true })

		generateBarrelFile(models, indexFile, config, enums.length > 0)

		indexFile.formatText({
			indentSize: 2,
			convertTabsToSpaces: true,
			semicolons: SemicolonPreference.Remove,
		})

		if (config.useStandaloneEnums && enums.length > 0) {
			const enumsFile = project.createSourceFile(`${outputPath}/enums.ts`, {}, { overwrite: true })

			generateEnumsFile(enums, enumsFile, config)

			enumsFile.formatText({
				indentSize: 2,
				convertTabsToSpaces: true,
				semicolons: SemicolonPreference.Remove,
			})
		}

		models.forEach((model) => {
			const sourceFile = project.createSourceFile(
				`${outputPath}/${model.name.toLowerCase()}.ts`,
				{},
				{ overwrite: true }
			)

			populateModelFile(model, sourceFile, config, prismaOptions)

			sourceFile.formatText({
				indentSize: 2,
				convertTabsToSpaces: true,
				semicolons: SemicolonPreference.Remove,
			})
		})

		return project.save()
	},
})
