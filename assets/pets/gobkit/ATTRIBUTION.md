# Gobkit Free Animal Pack — Attribution & License

**Source:** [Gobkit Free Animal Pack](https://gobkit.itch.io/gobkit-free-animal-pack)  
**Author:** Gobkit ([gobkit.com](https://gobkit.com))  
**Format:** glTF 2.0 binary (`.glb`), rigged low-poly animals with named animation clips  
**Downloaded from:** `https://gobkit.com/freebies/animal/*.glb` (same CC0 pack mirrored from itch.io)

## License

**CC0 1.0 Universal (public domain dedication)**  
Commercial use allowed. Attribution is **not required**.  
Full text: https://creativecommons.org/publicdomain/zero/1.0/

Credit (optional, welcomed by the author):  
`Characters by Gobkit — https://gobkit.com`

## Files shipped in this folder

| File | Creature |
|------|----------|
| `Anglerfish.glb` | Anglerfish |
| `Bat.glb` | Bat |
| `Corgi.glb` | Corgi |
| `Duck.glb` | Duck |
| `Hippo.glb` | Hippo |
| `Jellyfish.glb` | Jellyfish |
| `Platypus.glb` | Platypus |
| `Red.glb` | Red panda |
| `Rhino.glb` | Rhino |
| `Shark.glb` | Shark |

## Animation clips (verified)

Each GLB exposes **separate named clips** (not one concatenated track):

- `idle`
- `attack` (mapped to pet “react”)
- `dead` (unused in MVP)
- `walk`

There is **no dedicated sleep clip**. The app plays slowed `idle` plus a light procedural bob for sleep. Missing clips are resolved via `resolveClipName()` with procedural fallbacks — the app never references clip names that are absent from the loaded asset.

## Pets enabled in the MVP catalog

The in-app catalog uses a polished subset: Corgi, Duck, Red Panda, Platypus, Hippo, Bat. Remaining GLBs are kept in-tree for easy expansion via `src/shared/pets.ts`.
