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
				if (nativeType?.includes('Uuid')) zodType = 'z.uuid()'
				if (nativeType?.includes('Citext')) zodType = 'z.string().toLowerCase()'
				if (nativeType?.includes('Char')) {
					const length = nativeType.match(/Char\((\d+)\)/)?.[1]
					if (length) extraModifiers.push(`max(${length})`)
				}
				if (nativeType?.includes('VarChar')) {
					const length = nativeType.match(/VarChar\((\d+)\)/)?.[1]
					if (length) extraModifiers.push(`max(${length})`)
				}
				if (nativeType?.includes('Text')) zodType = 'z.string()'
				if (nativeType?.includes('Bit')) zodType = 'z.string()'
				if (nativeType?.includes('VarBit')) zodType = 'z.string()'
				// MySQL
				if (nativeType?.includes('VarBinary')) zodType = 'z.unknown()'
				if (nativeType?.includes('Binary')) zodType = 'z.unknown()'
				// SQL Server
				if (nativeType?.includes('NChar')) {
					const length = nativeType.match(/NChar\((\d+)\)/)?.[1]
					if (length) extraModifiers.push(`max(${length})`)
				}
				if (nativeType?.includes('NVarChar')) {
					const length = nativeType.match(/NVarChar\((\d+)\)/)?.[1]
					if (length) extraModifiers.push(`max(${length})`)
				}
				if (nativeType?.includes('NText')) zodType = 'z.string()'
				// MongoDB
				if (nativeType?.includes('ObjectId')) extraModifiers.push('regex(/^[0-9a-f]{24}$/i)')
				break

			case 'Int':
				zodType = 'z.number()'
				extraModifiers.push('int()')
				// PostgreSQL
				if (nativeType?.includes('SmallInt')) extraModifiers.push('min(-32768)', 'max(32767)')
				// MySQL
				if (nativeType?.includes('TinyInt')) extraModifiers.push('min(-128)', 'max(127)')
				if (nativeType?.includes('UnsignedTinyInt')) extraModifiers.push('min(0)', 'max(255)')
				if (nativeType?.includes('UnsignedSmallInt')) extraModifiers.push('min(0)', 'max(65535)')
				if (nativeType?.includes('UnsignedInt')) extraModifiers.push('min(0)')
				// SQL Server
				if (nativeType?.includes('Int')) zodType = 'z.number().int()'
				break

			case 'BigInt':
				zodType = 'z.bigint()'
				// PostgreSQL
				if (nativeType?.includes('BigInt')) zodType = 'z.bigint()'
				break

			case 'Float':
				zodType = 'z.number()'
				if (nativeType?.includes('Real')) zodType = 'z.number()'
				if (nativeType?.includes('Float')) zodType = 'z.number()'
				if (nativeType?.includes('Double')) zodType = 'z.number()'
				break

			case 'Decimal':
				zodType = 'z.number()'
				if (nativeType?.includes('Numeric')) {
					const match = nativeType.match(/Numeric\((\d+),(\d+)\)/)
					if (match) {
						const [, precision, scale] = match
						extraModifiers.push(`refine(x => /^\\d{1,${Number(precision) - parseInt(scale)}}(\\.\\d{1,${scale}})?$/.test(x.toString()))`)
					}
				}
				if (nativeType?.includes('Decimal')) {
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
				if (nativeType?.includes('Timestamp')) zodType = 'z.date()'
				if (nativeType?.includes('TimestampTz')) zodType = 'z.date()'
				if (nativeType?.includes('Date')) zodType = 'z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/)'
				if (nativeType?.includes('Time')) zodType = 'z.string().regex(/^\\d{2}:\\d{2}:\\d{2}$/)'
				if (nativeType?.includes('TimeTz')) zodType = 'z.string().regex(/^\\d{2}:\\d{2}:\\d{2}[+-]\\d{2}:\\d{2}$/)'
				// MySQL
				if (nativeType?.includes('DateTime')) zodType = 'z.date()'
				// SQL Server
				if (nativeType?.includes('DateTime2')) zodType = 'z.date()'
				if (nativeType?.includes('DateTimeOffset')) zodType = 'z.date()'
				break

			case 'Boolean':
				zodType = 'z.boolean()'
				break

			case 'Bytes':
				zodType = 'z.instanceof(Buffer)'
				// PostgreSQL
				if (nativeType?.includes('ByteA')) zodType = 'z.instanceof(Buffer)'
				// MySQL
				if (nativeType?.includes('Blob')) zodType = 'z.instanceof(Buffer)'
				if (nativeType?.includes('TinyBlob')) zodType = 'z.instanceof(Buffer)'
				if (nativeType?.includes('MediumBlob')) zodType = 'z.instanceof(Buffer)'
				if (nativeType?.includes('LongBlob')) zodType = 'z.instanceof(Buffer)'
				// SQL Server
				if (nativeType?.includes('Binary')) zodType = 'z.instanceof(Buffer)'
				if (nativeType?.includes('VarBinary')) zodType = 'z.instanceof(Buffer)'
				if (nativeType?.includes('Image')) zodType = 'z.instanceof(Buffer)'
				break

			case 'Json':
				zodType = 'jsonSchema'
				// PostgreSQL
				if (nativeType?.includes('Json')) zodType = 'jsonSchema'
				if (nativeType?.includes('JsonB')) zodType = 'jsonSchema'
				// MySQL 5.7+
				if (nativeType?.includes('Json')) zodType = 'jsonSchema'
				break
		}
	} else if (field.kind === 'enum') {
		zodType = `z.nativeEnum(${field.type})`
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