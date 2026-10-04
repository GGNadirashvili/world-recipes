// Polite, cached client for the Wikibooks API (Wikimedia asks for a descriptive
// User-Agent, sequential requests, and respect for Retry-After).
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const ENDPOINT = 'https://en.wikibooks.org/w/api.php'
const UA = 'world-recipes/0.1 (https://github.com/GGNadirashvili/world-recipes; recipe map hobby project)'
const CACHE = '.cache/wikibooks'
const GAP_MS = 1200

let last = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function api(params) {
  const qs = new URLSearchParams({ format: 'json', formatversion: '2', ...params })
  const key = createHash('sha1').update(qs.toString()).digest('hex')
  const file = `${CACHE}/${key}.json`
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {}

  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(Math.max(0, last + GAP_MS - Date.now()))
    last = Date.now()
    const res = await fetch(`${ENDPOINT}?${qs}`, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } })
    if (res.status === 429 || res.status >= 500) {
      const wait = Number(res.headers.get('retry-after')) || 5 * 2 ** attempt
      console.error(`  HTTP ${res.status}, waiting ${wait}s`)
      await sleep(wait * 1000)
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${qs}`)
    const json = await res.json()
    await mkdir(CACHE, { recursive: true })
    await writeFile(file, JSON.stringify(json))
    return json
  }
  throw new Error(`gave up on ${qs}`)
}

/** Follows API continuation, yielding each page of results. */
export async function* paged(params) {
  let cont = {}
  do {
    const json = await api({ ...params, ...cont })
    yield json
    cont = json.continue ?? null
  } while (cont)
}
