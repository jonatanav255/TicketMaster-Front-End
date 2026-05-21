import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { getToken, clearToken, clearUserId } from "./useToken"
import { fetchWhoami, type WhoamiResponse } from "../api/admitted"

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: WhoamiResponse }
  | { kind: "expired" }
  | { kind: "error"; message: string }

export function AdmittedPage() {
  const [state, setState] = useState<State>({ kind: "loading" })
  const navigate = useNavigate()

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setState({ kind: "expired" })
      return
    }

    let cancelled = false
    fetchWhoami(token)
      .then((data) => {
        if (cancelled) return
        setState({ kind: "ok", data })
      })
      .catch((err: Error & { status?: number }) => {
        if (cancelled) return
        if (err.status === 401) {
          setState({ kind: "expired" })
        } else {
          setState({ kind: "error", message: err.message })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const rejoin = () => {
    clearToken()
    clearUserId()
    navigate("/", { replace: true })
  }

  if (state.kind === "loading") {
    return (
      <div className="page">
        <div className="card">
          <p>Checking your pass...</p>
        </div>
      </div>
    )
  }

  if (state.kind === "expired") {
    return (
      <div className="page">
        <div className="card">
          <h1>Pass expired</h1>
          <p className="subtitle">Your admission expired or was invalid.</p>
          <button onClick={rejoin}>Rejoin the line</button>
        </div>
      </div>
    )
  }

  if (state.kind === "error") {
    return (
      <div className="page">
        <div className="card">
          <h1>Something went wrong</h1>
          <p className="error">{state.message}</p>
          <Link to="/">Back to start</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card">
        <h1>You're in</h1>
        <p className="subtitle">
          Hello, <strong>{state.data.userId}</strong> — welcome to{" "}
          <strong>{state.data.eventId}</strong>.
        </p>
        <p className="hint">
          The protected endpoint accepted your token. This is the page that, in
          a real app, would show seat maps, checkout, etc.
        </p>
      </div>
    </div>
  )
}
