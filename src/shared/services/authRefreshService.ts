const API_URL = import.meta.env.VITE_API_URL || "/api/";

const parseJsonSafely = async (response: Response) => {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export const refreshSession = async () => {
  const response = await fetch(`${API_URL}refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
  })

  if (!response.ok) {
    const errorData = await parseJsonSafely(response)
    throw new Error(
      errorData?.error?.message ||
      errorData?.message ||
      `Error al refrescar sesión (${response.status})`
    )
  }

  const data = await parseJsonSafely(response)

  if (!data) {
    throw new Error("La respuesta del refresh no tuvo un JSON válido")
  }

  return data
}
