import type { Atom, PrimitiveAtom, WritableAtom } from 'jotai/vanilla'

type AnyAtom =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | WritableAtom<any, any[], unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | PrimitiveAtom<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Atom<any>

type NullableAtom<Read, Write, ReturnValue = void> = WritableAtom<
  Read | null | undefined,
  [Write | null],
  ReturnValue
>

type AtomType = 'primitive' | 'read-only' | 'write-only' | 'write-only-empty'

type ConditionalReturnAtom<
  T,
  ReturnType extends AtomType,
> = ReturnType extends 'primitive'
  ? NullableAtom<T, T, void>
  : ReturnType extends 'read-only'
    ? Atom<T>
    : ReturnType extends 'write-only'
      ? WritableAtom<unknown, [T], void>
      : ReturnType extends 'write-only-empty'
        ? WritableAtom<unknown, [], void>
        : never

type AtomCreatorOrReturnAtom<ReturnAtom, Args extends Array<unknown>> =
  | ((...args: Args) => ReturnAtom)
  | ReturnAtom

type BrandedPrefix = '__portalAtomBrand__'
type PrefixedBrand<T> = `${BrandedPrefix}${string & T}`

type BrandedAtom<
  AtomType,
  BrandKeys extends Record<string, unknown>,
> = AtomType & {
  [K in keyof BrandKeys as PrefixedBrand<K>]: BrandKeys[K]
}

export type {
  AnyAtom,
  NullableAtom,
  ConditionalReturnAtom,
  AtomCreatorOrReturnAtom,
  AtomType,
  BrandedPrefix,
  PrefixedBrand,
  BrandedAtom,
}
