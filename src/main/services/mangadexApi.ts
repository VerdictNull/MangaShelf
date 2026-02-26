import axios, { AxiosInstance } from 'axios'
import PQueue from 'p-queue'
import log from 'electron-log/main'
import type {
  AtHomeResponse,
  Chapter,
  ContentRating,
  Manga,
  MangaDexChapter,
  MangaDexManga,
  MangaDexTag,
  SearchParams
} from '@shared/types'

const BASE_URL = 'https://api.mangadex.org'
const UPLOADS_URL = 'https://uploads.mangadex.org'

// Rate limiter: 4 req/s (below MangaDex's 5/s limit)
const apiQueue = new PQueue({ intervalCap: 4, interval: 1000, concurrency: 4 })

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000,
  headers: {
    'User-Agent': 'MangaShelf/1.0.0',
    Accept: 'application/json'
  }
})

// Retry on 429, 5xx, and network resets (ECONNRESET, ETIMEDOUT, etc.)
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status
    const retryCount: number = error.config?._retryCount ?? 0

    if (status === 429) {
      const retryAfter = parseInt(error.response?.headers?.['retry-after'] ?? '2', 10)
      log.warn(`MangaDex 429 - retrying after ${retryAfter}s`)
      await sleep(retryAfter * 1000)
      return client({ ...error.config, _retryCount: retryCount + 1 })
    }
    if ((status >= 500 || !error.response) && retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 1000
      log.warn(`MangaDex request failed (${error.code ?? status}), retry ${retryCount + 1} in ${delay}ms`)
      await sleep(delay)
      return client({ ...error.config, _retryCount: retryCount + 1 })
    }
    return Promise.reject(error)
  }
)

function queued<T>(fn: () => Promise<T>): Promise<T> {
  return apiQueue.add(fn) as Promise<T>
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function buildCoverUrl(mangaId: string, filename: string, size: 256 | 512 | null = 256): string {
  const suffix = size ? `.${size}.jpg` : ''
  return `${UPLOADS_URL}/covers/${mangaId}/${filename}${suffix}`
}

export function buildPageUrl(baseUrl: string, hash: string, filename: string, dataSaver = false): string {
  const quality = dataSaver ? 'data-saver' : 'data'
  return `${baseUrl}/${quality}/${hash}/${filename}`
}

function parseMangaDexManga(item: MangaDexManga): Omit<Manga, 'createdAt' | 'updatedAt'> {
  const { id, attributes, relationships } = item
  const title =
    attributes.title['en'] ??
    attributes.title['ja-ro'] ??
    Object.values(attributes.title)[0] ??
    'Unknown'

  const authors = relationships
    .filter((r) => r.type === 'author')
    .map((r) => r.attributes?.name ?? '')
    .filter(Boolean)
  const artists = relationships
    .filter((r) => r.type === 'artist')
    .map((r) => r.attributes?.name ?? '')
    .filter(Boolean)

  const coverRel = relationships.find((r) => r.type === 'cover_art')
  const coverFilename = coverRel?.attributes?.fileName ?? null

  const tags = attributes.tags.map(
    (t) => t.attributes.name['en'] ?? Object.values(t.attributes.name)[0] ?? ''
  )

  return {
    id,
    source: 'mangadex',
    title,
    titleAlt: attributes.altTitles.map(
      (t) => t['en'] ?? t['ja-ro'] ?? Object.values(t)[0] ?? ''
    ),
    description:
      attributes.description['en'] ?? Object.values(attributes.description)[0] ?? '',
    status: attributes.status,
    demographic: attributes.demographic,
    contentRating: attributes.contentRating,
    year: attributes.year,
    authors,
    artists,
    tags,
    coverUrl: coverFilename ? buildCoverUrl(id, coverFilename) : null,
    coverLocalPath: null,
    coverFilename,
    lastFetchedAt: Date.now()
  }
}

function parseMangaDexChapter(item: MangaDexChapter, mangaId: string): Omit<Chapter, 'createdAt'> {
  const { id, attributes, relationships } = item
  const groupRel = relationships.find((r) => r.type === 'scanlation_group')

  return {
    id,
    mangaId,
    source: 'mangadex',
    chapterNumber: attributes.chapter ? parseFloat(attributes.chapter) : null,
    volumeNumber: attributes.volume,
    title: attributes.title,
    language: attributes.translatedLanguage,
    translatorGroup: groupRel?.attributes?.name ?? null,
    pageCount: attributes.pages,
    publishedAt: new Date(attributes.publishAt).getTime(),
    isDownloaded: false,
    downloadPath: null,
    fileSizeBytes: null
  }
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function searchManga(params: SearchParams): Promise<{
  manga: Omit<Manga, 'createdAt' | 'updatedAt'>[]
  total: number
}> {
  const contentRatings: ContentRating[] = params.contentRating ?? ['safe', 'suggestive']

  const qp: Record<string, unknown> = {
    limit: params.limit ?? 24,
    offset: params.offset ?? 0,
    'includes[]': ['cover_art', 'author', 'artist'],
    'contentRating[]': contentRatings,
    'order[followedCount]': 'desc'
  }

  if (params.query) qp['title'] = params.query
  if (params.tags?.length) qp['includedTags[]'] = params.tags
  if (params.excludeTags?.length) qp['excludedTags[]'] = params.excludeTags
  if (params.status?.length) qp['status[]'] = params.status
  if (params.demographic?.length) qp['publicationDemographic[]'] = params.demographic

  if (params.sortBy) {
    // Clear default order and set requested
    delete qp['order[followedCount]']
    if (params.sortBy === 'title') {
      qp[`order[title]`] = params.sortOrder ?? 'asc'
    } else if (params.sortBy !== 'relevance') {
      qp[`order[${params.sortBy}]`] = params.sortOrder ?? 'desc'
    }
  }

  const res = await queued(() =>
    client.get('/manga', {
      params: qp,
      paramsSerializer: (p) => {
        const parts: string[] = []
        for (const [k, v] of Object.entries(p)) {
          if (Array.isArray(v)) {
            for (const item of v) parts.push(`${k}=${encodeURIComponent(item)}`)
          } else {
            parts.push(`${k}=${encodeURIComponent(String(v))}`)
          }
        }
        return parts.join('&')
      }
    })
  )

  return {
    manga: res.data.data.map(parseMangaDexManga),
    total: res.data.total
  }
}

export async function getMangaDetail(
  id: string
): Promise<Omit<Manga, 'createdAt' | 'updatedAt'> | null> {
  try {
    const res = await queued(() =>
      client.get(`/manga/${id}`, {
        params: { 'includes[]': ['cover_art', 'author', 'artist'] }
      })
    )
    return parseMangaDexManga(res.data.data)
  } catch (err: any) {
    if (err.response?.status === 404) return null
    throw err
  }
}

export async function getChapters(
  mangaId: string,
  language = 'en',
  offset = 0,
  limit = 500
): Promise<{ chapters: Omit<Chapter, 'createdAt'>[]; total: number }> {
  const res = await queued(() =>
    client.get(`/manga/${mangaId}/feed`, {
      params: {
        'translatedLanguage[]': language,
        limit,
        offset,
        'includes[]': ['scanlation_group'],
        'order[chapter]': 'asc'
      }
    })
  )
  return {
    chapters: res.data.data.map((ch: MangaDexChapter) => parseMangaDexChapter(ch, mangaId)),
    total: res.data.total
  }
}

export async function getAllChapters(
  mangaId: string,
  language = 'en'
): Promise<Omit<Chapter, 'createdAt'>[]> {
  const pageSize = 500
  const first = await getChapters(mangaId, language, 0, pageSize)
  let chapters = first.chapters

  if (first.total > pageSize) {
    const remaining = Math.ceil((first.total - pageSize) / pageSize)
    const promises = Array.from({ length: remaining }, (_, i) =>
      getChapters(mangaId, language, (i + 1) * pageSize, pageSize)
    )
    const pages = await Promise.all(promises)
    for (const page of pages) chapters = chapters.concat(page.chapters)
  }

  // Deduplicate: keep latest scanlation per chapter number
  const seen = new Map<number | null, Omit<Chapter, 'createdAt'>>()
  for (const ch of chapters) {
    const key = ch.chapterNumber
    if (!seen.has(key) || (ch.publishedAt ?? 0) > (seen.get(key)?.publishedAt ?? 0)) {
      seen.set(key, ch)
    }
  }

  return Array.from(seen.values()).sort((a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0))
}

export async function getAtHomeServer(chapterId: string): Promise<AtHomeResponse> {
  const res = await queued(() => client.get(`/at-home/server/${chapterId}`))
  return res.data as AtHomeResponse
}

export async function getTags(): Promise<MangaDexTag[]> {
  const res = await queued(() => client.get('/tag'))
  return res.data.data.map((t: any) => ({
    id: t.id,
    name: t.attributes.name.en ?? Object.values(t.attributes.name)[0],
    group: t.attributes.group
  }))
}

export async function getRandomManga(): Promise<Omit<Manga, 'createdAt' | 'updatedAt'> | null> {
  try {
    const res = await queued(() =>
      client.get('/manga/random', {
        params: {
          'includes[]': ['cover_art', 'author', 'artist'],
          'contentRating[]': ['safe', 'suggestive']
        }
      })
    )
    return parseMangaDexManga(res.data.data)
  } catch {
    return null
  }
}

export async function downloadImageBuffer(url: string): Promise<Buffer> {
  // Image downloads do NOT use auth headers
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30_000,
    headers: { 'User-Agent': 'MangaShelf/1.0.0' }
  })
  return Buffer.from(res.data)
}
