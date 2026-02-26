import http from 'http'
import { createReadStream, existsSync } from 'fs'
import { join, extname } from 'path'
import { AppPaths } from '../appPaths'
import log from 'electron-log/main'

let server: http.Server | null = null
let port: number = 0

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif'
}

export function startLocalPageServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      // URL format: /library/{mangaId}/{chapterId}/{filename}
      const url = req.url ?? '/'
      const stripped = url.startsWith('/') ? url.slice(1) : url
      const parts = stripped.split('/')

      if (parts[0] !== 'library' || parts.length < 4) {
        res.writeHead(400)
        res.end('Bad request')
        return
      }

      const [, mangaId, chapterId, filename] = parts
      const filePath = join(AppPaths.library, mangaId, chapterId, filename)

      if (!existsSync(filePath)) {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      const ext = extname(filename).toLowerCase()
      const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'max-age=3600',
        'Access-Control-Allow-Origin': '*'
      })

      createReadStream(filePath).pipe(res)
    })

    server.listen(0, '127.0.0.1', () => {
      const addr = server!.address() as { port: number }
      port = addr.port
      log.info(`Local page server started on port ${port}`)
      resolve(port)
    })

    server.on('error', reject)
  })
}

export function getLocalPageServerPort(): number {
  return port
}

export function getLocalPageUrl(mangaId: string, chapterId: string, filename: string): string {
  return `http://127.0.0.1:${port}/library/${mangaId}/${chapterId}/${filename}`
}

export function stopLocalPageServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!server) { resolve(); return }
    server.close(() => {
      server = null
      port = 0
      resolve()
    })
  })
}
