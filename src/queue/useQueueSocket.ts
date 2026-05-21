import { useEffect, useRef, useState } from "react"
import { WS_URL } from "../shared/env"

export type SocketStatus = "connecting" | "open" | "reconnecting" | "closed"

type ServerMessage =
  | { type: "position"; position: number }
  | { type: "admitted"; token: string }

interface UseQueueSocketArgs {
  eventId: string
  userId: string
  admitPerSecond?: number
  onAdmitted: (token: string) => void
}

interface UseQueueSocketResult {
  position: number | null
  etaSeconds: number | null
  status: SocketStatus
}

const BACKOFF_MS = [1000, 2000, 4000, 8000, 15000]

export function useQueueSocket({
  eventId,
  userId,
  admitPerSecond = 1,
  onAdmitted,
}: UseQueueSocketArgs): UseQueueSocketResult {
  const [position, setPosition] = useState<number | null>(null)
  const [status, setStatus] = useState<SocketStatus>("connecting")
  const admittedRef = useRef(false)
  const onAdmittedRef = useRef(onAdmitted)
  onAdmittedRef.current = onAdmitted

  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let attempt = 0
    let cancelled = false

    const connect = () => {
      if (cancelled || admittedRef.current) return
      setStatus(attempt === 0 ? "connecting" : "reconnecting")

      const url = `${WS_URL}/ws?eventId=${encodeURIComponent(
        eventId,
      )}&userId=${encodeURIComponent(userId)}`
      ws = new WebSocket(url)

      ws.onopen = () => {
        if (cancelled) return
        attempt = 0
        setStatus("open")
      }

      ws.onmessage = (event) => {
        if (cancelled) return
        try {
          const msg = JSON.parse(event.data) as ServerMessage
          if (msg.type === "position") {
            setPosition(msg.position)
          } else if (msg.type === "admitted") {
            admittedRef.current = true
            onAdmittedRef.current(msg.token)
          }
        } catch {
          /* ignore malformed */
        }
      }

      ws.onclose = () => {
        if (cancelled || admittedRef.current) {
          setStatus("closed")
          return
        }
        const delay = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)]
        attempt += 1
        setStatus("reconnecting")
        reconnectTimer = setTimeout(connect, delay)
      }

      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [eventId, userId])

  const etaSeconds =
    position === null || admitPerSecond <= 0
      ? null
      : Math.max(0, Math.ceil(position / admitPerSecond))

  return { position, etaSeconds, status }
}
