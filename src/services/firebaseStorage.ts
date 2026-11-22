import { collection, doc, onSnapshot, writeBatch, type Firestore } from 'firebase/firestore'
import type { Course } from '../types'
import { sampleCourses, type SyncCourseStore } from './storage'

const chunkSize = 150_000
const maxWorkspaceBytes = 5 * 1024 * 1024

interface WorkspaceSnapshot {
  courses: Course[]
  revision?: string
}

interface Listener {
  update: (snapshot: WorkspaceSnapshot) => void
  fail: (error: unknown) => void
}

function serialize(courses: Course[]) {
  const text = JSON.stringify(courses)
  if (new TextEncoder().encode(text).length > maxWorkspaceBytes) throw new Error('Workspace exceeds the storage limit')
  const chunks: string[] = []
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + chunkSize, text.length)
    // Keep UTF-16 surrogate pairs together when Firestore encodes the strings.
    if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end -= 1
    chunks.push(text.slice(start, end))
    start = end
  }
  return chunks
}

export function createFirebaseStorage(db: Firestore, uid: string): SyncCourseStore {
  const workspace = collection(db, 'users', uid, 'workspace')
  const manifestRef = doc(workspace, 'state')
  const chunkName = (index: number) => `part-${index}`
  let unsubscribe: (() => void) | undefined
  let latest: WorkspaceSnapshot | undefined
  let existingChunks = 0
  const listeners = new Set<Listener>()

  function fail(error: unknown) {
    for (const listener of listeners) listener.fail(error)
  }

  function start() {
    return onSnapshot(workspace, { includeMetadataChanges: true }, (snapshot) => {
      try {
        const records = new Map(snapshot.docs.map((item) => [item.id, item.data()]))
        const manifest = records.get('state')
        if (!manifest && snapshot.metadata.fromCache) return // An empty cache cannot establish a new workspace.
        if (!manifest) {
          existingChunks = 0
          latest = { courses: sampleCourses() }
        } else {
          const { revision, count } = manifest
          if (typeof revision !== 'string' || !Number.isInteger(count) || count < 1 || count > 40) {
            throw new Error('Invalid workspace manifest')
          }
          const chunks: string[] = []
          for (let index = 0; index < count; index++) {
            const part = records.get(chunkName(index))
            if (!part || part.revision !== revision || typeof part.text !== 'string') {
              if (snapshot.metadata.fromCache) return
              throw new Error('Incomplete workspace')
            }
            chunks.push(part.text)
          }
          const data: unknown = JSON.parse(chunks.join(''))
          if (!Array.isArray(data)) throw new Error('Invalid workspace data')
          existingChunks = count
          latest = { courses: data, revision }
        }
        for (const listener of listeners) listener.update(latest)
      } catch (error) {
        fail(error)
      }
    }, fail)
  }

  function watch(listener: Listener) {
    listeners.add(listener)
    unsubscribe ??= start()
    if (latest) listener.update(latest)
    return () => {
      listeners.delete(listener)
      if (!listeners.size) {
        unsubscribe?.()
        unsubscribe = undefined
        latest = undefined
      }
    }
  }

  return {
    load() {
      if (latest) return Promise.resolve(latest.courses)
      return new Promise((resolve, reject) => {
        const stop = watch({
          update: (snapshot) => { resolve(snapshot.courses); stop() },
          fail: (error) => { reject(error); stop() },
        })
      })
    },
    subscribe(onData, onError) {
      return watch({ update: (snapshot) => onData(snapshot.courses), fail: onError })
    },
    async save(courses) {
      const chunks = serialize(courses)
      const revision = crypto.randomUUID()
      const batch = writeBatch(db)
      batch.set(manifestRef, { revision, count: chunks.length })
      for (const [index, text] of chunks.entries()) batch.set(doc(workspace, chunkName(index)), { revision, text })
      for (let index = chunks.length; index < existingChunks; index++) batch.delete(doc(workspace, chunkName(index)))

      // A local-cache acknowledgment also completes when offline. The server write can remain queued.
      await new Promise<void>((resolve, reject) => {
        const stop = watch({
          update: (snapshot) => {
            if (snapshot.revision === revision) { resolve(); stop() }
          },
          fail: (error) => { reject(error); stop() },
        })
        void batch.commit().catch((error) => {
          stop()
          reject(error)
          fail(error)
        })
      })
    },
  }
}
