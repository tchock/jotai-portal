import { atom } from 'jotai/vanilla'
import { atomFamily } from 'jotai/vanilla/utils'

import type {
  AnyAtom,
  AtomCreatorOrReturnAtom,
  AtomType,
  ConditionalReturnAtom,
  PrefixedBrand,
} from './types'

const portalAtom = <
  BrandKey extends string,
  Args extends Array<unknown> = [],
  ReturnAtomType extends AtomType = 'primitive',
>() => {
  type PrefixedBrandKey = PrefixedBrand<BrandKey>
  type BrandedLinkedAtom = AnyAtom & { [key in PrefixedBrandKey]: unknown }
  const atomCreatorMap = new WeakMap<AnyAtom, () => AnyAtom>()
  const familyCacheKeys = new WeakMap<AnyAtom, Set<unknown>>()

  const family = atomFamily<[AnyAtom, ...Args], AnyAtom>(
    ([linkedAtom, ...args]) => {
      // Remember the arguments used to create the atom, so we can clear the cache of the atomFamily
      // when a new creator is set
      const familyKeySet = familyCacheKeys.get(linkedAtom) || new Set()
      familyKeySet.add(args)
      familyCacheKeys.set(linkedAtom, familyKeySet)

      const atomCreator = atomCreatorMap.get(linkedAtom)
      if (!atomCreator) {
        return atom(null, () => {})
      }

      // eslint-disable-next-line prefer-spread
      const result = atomCreator.apply(null, args)

      // If creator returns null/undefined, return default atom
      if (result === null || result === undefined) {
        return atom(null, () => {})
      }

      return result
    },
    (a, b) => {
      return a.length === b.length && a.every((arg, index) => arg === b[index])
    }
  )
  const get = <LinkedAtom extends BrandedLinkedAtom>(
    linkedAtom: LinkedAtom,
    ...args: Args
  ) => {
    type OutputAtom = LinkedAtom[PrefixedBrandKey] extends AnyAtom
      ? ConditionalReturnAtom<LinkedAtom[PrefixedBrandKey], ReturnAtomType>
      : AnyAtom
    return family([linkedAtom, ...args]) as OutputAtom
  }

  const set = <LinkedAtom extends BrandedLinkedAtom>(
    linkedAtom: LinkedAtom,
    creator:
      | AtomCreatorOrReturnAtom<
          ConditionalReturnAtom<LinkedAtom[PrefixedBrandKey], ReturnAtomType>,
          Args
        >
      | null
      | undefined
  ) => {
    // Clear the caches for the atom before registering a new creator
    familyCacheKeys.get(linkedAtom)?.forEach((key) => {
      family.remove([linkedAtom, ...(key as never)])
    })

    if (creator === null || creator === undefined) {
      return
    }

    const internalCreator =
      typeof creator === 'function' ? creator : () => creator
    atomCreatorMap.set(linkedAtom, internalCreator as never)
  }

  return [get, set] as const
}

export { portalAtom }
