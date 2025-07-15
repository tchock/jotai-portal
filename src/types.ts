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

type AtomCreatorOrReturnAtom<
  ReturnAtom,
  Args extends Array<unknown>,
> = Args['length'] extends 0
  ? ((...args: Args) => ReturnAtom) | ReturnAtom
  : (...args: Args) => ReturnAtom

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
  AtomCreatorOrReturnAtom,
  BrandedPrefix,
  PrefixedBrand,
  BrandedAtom,
}
