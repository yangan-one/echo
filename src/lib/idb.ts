const DB_NAME = 'echo-audio'
const STORE = 'blobs'
const VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

export async function putAudio(id: string, blob: Blob): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  // 存一份到账号里，换设备也能取回；失败不影响本机使用
  void (async () => {
    try {
      const { api } = await import('./api')
      await api.uploadAudio(id, blob, blob.type)
    } catch {
      /* 离线时忽略 */
    }
  })()
}

export async function getAudio(id: string): Promise<Blob | null> {
  const db = await openDb()
  const local = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve((req.result as Blob) ?? null)
    req.onerror = () => reject(req.error)
  })
  if (local) return local
  // 换设备登录时本地没有音频：从账号里取一份，取到后就地缓存
  try {
    const { api } = await import('./api')
    const remote = await api.downloadAudio(id)
    if (remote) {
      await putAudio(id, remote)
      return remote
    }
  } catch {
    /* 离线或未登录，忽略 */
  }
  return null
}

export async function delAudio(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearAudio(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

const urlCache = new Map<string, string>()

/** 列出库里所有音频（录音、重录、导入的材料原声），用于整包导出 */
export async function allAudio(): Promise<{ id: string; blob: Blob }[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).openCursor()
    const out: { id: string; blob: Blob }[] = []
    req.onsuccess = () => {
      const cur = req.result
      if (!cur) {
        resolve(out)
        return
      }
      if (cur.value instanceof Blob) out.push({ id: String(cur.key), blob: cur.value })
      cur.continue()
    }
    req.onerror = () => reject(req.error)
  })
}

export async function audioObjectUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id)
  if (cached) return cached
  const blob = await getAudio(id)
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  urlCache.set(id, url)
  return url
}
