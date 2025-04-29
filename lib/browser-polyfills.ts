// This file provides browser-compatible polyfills for Node.js modules used by isomorphic-git

// Mock implementation of AsyncLock
class AsyncLock {
  acquire(key: string, fn: () => Promise<any>, cb?: (err: Error | null, result?: any) => void): Promise<any> {
    return Promise.resolve()
      .then(() => fn())
      .then((result) => {
        if (cb) cb(null, result)
        return result
      })
      .catch((err) => {
        if (cb) cb(err)
        throw err
      })
  }
}

// Export the polyfills
export const polyfills = {
  AsyncLock,
}

// Add polyfills to global scope in browser environment
if (typeof window !== "undefined") {
  ;(window as any).AsyncLock = AsyncLock
}
