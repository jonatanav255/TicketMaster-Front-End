import { API_URL } from "../shared/env"

type Json = Record<string, unknown>

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: Json,
  headers: Record<string, string> = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    const err = new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
    ;(err as Error & { status: number }).status = res.status
    throw err
  }

  return (await res.json()) as T
}

export const get = <T>(path: string, headers?: Record<string, string>) =>
  request<T>("GET", path, undefined, headers)

export const post = <T>(path: string, body: Json, headers?: Record<string, string>) =>
  request<T>("POST", path, body, headers)
