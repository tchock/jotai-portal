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
linked to each other. That's why `portalAtom` uses branded types for the linked atoms.

Branded types are properties of an object that don't really exist in JS itself, but are helpful in
the TypeScript world. They are usually used to differentiate two types that are structurally the same
(like a user ID and article ID, that both use the type string, but are describing different things).

We can also use this technique to make `portalAtom` extract the output type. `jotai-portal` exports
the `BrandedAtom` type, that gives that linking ability. It prefixes the branded keys internally,
so there will be no conflicts with your props (plus those type props are marked as optional).

```ts
import type { BrandedAtom } from 'jotai-portal';

// Let's say you want to output a read-only atom ...
type InternalArrayAtom<T> = Atom<T[]>;
// ... and want to attach a "get item by ID" atom that can also write the item itself to the array.
type ItemAtom<T> = WritableAtom<T, [T], void>;

// You can define one or more linked atom types with the BrandedAtom type.
// The first generic is the type for the main output atom, second one the resolver for
// linked atoms you want to expose by the portalAtom function.
type ArrayAtom<T> = BrandedAtom<InternalArrayAtom<T>, {
  // The key "itemAtom" can be referred to by the portalAtom function, it then be resolved when this atom type is passed to the getter
  itemAtom: ItemAtom<T>; 
}>

interface User {
  id: string;
  name: string;
}

interface Author {
  id: string;
  fullName: string;
  pseudonym: string;
}

// In the portalAtom function you use the branded keys you defined above (in this case "itemAtom").
// Second generic is an array of additional arguments, more on that later.
// The getter uses the matching type value of the passed atom with the BrandedAtom type (in this case "ItemAtom<T>")
const [itemAtom, itemAtomCreator] = portalAtom<'itemAtom', [id: string]>();

const createListAtom = <T>(): ArrayAtom<T> => {
  const writableListAtom = atom([]);
  // This atom is using the branded type, so 
  const myListAtom: ArrayAtom<Item> = atom(get => get(writableListAtom)) as ArrayAtom<T>;
  // The created atom is type checked as well in the creator
  itemAtomCreator(myListAtom, id => atom(/* get function */, /* write function */))
  return myListAtom;
}

const userListAtom = createListAtom<User>();
// userAtom has the type from resolver object (itemAtom) of the ArrayAtom type -> ItemAtom<User>
const userAtom = getItemAtom(userListAtom, '1234');

const authorListAtom = createListAtom<Author>();
// authorAtom also uses the same resolver type, but with different generic passed -> ItemAtom<Author>
const authorAtom = getItemAtom(authorListAtom, '4321');
```

As you can see in the example above, the `BrandedAtom` takes the type of the output atom and a resolver
map as generics. When using `portalAtom` you define the key of that resolver map as the first generic.
The getter function then uses the type value of that key from the `BrandedAtom` that has been passed to it.

So the type of the atom you pass to the getter function holds the type for the output in it.

You can define as many resolver properties as you need:

```ts
type ListAtom<T> = Atom<T[]>;
// You can use writable atoms
type ItemAtom<T> = WritableAtom<T, [T], void>;
// Or write only atoms
type AddItemAtom<T> = WritableAtom<null, [T], void>;
type RemoveItemAtom<T> = WritableAtom<null, [T | string], void>;
// Or atoms without arguments
type ClearAtom = WritableAtom<null, [], void>;

type ReadOnlyArrayAtom<T> = BrandedAtom<ListAtom<T>, {
  itemAtom: ItemAtom<T>;
  addItemAtom: AddItemAtom<T>;
  removeItemAtom: RemoveItemAtom<T>;
  clearAtom: ClearAtom;
}>
```

### Arguments

As already described in the example above atoms can optionally use different arguments for atom
creations. In TypeScript you can use the second generic argument to define those as an array:

```ts
const [filterProductAtom] = portalAtom<'itemType', [brand: string, minPrice?: number]>();
const vwCarsAtom = filterProductAtom(carsAtom, 'VW'); // minPrice argument is optional
const bmwLuxuryCarsAtom = filterProductAtom(carsAtom, 'BWM', 80000);
```
