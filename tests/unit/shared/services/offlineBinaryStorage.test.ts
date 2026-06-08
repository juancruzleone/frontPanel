
import { describe, it, expect, vi, beforeEach } from "vitest"
import { offlineBinaryStorage } from "../../../../src/shared/services/offlineBinaryStorage"

// Minimal IndexedDB Mock
const createIDBMock = () => {
  let store: Record<string, any> = {}
  let failQuota = false
  
  const mockRequest = (result?: any, error?: any) => {
    const req = {
      onsuccess: null as any,
      onerror: null as any,
      result,
      error,
    }
    setTimeout(() => {
      if (error && req.onerror) req.onerror({ target: req })
      else if (req.onsuccess) req.onsuccess({ target: req })
    }, 0)
    return req
  }

  const mockCursor = (keys: string[]) => {
    let index = 0
    const cursorReq = {
      onsuccess: null as any,
      onerror: null as any,
      result: null as any,
    }
    
    const next = () => {
      if (index < keys.length) {
        const key = keys[index]
        cursorReq.result = {
          value: store[key],
          delete: vi.fn().mockImplementation(() => {
             delete store[key]
          }),
          continue: vi.fn().mockImplementation(() => {
            index++
            next()
          })
        }
      } else {
        cursorReq.result = null
      }
      if (cursorReq.onsuccess) cursorReq.onsuccess({ target: cursorReq })
    }

    setTimeout(next, 0)
    return cursorReq
  }

  return {
    _setFailQuota: (val: boolean) => { failQuota = val },
    _clear: () => { store = {} },
    open: vi.fn().mockImplementation(() => mockRequest({
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(true),
      },
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          put: vi.fn().mockImplementation((val, key) => {
            if (failQuota) {
              return mockRequest(undefined, { name: 'QuotaExceededError' })
            }
            store[key] = val
            return mockRequest(key)
          }),
          get: vi.fn().mockImplementation((key) => mockRequest(store[key])),
          delete: vi.fn().mockImplementation((key) => {
            delete store[key]
            return mockRequest()
          }),
          openCursor: vi.fn().mockImplementation(() => mockCursor(Object.keys(store)))
        }),
        oncomplete: null,
        onerror: null,
      })
    }))
  }
}

const idbMock = createIDBMock()

describe("OfflineBinaryStorage", () => {
  const mockBlob = new Blob(["test-content"], { type: "image/png" })
  const mockFile = new File([mockBlob], "test.png", { type: "image/png" })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.stubGlobal('indexedDB', idbMock)
    idbMock._setFailQuota(false)
    idbMock._clear()
  })

  it("should store a blob and return a unique ID", async () => {
    const id = await offlineBinaryStorage.saveBinary(mockFile)
    expect(id).toBeDefined()
    expect(typeof id).toBe("string")
  })

  it("should retrieve a stored blob by ID", async () => {
    const id = await offlineBinaryStorage.saveBinary(mockFile)
    const retrieved = await offlineBinaryStorage.getBinary(id)
    expect(retrieved).toEqual(mockFile)
  })

  it("should remove a stored blob by ID", async () => {
    const id = await offlineBinaryStorage.saveBinary(mockFile)
    await offlineBinaryStorage.removeBinary(id)
    const retrieved = await offlineBinaryStorage.getBinary(id)
    expect(retrieved).toBeNull()
  })

  it("should handle quota exceeded errors gracefully", async () => {
    idbMock._setFailQuota(true)
    const largeBlob = new Blob(["large-content"])
    await expect(offlineBinaryStorage.saveBinary(largeBlob)).rejects.toThrow(/quota/i)
  })

  it("should cleanup records older than 7 days", async () => {
    // GIVEN a record from 8 days ago and one from today
    const now = Date.now()
    const eightDaysAgo = now - (8 * 24 * 60 * 60 * 1000)
    
    // Manual injection into mock if needed, or use Date.now() mock
    vi.spyOn(Date, 'now').mockReturnValue(eightDaysAgo)
    const oldId = await offlineBinaryStorage.saveBinary(mockFile)
    
    vi.spyOn(Date, 'now').mockReturnValue(now)
    const newId = await offlineBinaryStorage.saveBinary(mockFile)
    
    // WHEN cleaning up 7 days
    await offlineBinaryStorage.cleanup(7)
    
    // THEN only the new record remains
    expect(await offlineBinaryStorage.getBinary(oldId)).toBeNull()
    expect(await offlineBinaryStorage.getBinary(newId)).not.toBeNull()
  })
})
