/**
 * Single shared helper to trigger a browser download from an API response.
 * All CSV template/export/error downloads must go through this util so error
 * parsing stays consistent across services.
 */
export async function downloadResponse(response: Response, fallback: string, filename: string): Promise<void> {
  if (!response.ok) {
    let message = fallback
    try {
      const error = await response.json()
      message = error?.error?.message || error?.message || error?.error || fallback
    } catch {
      message = `Error ${response.status}: ${response.statusText}`
    }
    throw new Error(message)
  }
  const url = URL.createObjectURL(await response.blob())
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
