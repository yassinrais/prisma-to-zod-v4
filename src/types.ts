import type { DMMF } from '@prisma/generator-helper'
import { computeCustomSchema, computeModifiers } from './docs'

export const getZodConstructor = (
	field: DMMF.Field,
	getRelatedModelName = (name: string | DMMF.SchemaEnum | DMMF.OutputType | DMMF.SchemaArg) =>
		name.toString(),
	nativeType?: string
) => {
	let zodType = 'z.unknown()'
	let extraModifiers: string[] = ['']

	if (field.kind === 'scalar') {
		switch (field.type) {
			case 'String':
				zodType = 'z.string()'
				// PostgreSQL
				if (nativeType?.match(/^Uuid/)) zodType = 'z.uuid()'
				else if (nativeType?.match(/^Citext/)) zodType = 'z.string().toLowerCase()'
				else if (nativeType?.match(/^VarChar\(\d+\)/)) {
					const length = nativeType.match(/VarChar\((\d+)\)/)?.[1]
					if (length) extraModifiers.push(`max(${length})`)
				}
				else if (nativeType?.match(/^Char\(\d+\)/)) {
					const length = nativeType.match(/Char\((\d+)\)/)?.[1]
					if (length) extraModifiers.push(`max(${length})`)
				}
				else if (nativeType?.match(/^Text/)) zodType = 'z.string()'
				else if (nativeType?.match(/^VarBit/)) zodType = 'z.string()'
				else if (nativeType?.match(/^Bit/)) zodType = 'z.string()'
				// MySQL
				else if (nativeType?.match(/^VarBinary/)) zodType = 'z.unknown()'
				else if (nativeType?.match(/^Binary/)) zodType = 'z.unknown()'
				// SQL Server
				else if (nativeType?.match(/^NVarChar\(\d+\)/)) {
					const length = nativeType.match(/NVarChar\((\d+)\)/)?.[1]
					if (length) extraModifiers.push(`max(${length})`)
				}
				else if (nativeType?.match(/^NChar\(\d+\)/)) {
					const length = nativeType.match(/NChar\((\d+)\)/)?.[1]
					if (length) extraModifiers.push(`max(${length})`)
				}
				else if (nativeType?.match(/^NText/)) zodType = 'z.string()'
				// MongoDB
				else if (nativeType?.match(/^ObjectId/)) extraModifiers.push('regex(/^[0-9a-f]{24}$/i)')
				break

			case 'Int':
				zodType = 'z.number()'
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
				zodType = 'z.bigint()'
				break

			case 'Float':
				zodType = 'z.coerce.number()'
				break

			case 'Decimal':
				zodType = 'z.coerce.number()'
				if (nativeType?.match(/^Numeric\(\d+,\d+\)/)) {
					const match = nativeType.match(/Numeric\((\d+),(\d+)\)/)
					if (match) {
						const [, precision, scale] = match
						extraModifiers.push(`refine(x => /^\\d{1,${Number(precision) - parseInt(scale)}}(\\.\\d{1,${scale}})?$/.test(x.toString()))`)
					}
				}
				else if (nativeType?.match(/^Decimal\(\d+,\d+\)/)) {
					const match = nativeType.match(/Decimal\((\d+),(\d+)\)/)
					if (match) {
						const [, precision, scale] = match
						extraModifiers.push(`refine(x => /^\\d{1,${Number(precision) - parseInt(scale)}}(\\.\\d{1,${scale}})?$/.test(x.toString()))`)
					}
				}
				break

			case 'DateTime':
				zodType = 'z.date()'
				// PostgreSQL
				if (nativeType?.match(/^TimestampTz/)) zodType = 'z.date()'
				else if (nativeType?.match(/^Timestamp/)) zodType = 'z.date()'
				else if (nativeType?.match(/^TimeTz/)) zodType = 'z.string().regex(/^\\d{2}:\\d{2}:\\d{2}[+-]\\d{2}:\\d{2}$/)'
				else if (nativeType?.match(/^Time/)) zodType = 'z.string().regex(/^\\d{2}:\\d{2}:\\d{2}$/)'
				else if (nativeType?.match(/^Date/)) zodType = 'z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/)'
				// MySQL
				else if (nativeType?.match(/^DateTime/)) zodType = 'z.date()'
				// SQL Server
				else if (nativeType?.match(/^DateTimeOffset/)) zodType = 'z.date()'
				else if (nativeType?.match(/^DateTime2/)) zodType = 'z.date()'
				break

			case 'Boolean':
				zodType = 'z.boolean()'
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
		zodType = `z.enum(${field.type})`
	} else if (field.kind === 'object') {
		zodType = getRelatedModelName(field.type)
	}

	if (field.isList) extraModifiers.push('array()')
	if (field.documentation) {
		zodType = computeCustomSchema(field.documentation) ?? zodType
		extraModifiers.push(...computeModifiers(field.documentation))
	}
	if (!field.isRequired && field.type !== 'Json') extraModifiers.push('nullish()')

	// Filter out empty strings and join
	const validModifiers = extraModifiers.filter(m => m !== '')
	return validModifiers.length > 0 ? `${zodType}.${validModifiers.join('.')}` : zodType
}