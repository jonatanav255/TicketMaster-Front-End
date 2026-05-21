const required = (key: "VITE_API_URL" | "VITE_WS_URL") => {
  const value = import.meta.env[key]
  if (!value) {
    throw new Error(
      `Missing env var ${key}. Copy .env.example to .env and fill it in.`,
    )
  }
  return value
}

export const API_URL = required("VITE_API_URL")
export const WS_URL = required("VITE_WS_URL")
export const EVENT_ID = "event-1"
