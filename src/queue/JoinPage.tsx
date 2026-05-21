import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { post } from "../api/client"
import { setUserId } from "../admitted/useToken"
import { EVENT_ID } from "../shared/env"

const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

export function JoinPage() {
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const userId = slugify(name)
    if (!userId) {
      setError("Please enter a name.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await post<{ position: number }>(`/api/v1/queue/${EVENT_ID}/join`, {
        userId,
      })
      setUserId(userId)
      navigate(`/queue/${EVENT_ID}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join")
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Virtual Waiting Room</h1>
        <p className="subtitle">Enter your name to join the line for event-1.</p>
        <form onSubmit={onSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            disabled={submitting}
          />
          <button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? "Joining..." : "Join the line"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}
