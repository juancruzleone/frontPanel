import { useCallback, useEffect, useRef, useState } from "react"
import { fetchEscaneo } from "../services/complianceServices"
import type { Escaneo } from "../services/complianceTypes"

const TERMINAL_ESTADOS = new Set(["completado", "error"])

export const isTerminalEstado = (estado: Escaneo["estado"]): boolean =>
  TERMINAL_ESTADOS.has(estado)

interface UseScanPollingOptions {
  /** Intervalo entre consultas. Default: 3000ms (diseño). */
  intervalMs?: number
  /** Se invoca UNA vez al llegar a un estado terminal, con el escaneo final. */
  onComplete?: (escaneo: Escaneo) => void
}

interface UseScanPollingResult {
  escaneo: Escaneo | null
  isPolling: boolean
  error: string | null
  terminal: boolean
  stopPolling: () => void
}

/**
 * Sondea GET /api/escaneos-cumplimiento/:id cada `intervalMs` hasta un estado
 * terminal (completado|error). Al llegar al terminal detiene el polling e
 * invoca onComplete para que la vista refresque estados SIN recargar la página.
 * No depende de live-streams (diseño compliance-ui).
 */
export const useScanPolling = (
  escaneoId: string | null,
  options: UseScanPollingOptions = {},
): UseScanPollingResult => {
  const { intervalMs = 3000, onComplete } = options
  const [escaneo, setEscaneo] = useState<Escaneo | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [terminal, setTerminal] = useState(false)
  const inFlightRef = useRef(false)
  const stopRef = useRef(false)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const stopPolling = useCallback(() => {
    stopRef.current = true
    setIsPolling(false)
  }, [])

  useEffect(() => {
    if (!escaneoId) {
      stopRef.current = true
      setIsPolling(false)
      return
    }

    stopRef.current = false
    setError(null)
    setTerminal(false)

    const tick = async () => {
      if (stopRef.current || inFlightRef.current) return
      inFlightRef.current = true
      try {
        const resultado = await fetchEscaneo(escaneoId)
        if (stopRef.current) return
        setEscaneo(resultado)
        if (isTerminalEstado(resultado.estado)) {
          stopRef.current = true
          setTerminal(true)
          setIsPolling(false)
          onCompleteRef.current?.(resultado)
        }
      } catch (err: unknown) {
        if (stopRef.current) return
        stopRef.current = true
        setError(err instanceof Error ? err.message : "Error al consultar el escaneo")
        setIsPolling(false)
      } finally {
        inFlightRef.current = false
      }
    }

    setIsPolling(true)
    void tick()
    const interval = setInterval(() => void tick(), intervalMs)

    return () => {
      stopRef.current = true
      clearInterval(interval)
    }
  }, [escaneoId, intervalMs])

  return { escaneo, isPolling, error, terminal, stopPolling }
}