import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

const privateIndex = path.join(here, 'private/index.ts')
const standIn = path.join(here, 'src/privateContent.ts')
const corpus = path.join(here, 'private/imported/ocra-puzzles.json')
const hasPrivate = existsSync(privateIndex)

/**
 * Whether this build of the pack carries the private content. The public pack installs for every user, so it leaves
 * out the lecture-derived enzymes and the recovered corpus (owner, 2026-11-13). `bun run build:private` sets
 * MNX_PACK_CONTENT=private for the owner's own copy. Tests read the private content whenever it is present.
 */
export const packIncludesPrivate = hasPrivate && process.env.MNX_PACK_CONTENT === 'private'

/** Where `@private-content` resolves for tests: the private folder when present, else the public empty stand-in. */
export const privateContentPath = hasPrivate ? privateIndex : standIn

/** Where `@private-content` resolves in a pack build. */
export const packPrivateContentPath = packIncludesPrivate ? privateIndex : standIn

/** The recovered level corpus, or null in a public clone. */
export const importedCorpusPath = existsSync(corpus) ? corpus : null

/** The corpus a pack build ships, or null for the public pack. */
export const packImportedCorpusPath = packIncludesPrivate ? importedCorpusPath : null
