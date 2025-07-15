import { expect, test, describe, beforeEach } from 'vitest'
import {
  atom,
  createStore,
  type WritableAtom,
  type PrimitiveAtom,
} from 'jotai/vanilla'
import { portalAtom } from './portal-atom'
import type { AnyAtom, BrandedAtom } from './types'

type BrandedTestAtom<T = AnyAtom> = BrandedAtom<AnyAtom, { testBrand: T }>

let store: ReturnType<typeof createStore>
beforeEach(() => {
  store = createStore()
})

describe('basic functionality', () => {
  test('create get and set functions', () => {
    const [get, set] = portalAtom<'testBrand'>()

    expect(typeof get).toBe('function')
    expect(typeof set).toBe('function')
  })

  test('return null atom when no creator is set', () => {
    const [get] = portalAtom<'testBrand'>()
    const linkedAtom = atom('test') as unknown as BrandedTestAtom<unknown>
    const relatedAtom = get(linkedAtom)

    expect(store.get(relatedAtom)).toBe(null)
  })

  test('create related atom using set creator', () => {
    const [get, set] = portalAtom<'testBrand'>()
    const linkedAtom = atom('test') as unknown as BrandedTestAtom
    const relatedAtom = atom('related-value') as never

    set(linkedAtom, relatedAtom)

    const result = get(linkedAtom)
    expect(store.get(result)).toBe('related-value')
  })

  test('create related atom using function creator', () => {
    const [get, set] = portalAtom<'testBrand'>()
    const linkedAtom = atom('test') as unknown as BrandedTestAtom

    set(linkedAtom, () => atom('function-created') as never)

    const result = get(linkedAtom)
    expect(store.get(result)).toBe('function-created')
  })

  test('handle different linked atoms independently', () => {
    const [get, set] = portalAtom<'testBrand'>()

    const linkedAtom1 = atom('test1') as unknown as BrandedTestAtom
    const linkedAtom2 = atom('test2') as unknown as BrandedTestAtom

    set(linkedAtom1, atom('related1') as never)
    set(linkedAtom2, atom('related2') as never)

    const result1 = get(linkedAtom1)
    const result2 = get(linkedAtom2)

    expect(store.get(result1)).toBe('related1')
    expect(store.get(result2)).toBe('related2')
    expect(result1).not.toBe(result2)
  })

  test('return atom with value null for unregistered linked atoms', () => {
    const [get, set] = portalAtom<'testBrand'>()
    const store = createStore()

    const linkedAtom1 = atom('test1') as unknown as BrandedTestAtom
    const linkedAtom2 = atom('test2') as unknown as BrandedTestAtom

    set(linkedAtom1, atom('related1') as never)

    const result1 = get(linkedAtom1)
    const result2 = get(linkedAtom2)

    expect(store.get(result1)).toBe('related1')
    expect(store.get(result2)).toBe(null)
  })

  test('returned atoms for unregistered linked atoms writable action should be a noop', () => {
    const [get] = portalAtom<'testBrand'>()
    const store = createStore()

    const linkedAtom = atom('test') as unknown as BrandedTestAtom<
      WritableAtom<null, [string], void>
    >

    const result1 = get(linkedAtom)

    expect(store.get(result1)).toBe(null)
    store.set(result1, 'some value')

    // The set action should be a noop, so the value should still be null
    expect(store.get(result1)).toBe(null)
  })

  test('handle creator function that returns null', () => {
    const [get, set] = portalAtom<'testBrand'>()
    const store = createStore()

    const linkedAtom = atom('test') as unknown as BrandedTestAtom

    // Set a creator that returns null (this means the creator function returns null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set(linkedAtom, () => null as any)

    const result = get(linkedAtom)
    // The atomFactory should handle this and return the default null atom
    expect(store.get(result)).toBe(null)
  })
})

describe('with arguments', () => {
  test('handle factory with arguments', () => {
    const [get, set] = portalAtom<'testBrand', [string, number]>()
    const linkedAtom = atom('test') as unknown as BrandedTestAtom

    set(
      linkedAtom,
      (str: string, num: number) => atom(`${str}-${num}`) as never
    )

    const result = get(linkedAtom, 'hello', 42)
    expect(store.get(result)).toBe('hello-42')
  })
})

describe('caching outputs', () => {
  test('cache atoms based on the linked atom (no arguments)', () => {
    const [get, set] = portalAtom<'testBrand'>()

    const linkedAtom = atom('test') as unknown as BrandedTestAtom<
      PrimitiveAtom<string>
    >
    const otherlinkedAtom = atom('test') as unknown as BrandedTestAtom<
      PrimitiveAtom<string>
    >

    set(linkedAtom, () => atom(`value`))
    set(otherlinkedAtom, () => atom(`value`))

    const result1 = get(linkedAtom)
    const result2 = get(linkedAtom)
    const otherResult1 = get(otherlinkedAtom)
    const otherResult2 = get(otherlinkedAtom)

    expect(result1).toBe(result2)
    expect(otherResult1).toBe(otherResult2)
    expect(result1).not.toBe(otherResult1)
  })

  test('cache atoms based on linked atom and single argument', () => {
    const [get, set] = portalAtom<'testBrand', [string]>()
    let callCount = 0

    const linkedAtom = atom('test') as unknown as BrandedTestAtom

    set(linkedAtom, (str: string) => {
      callCount += 1
      return atom(`value-${str}-${callCount}`) as never
    })

    const result1 = get(linkedAtom, 'test')
    const result2 = get(linkedAtom, 'different')
    const result3 = get(linkedAtom, 'test')

    expect(store.get(result1)).toBe('value-test-1')
    expect(store.get(result2)).toBe('value-different-2')
    expect(store.get(result3)).toBe('value-test-1')

    expect(result1).not.toBe(result2)
    expect(result1).toBe(result3)
    expect(callCount).toBe(2)
  })

  test('cache atoms based on linked atom and multiple arguments', () => {
    const [get, set] = portalAtom<'testBrand', [string, number, string]>()
    let callCount = 0

    const linkedAtom = atom('test') as unknown as BrandedTestAtom

    set(linkedAtom, (str: string, num: number, otherString: string) => {
      callCount += 1
      return atom(`value-${str}-${num}-${otherString}`)
    })

    // First call should always create a new atom
    const aResult1 = get(linkedAtom, 'a', 123, 'more-test')
    expect(callCount).toBe(1)
    expect(store.get(aResult1)).toBe('value-a-123-more-test')

    // Second call with the exact same arguments should return the cached atom
    const aResult2 = get(linkedAtom, 'a', 123, 'more-test')
    expect(store.get(aResult2)).toBe('value-a-123-more-test')
    expect(callCount).toBe(1) // Should still be 1, no new atom created
    expect(aResult1).toBe(aResult2) // Should be the same atom from the cache

    // When calling with different arguments (e.g. first argument is different),
    // a new atom should be created and the cache should not be used
    const bResult1 = get(linkedAtom, 'b', 123, 'more-test')
    expect(callCount).toBe(2) // Should be 2 now, new atom created

    // ... and second call should return the cached atom
    const bResult2 = get(linkedAtom, 'b', 123, 'more-test')
    expect(callCount).toBe(2) // Should still be 2, no new atom created
    expect(bResult1).toBe(bResult2) // Should be the same atom from the cache

    // Different argument combinations should create new atoms and not use the cache
    expect(aResult1).not.toBe(bResult1)
    expect(aResult1).not.toBe(bResult2)

    // All the arguments should be considered for caching
    // If any argument is different, a new atom should be created
    const aMixResult1 = get(linkedAtom, 'a', 124, 'more-test')
    expect(callCount).toBe(3)
    const aMixResult2 = get(linkedAtom, 'a', 123, 'no-more-test')
    expect(callCount).toBe(4)
    expect(aResult1).not.toBe(aMixResult1)
    expect(aResult1).not.toBe(aMixResult2)
    expect(aMixResult1).not.toBe(aMixResult2)
  })

  test('different linked atoms with same arguments do not share cache', () => {
    const [get, set] = portalAtom<'testBrand', [string, number, string]>()
    let callCount = 0

    const linkedAtom1 = atom('test') as unknown as BrandedTestAtom
    const linkedAtom2 = atom('test') as unknown as BrandedTestAtom

    const creator = (str: string, num: number, otherString: string) => {
      callCount += 1
      return atom(`value-${str}-${num}-${otherString}`)
    }

    // Use the same creator function for both linked atoms
    set(linkedAtom1, creator)
    set(linkedAtom2, creator)

    const result1 = get(linkedAtom1, 'a', 123, 'more-test')
    const result2 = get(linkedAtom2, 'a', 123, 'more-test')

    // Because creator is the same, callCount should be 2
    expect(callCount).toBe(2)

    // But the results should be different atoms, because of the different linked atoms
    expect(result1).not.toBe(result2)
    // The values of both atoms should be the same (because they share the same creator)
    expect(store.get(result1)).toBe(store.get(result2))
  })

  test('unregistered linked atoms also use the cache', () => {
    const [get] = portalAtom<'testBrand'>()
    const store = createStore()

    const linkedAtom = atom('test') as unknown as BrandedTestAtom

    const unregisteredResult = get(linkedAtom)
    const secondUnregisteredResult = get(linkedAtom)

    // Returned atoms from unregistered linked atoms should return null
    expect(store.get(unregisteredResult)).toBe(null)
    expect(store.get(secondUnregisteredResult)).toBe(null)

    // The getter should always use the cache, no matter if the linked atom was registered or not
    expect(unregisteredResult).toBe(secondUnregisteredResult)
  })

  test('clear cache when creator function is set for the first time', () => {
    const [get, set] = portalAtom<'testBrand'>()
    const store = createStore()

    const linkedAtom = atom('test') as unknown as BrandedTestAtom

    // Unregistered linked atoms should return cached null atom
    const unregisteredResult1 = get(linkedAtom)
    const unregisteredResult2 = get(linkedAtom)
    expect(store.get(unregisteredResult1)).toBe(null)
    expect(store.get(unregisteredResult2)).toBe(null)
    expect(unregisteredResult1).toBe(unregisteredResult2)

    // Set a creator function for the first time
    set(linkedAtom, () => atom('new-related'))

    // The cache should be cleared and the new atom should be created
    const registeredResult = get(linkedAtom)
    expect(store.get(registeredResult)).toBe('new-related')
    expect(unregisteredResult1).not.toBe(registeredResult)
  })

  test('clear cache of all arguments when creator function is overwritten for the same ref atom', () => {
    const [get, set] = portalAtom<
      'testBrand',
      [a?: string, b?: number, c?: boolean]
    >()
    const store = createStore()

    const linkedAtom = atom('test') as unknown as BrandedTestAtom

    // Set a creator function for the first time
    set(linkedAtom, (a, b, c) => atom(`result1-${a}-${b}-${c}`))
    const testCasesInitial = [
      [[], 'result1-undefined-undefined-undefined'],
      [['arg1'], 'result1-arg1-undefined-undefined'],
      [['arg1', 2], 'result1-arg1-2-undefined'],
      [['arg1', 2, true], 'result1-arg1-2-true'],
    ]

    const resultsInitial = testCasesInitial.map(([args, expectedValue]) => {
      const result1 = get.apply(null, [linkedAtom, ...args])
      const result2 = get.apply(null, [linkedAtom, ...args])
      expect(result1).toBe(result2)
      expect(store.get(result1)).toBe(expectedValue)
      return [result1, result2]
    })

    // Override the creator function with a new one, cache should be cleared
    set(linkedAtom, (a, b, c) => atom(`result2-${a}-${b}-${c}`))
    const testCasesOverride = [
      [[], 'result2-undefined-undefined-undefined'],
      [['arg1'], 'result2-arg1-undefined-undefined'],
      [['arg1', 2], 'result2-arg1-2-undefined'],
      [['arg1', 2, true], 'result2-arg1-2-true'],
    ]

    const resultsOverride = testCasesOverride.map(([args, expectedValue]) => {
      const result1 = get.apply(null, [linkedAtom, ...args])
      const result2 = get.apply(null, [linkedAtom, ...args])
      expect(result1).toBe(result2)
      expect(store.get(result1)).toBe(expectedValue)
      return [result1, result2]
    })

    // The cache should have been cleared and the new atoms should be created
    resultsInitial.forEach(([resultInitial], index) => {
      expect(resultInitial).not.toBe(resultsOverride[index][0])
    })

    // Make sure all assertions were made
    expect.assertions(2 * 8 + 4)
  })
})

describe('type safety and branding', () => {
  test('should work with different brand keys', () => {
    const [get1, set1] = portalAtom<'brand1'>()
    const [get2, set2] = portalAtom<'brand2'>()
    const store = createStore()

    const linkedAtom1 = atom('test1') as unknown as BrandedAtom<
      AnyAtom,
      {
        brand1: AnyAtom
      }
    >
    const linkedAtom2 = atom('test2') as unknown as BrandedAtom<
      AnyAtom,
      {
        brand2: AnyAtom
      }
    >

    set1(linkedAtom1, atom('related1'))
    set2(linkedAtom2, atom('related2'))

    const result1 = get1(linkedAtom1)
    const result2 = get2(linkedAtom2)

    expect(store.get(result1)).toBe('related1')
    expect(store.get(result2)).toBe('related2')
  })

  // This test is skipped because currently only simple primitive types are supported
  // and complex types like objects or arrays are not properly compared for equality.
  test.skip('should handle complex argument types', () => {
    const [get, set] = portalAtom<
      'testBrand',
      [{ id: string; value: number }, string[]]
    >()
    const store = createStore()

    const linkedAtom = atom('test') as unknown as BrandedAtom<
      AnyAtom,
      {
        testBrand: AnyAtom
      }
    >

    set(linkedAtom, (obj: { id: string; value: number }, arr: string[]) =>
      atom(`${obj.id}-${obj.value}-${arr.join(',')}`)
    )

    const result = get(linkedAtom, { id: 'test', value: 42 }, ['a', 'b', 'c'])
    expect(store.get(result)).toBe('test-42-a,b,c')
  })
})

describe('edge cases', () => {
  test('handle object arguments with reference equality', () => {
    const [get, set] = portalAtom<'testBrand', [{ value: number }]>()
    const linkedAtom = atom('test') as unknown as BrandedAtom<
      PrimitiveAtom<string>,
      {
        testBrand: PrimitiveAtom<number>
      }
    >

    set(linkedAtom, (obj) => atom(obj.value))

    const obj1 = { value: 42 }
    const obj2 = { value: 42 }

    const atom1 = get(linkedAtom, obj1)
    const atom2 = get(linkedAtom, obj1) // Same reference
    const atom3 = get(linkedAtom, obj2) // Different reference, same value

    expect(atom1).toBe(atom2) // Same reference should be cached
    expect(atom1).not.toBe(atom3) // Different references should create different atoms
  })
})
