# jotai-portal

Create exposed derived atoms from internal atoms easily.

## What is this for?

In Jotai an atom can be derived if you have access to it like this:

```ts
const numberAtom = atom(10);
const doubleNumberAtom = atom(get => get(numberAtom) * 2);
```

But what if you don't have access to the atom you want to derive from on the outside. To elaborate
more on that, let's create a `mapAtom` for example, that uses a primitive `Map` atom internally, but
exposes a derived atom that returns an easily consumable array and a reducer interface to modify the map.

```ts
const indexedMapAtom = (initValue = []) => {
  const mapAtom = atom(new Map());
  const outputAtom = atom(
    get => Array.from(get(mapAtom).entries()),
    (get, set, action) => {
      // ... add/remove/update/clear the map depending on action
    },
  );

  return outputAtom;
}
```

When using the `outputAtom` to access a specific item by ID, you would need to iterate over it, which
is not really performant. You already have a `Map` internally that is perfect for this use case, but
you can't access it from the outside. But you also don't want to expose the `Map` itself and keep
it as an implementation detail.

So you need to somehow create some kind of "portal" to access/create derived atoms from this internal
atom. This is where `jotai-portal` comes in:

```ts
const [getItemAtom, itemAtomCreator] = portalAtom();

const indexedMapAtom = (initValue = []) => {
  const mapAtom = atom(new Map());
  const outputAtom = atom(
    get => Array.from(get(mapAtom).entries()),
    (get, set, action) => {
      // ... add/remove/update/clear the map depending on action
    },
  );

  // register a function that creates the item accessor atom for this specific mapAtom
  itemAtomCreator(outputAtom, id => atom(
    get => get(mapAtom).get(id),
    (get, set, item) => {
      set(outputAtom, {
        type: 'update',
        id,
        item,
      });
    }));

  return outputAtom;
}
```

the `portalAtom` internally uses an atomFamily with the linked atom (`outputAtom` in the example above)
and the creator arguments as params. It exposes a function that creates the portal atoms (`getItemAtom`)
and a creator function (`itemAtomCreator`), that describes how to create portal atoms for a specific
linked atom.

You could then use the `getItemAtom` from above like so:

```ts
const netflixShowsAtom = indexedMapAtom();
const squidGameId = '123';
const [squidGame, updateSquidGame] = useAtom(getItemAtom(netflixShowsAtom, '123'));
```

## Sharing portal atoms with different linked atoms

Because you can have a custom creator function for each individual linked atom, the origin atoms don't
even need to have the same interface for reading and writing, so you could use the same portal atom
for different atoms completely (for example simple arrays, maps, etc.):

```ts
// Arrays
const arrayAtom = atom([]);
itemAtomCreator(arrayAtom, (id) => atom(
  get => get(arrayAtom).find(item => item.id === id)
  (get, set, item) => {
    const arr = get(arrayAtom);
    const index = arr.findIndex(x => x.id === id);
    return [...arr.slice(0, index), item, ...arr.slice(index + 1)]
  }
));

getItemAtom(arrayAtom, '123');
getItemAtom(mapAtom, '123');
```

## TypeScript

### Getting proper types for the values of portal atoms

Inferring types out of the portal construct is not that easy, because they cannot really be statically
linked to each other (TypeScript might even not extract the needed type for the derived atom from it at all).

That's why `portalAtom` uses branded types for the linked atoms. Branded types are properties of an object
that don't really exist in JS itself and usually is used to differentiate two type that are structurally the same.
We can use this to make `portalAtom` to extract the output type.

```ts
interface Show {
  id: string;
  name: string;
  episodes: number;
  rating: number;
  trailerUrl: string;
}

interface StreamingService {
  id: string;
  name: string;
  availableShows: number;
}

// portalAtoms use __ prefix for the branded type key
type ArrayAtom<T> = WritableAtom<T[], [T[]], void> & {
  __itemType?: T;
}

// First generic argument is the brand type key, where the portal atom extracts it's return value type
const [itemAtom, itemCreator] = portalAtom<'itemType', [id: string]>();

// Create atoms with the resolver brand types
const showsAtom = atom([]) as ArrayAtom<Show>;
itemCreator(showsAtom, id => { /* get a single show atom by id */ });

const streamingServicesAtom = atom([]) as ArrayAtom<StreamingServices>;
itemCreator(streamingServicesAtom, id => { /* get a single streaming service atom by id */ });

// Through the '__itemType' brand type the portalAtom can get the return type from different atoms
const show: Show = itemAtom(showsAtom, '20352');
const service: StreamingService = itemAtom(streamingServicesAtom, '2');
```

To make this a bit easier, `jotai-portal` exposes a small utility type to wrap your atom type. It prefixes the types internally, so there will be no conflicts with your props.

```ts
import type { BrandedAtom } from 'jotai-portal';

type ArrayAtom<T> = BrandedAtom<WritableAtom<T[], [T[]], void>, {
  itemType: T;
}>

type ReadOnlyArrayAtom<T> = BrandedAtom<Atom<T[]>, {
  itemType: T;
}>

type PrimitiveArrayAtom<T> = BrandedAtom<PrimitiveAtom<T, {
  itemType: T;
}>>
```

The `BrandedAtom` takes the atom type and a resolver map. You can define as many resolver properties as you need:

```ts
type ReadOnlyArrayAtom<T> = BrandedAtom<T[], {
  itemType: T;
  removeArgType: T | string;
}>
```

### Arguments

Portal atoms can optionally use different arguments for atom creations. In TypeScript you can use the second
generic argument to define those as an array:

```ts
const [filterProductAtom] = portalAtom<'itemType', [brand: string, minPrice?: number]>();
const filteredCarsAtom = filterProductAtom(carsAtom, 'VW'); // minPrice argument is optional
const filteredLuxuryCarsAtom = filterProductAtom(luxuryCarsAtom, 'BWM', 80000);
```

### Different types of portal atoms

Jotai differentiates between writable, read-only, write-only and primitive atoms, so the portal atoms
could be also any of those types. To define the type of the returned atom, you can use the third generic argument:

```ts
const [getProductAtom] = portalAtom<'itemType', [id: string], 'primitive'>();
const [getReadOnlyProductAtom] = portalAtom<'itemType', [id: string], 'read-only'>();
const [addProductAtom] = portalAtom<'itemType', [], 'write-only'>(); // returned atom uses itemType as setter arg
const [clearProductsAtom] = portalAtom<'itemType', [], 'write-only-empty'>(); // returned atom has no setter arg
```
