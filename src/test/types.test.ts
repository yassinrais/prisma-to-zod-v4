import { DMMF } from '@prisma/generator-helper'
import { getZodConstructor } from '../types'

describe('types Package', () => {
	test('getZodConstructor', () => {
		const field: DMMF.Field = {
			hasDefaultValue: false,
			isGenerated: false,
			isId: false,
			isList: true,
			isRequired: false,
			isReadOnly: false,
			isUpdatedAt: false,
			isUnique: false,
			kind: 'scalar',
			name: 'nameList',
			type: 'String',
			documentation: ['@zod.max(64)', '@zod.min(1)'].join('\n'),
		}

		const constructor = getZodConstructor(field)

		expect(constructor).toBe('z.string().array().max(64).min(1).nullish()')
	})

	test('regression - unknown type', () => {
		const field: DMMF.Field = {
			hasDefaultValue: false,
			isGenerated: false,
			isId: false,
			isList: false,
			isRequired: true,
			isUnique: false,
			isReadOnly: false,
			isUpdatedAt: false,
			kind: 'scalar',
			name: 'aField',
			type: 'SomeUnknownType',
		}

		const constructor = getZodConstructor(field)

		expect(constructor).toBe('z.unknown()')
	})

	test('useMinLength - required string gets min(1)', () => {
		const field: DMMF.Field = {
			hasDefaultValue: false,
			isGenerated: false,
			isId: false,
			isList: false,
			isRequired: true,
			isUnique: false,
			isReadOnly: false,
			isUpdatedAt: false,
			kind: 'scalar',
			name: 'title',
			type: 'String',
		}

		const constructor = getZodConstructor(field, undefined, undefined, { useMinLength: true })

		expect(constructor).toBe('z.string().min(1)')
	})

	test('useMinLength - optional string does not get min(1)', () => {
		const field: DMMF.Field = {
			hasDefaultValue: false,
			isGenerated: false,
			isId: false,
			isList: false,
			isRequired: false,
			isUnique: false,
			isReadOnly: false,
			isUpdatedAt: false,
			kind: 'scalar',
			name: 'title',
			type: 'String',
		}

		const constructor = getZodConstructor(field, undefined, undefined, { useMinLength: true })

		expect(constructor).toBe('z.string().nullish()')
	})

	test('useTrimStrings and useMinLength - required string gets trim().min(1)', () => {
		const field: DMMF.Field = {
			hasDefaultValue: false,
			isGenerated: false,
			isId: false,
			isList: false,
			isRequired: true,
			isUnique: false,
			isReadOnly: false,
			isUpdatedAt: false,
			kind: 'scalar',
			name: 'title',
			type: 'String',
		}

		const constructor = getZodConstructor(field, undefined, undefined, {
			useMinLength: true,
			useTrimStrings: true
		})

		expect(constructor).toBe('z.string().trim().min(1)')
	})

	test('useTrimStrings, useMinLength and usePrefaultEmptyString - required string gets trim().min(1).prefault("")', () => {
		const field: DMMF.Field = {
			hasDefaultValue: false,
			isGenerated: false,
			isId: false,
			isList: false,
			isRequired: true,
			isUnique: false,
			isReadOnly: false,
			isUpdatedAt: false,
			kind: 'scalar',
			name: 'title',
			type: 'String',
		}

		const constructor = getZodConstructor(field, undefined, undefined, {
			useMinLength: true,
			useTrimStrings: true,
			usePrefaultEmptyString: true
		})

		expect(constructor).toBe('z.string().trim().min(1).prefault("")')
	})

	test('useTrimStrings alone - required string gets trim() but not min(1)', () => {
		const field: DMMF.Field = {
			hasDefaultValue: false,
			isGenerated: false,
			isId: false,
			isList: false,
			isRequired: true,
			isUnique: false,
			isReadOnly: false,
			isUpdatedAt: false,
			kind: 'scalar',
			name: 'title',
			type: 'String',
		}

		const constructor = getZodConstructor(field, undefined, undefined, {
			useTrimStrings: true
		})

		expect(constructor).toBe('z.string()')
	})

	test('useMinLength with VarChar max length - includes both trim and max', () => {
		const field: DMMF.Field = {
			hasDefaultValue: false,
			isGenerated: false,
			isId: false,
			isList: false,
			isRequired: true,
			isUnique: false,
			isReadOnly: false,
			isUpdatedAt: false,
			kind: 'scalar',
			name: 'title',
			type: 'String',
		}

		const constructor = getZodConstructor(field, undefined, 'VarChar(255)', { useMinLength: true })

		expect(constructor).toBe('z.string().max(255).min(1)')
	})

	test('useMinLength with VarChar and trim - includes max, trim, and min', () => {
		const field: DMMF.Field = {
			hasDefaultValue: false,
			isGenerated: false,
			isId: false,
			isList: false,
			isRequired: true,
			isUnique: false,
			isReadOnly: false,
			isUpdatedAt: false,
			kind: 'scalar',
			name: 'title',
			type: 'String',
		}

		const constructor = getZodConstructor(field, undefined, 'VarChar(255)', {
			useMinLength: true,
			useTrimStrings: true
		})

		expect(constructor).toBe('z.string().max(255).trim().min(1)')
	})

	test('useMinLength with VarChar, trim and prefault - includes max, trim, min and prefault', () => {
		const field: DMMF.Field = {
			hasDefaultValue: false,
			isGenerated: false,
			isId: false,
			isList: false,
			isRequired: true,
			isUnique: false,
			isReadOnly: false,
			isUpdatedAt: false,
			kind: 'scalar',
			name: 'title',
			type: 'String',
		}

		const constructor = getZodConstructor(field, undefined, 'VarChar(255)', {
			useMinLength: true,
			useTrimStrings: true,
			usePrefaultEmptyString: true
		})

		expect(constructor).toBe('z.string().max(255).trim().min(1).prefault("")')
	})

	test('useMinLength does not affect uuid strings', () => {
		const field: DMMF.Field = {
			hasDefaultValue: false,
			isGenerated: false,
			isId: false,
			isList: false,
			isRequired: true,
			isUnique: false,
			isReadOnly: false,
			isUpdatedAt: false,
			kind: 'scalar',
			name: 'id',
			type: 'String',
		}

		const constructor = getZodConstructor(field, undefined, 'Uuid', { useMinLength: true })

		expect(constructor).toBe('z.uuid()')
	})
})
