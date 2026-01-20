import type { DMMF } from '@prisma/generator-helper'
import type { Config } from './config'
import {
	computeCustomSchema,
	computeModifiersExcludingStandalone,
	extractStandaloneValidator,
} from './docs'

export const getZodConstructor = (
	field: DMMF.Field,
	getRelatedModelName = (name: string | DMMF.SchemaEnum | DMMF.OutputType | DMMF.SchemaArg) =>
		name.toString(),
	nativeType?: string | null,
	config?: Partial<Config>,
	defaultValue?: string | number | boolean
) => {
	let zodType = 'z.unknown()'
	const useCoerce = config?.useCoerce ?? false
	const useMinLength = config?.useMinLength ?? false
	const useTrimStrings = config?.useTrimStrings ?? false
	const usePrefaultEmptyString = config?.usePrefaultEmptyString ?? false
	const zodVar = useCoerce ? 'z.coerce' : 'z'
	const extraModifiers: string[] = ['']

	if (field.kind === 'scalar') {
		switch (field.type) {
			case 'String': {
				zodType = zodVar + '.string()'
				let isSpecialStringType = false
				// PostgreSQL
				if (nativeType?.match(/^Uuid/)) {
					zodType = 'z.uuid()'
					isSpecialStringType = true
				} else if (nativeType?.match(/^Citext/)) {
					zodType = zodVar + '.string().toLowerCase()'
					isSpecialStringType = true
				} else if (nativeType?.match(/^VarChar\(\d+\)/)) {
					const length = nativeType.match(/VarChar\((\d+)\)/)?.[1]
					if (length) extraModifiers.push(`max(${length})`)
				} else if (nativeType?.match(/^Char\(\d+\)/)) {
					const length = nativeType.match(/Char\((\d+)\)/)?.[1]
					if (length) extraModifiers.push(`max(${length})`)
				} else if (nativeType?.match(/^Text/)) zodType = zodVar + '.string()'
				else if (nativeType?.match(/^VarBit/)) zodType = zodVar + '.string()'
				else if (nativeType?.match(/^Bit/)) zodType = zodVar + '.string()'
				// MySQL
				else if (nativeType?.match(/^VarBinary/)) zodType = 'z.unknown()'
				else if (nativeType?.match(/^Binary/)) zodType = 'z.unknown()'
				// SQL Server
				else if (nativeType?.match(/^NVarChar\(\d+\)/)) {
					const length = nativeType.match(/NVarChar\((\d+)\)/)?.[1]
					if (length) extraModifiers.push(`max(${length})`)
				} else if (nativeType?.match(/^NChar\(\d+\)/)) {
					const length = nativeType.match(/NChar\((\d+)\)/)?.[1]
					if (length) extraModifiers.push(`max(${length})`)
				} else if (nativeType?.match(/^NText/)) zodType = zodVar + '.string()'
				// MongoDB
				else if (nativeType?.match(/^ObjectId/)) {
					extraModifiers.push('regex(/^[0-9a-f]{24}$/i)')
					isSpecialStringType = true
				}

				// Apply trim and minLength for required string fields (except special types like UUID, ObjectId, etc.)
				if (field.isRequired && useMinLength && !isSpecialStringType) {
					if (useTrimStrings) extraModifiers.push('trim()')
					extraModifiers.push('min(1)')
					if (useTrimStrings && usePrefaultEmptyString) {
						extraModifiers.push('prefault("")')
					}
				}
				break
			}

			case 'Int':
				zodType = zodVar + '.number()'
				extraModifiers.push('int()')
				// PostgreSQL
				if (nativeType?.match(/^SmallInt/)) extraModifiers.push('min(-32768)', 'max(32767)')
				// MySQL
				else if (nativeType?.match(/^UnsignedInt/)) extraModifiers.push('min(0)')
				else if (nativeType?.match(/^UnsignedSmallInt/)) extraModifiers.push('min(0)', 'max(65535)')
				else if (nativeType?.match(/^UnsignedTinyInt/)) extraModifiers.push('min(0)', 'max(255)')
				else if (nativeType?.match(/^TinyInt/)) extraModifiers.push('min(-128)', 'max(127)')
				break

			case 'BigInt':
				zodType = zodVar + '.bigint()'
				break

			case 'Float':
				zodType = zodVar + '.number()'
				break

			case 'Decimal':
				zodType = zodVar + '.number()'
				if (nativeType?.match(/^Numeric\(\d+,\d+\)/)) {
					const match = nativeType.match(/Numeric\((\d+),(\d+)\)/)
					if (match) {
						const [, precision, scale] = match
						extraModifiers.push(
							`refine(x => /^\\d{1,${
								Number(precision) - parseInt(scale)
							}}(\\.\\d{1,${scale}})?$/.test(x.toString()))`
						)
					}
				} else if (nativeType?.match(/^Decimal\(\d+,\d+\)/)) {
					const match = nativeType.match(/Decimal\((\d+),(\d+)\)/)
					if (match) {
						const [, precision, scale] = match
						extraModifiers.push(
							`refine(x => /^\\d{1,${
								Number(precision) - parseInt(scale)
							}}(\\.\\d{1,${scale}})?$/.test(x.toString()))`
						)
					}
				}
				break

			case 'DateTime':
				zodType = zodVar + '.date()'
				// PostgreSQL
				if (nativeType?.match(/^TimestampTz/)) zodType = zodVar + '.date()'
				else if (nativeType?.match(/^Timestamp/)) zodType = zodVar + '.date()'
				else if (nativeType?.match(/^TimeTz/))
					zodType = zodVar + '.string().regex(/^\\d{2}:\\d{2}:\\d{2}[+-]\\d{2}:\\d{2}$/)'
				else if (nativeType?.match(/^Time/))
					zodType = zodVar + '.string().regex(/^\\d{2}:\\d{2}:\\d{2}$/)'
				else if (nativeType?.match(/^Date/))
					zodType = zodVar + '.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/)'
				// MySQL
				else if (nativeType?.match(/^DateTime/)) zodType = zodVar + '.date()'
				// SQL Server
				else if (nativeType?.match(/^DateTimeOffset/)) zodType = zodVar + '.date()'
				else if (nativeType?.match(/^DateTime2/)) zodType = zodVar + '.date()'
				break

			case 'Boolean':
				zodType = zodVar + '.boolean()'
				break

			case 'Bytes':
				zodType = 'z.instanceof(Buffer)'
				// PostgreSQL
				if (nativeType?.match(/^ByteA/)) zodType = 'z.instanceof(Buffer)'
				// MySQL
				else if (nativeType?.match(/^LongBlob/)) zodType = 'z.instanceof(Buffer)'
				else if (nativeType?.match(/^MediumBlob/)) zodType = 'z.instanceof(Buffer)'
				else if (nativeType?.match(/^TinyBlob/)) zodType = 'z.instanceof(Buffer)'
				else if (nativeType?.match(/^Blob/)) zodType = 'z.instanceof(Buffer)'
				// SQL Server
				else if (nativeType?.match(/^Image/)) zodType = 'z.instanceof(Buffer)'
				else if (nativeType?.match(/^VarBinary/)) zodType = 'z.instanceof(Buffer)'
				else if (nativeType?.match(/^Binary/)) zodType = 'z.instanceof(Buffer)'
				break

			case 'Json':
				zodType = 'jsonSchema'
				break
		}
	} else if (field.kind === 'enum') {
		if (config?.useStandaloneEnums) {
			const camelCase = field.type.charAt(0).toLowerCase() + field.type.slice(1)
			zodType = `${camelCase}Schema`
		} else {
			zodType = `z.enum(${field.type})`
		}
	} else if (field.kind === 'object') {
		zodType = getRelatedModelName(field.type)
	}

	if (field.isList) extraModifiers.push('array()')
	if (field.documentation) {
		const customSchema = computeCustomSchema(field.documentation)
		const standaloneValidator = extractStandaloneValidator(field.documentation)

		if (customSchema) {
			zodType = customSchema
		} else if (standaloneValidator && field.type === 'String') {
			zodType = `z.${standaloneValidator}`
		}

		extraModifiers.push(...computeModifiersExcludingStandalone(field.documentation))
	}

	if (defaultValue !== undefined) {
		if (typeof defaultValue === 'string') {
			const escaped = defaultValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
			extraModifiers.push(`default("${escaped}")`)
		} else if (typeof defaultValue === 'boolean' || typeof defaultValue === 'number') {
			extraModifiers.push(`default(${defaultValue})`)
		}
	}

	if (!field.isRequired && field.type !== 'Json') extraModifiers.push('nullish()')

	const validModifiers = extraModifiers
		.filter((m) => m !== '')
		.filter((m, i, l) => l.indexOf(m) === i)
	return validModifiers.length > 0 ? `${zodType}.${validModifiers.join('.')}` : zodType
}
