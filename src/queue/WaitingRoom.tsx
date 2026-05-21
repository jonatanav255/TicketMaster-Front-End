import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQueueSocket } from "./useQueueSocket"
import { PositionDisplay } from "./PositionDisplay"
import { getUserId, setToken } from "../admitted/useToken"

export function WaitingRoom() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const userId = getUserId()

  useEffect(() => {
    if (!userId) navigate("/", { replace: true })
  }, [userId, navigate])

  if (!eventId || !userId) {
    return null
  }

  return (
    <WaitingRoomInner
      eventId={eventId}
      userId={userId}
      onAdmitted={(token) => {
        setToken(token)
        navigate(`/in/${eventId}`)
      }}
    />
  )
}

function WaitingRoomInner({
  eventId,
  userId,
  onAdmitted,
}: {
  eventId: string
  userId: string
  onAdmitted: (token: string) => void
}) {
  const { position, etaSeconds, status } = useQueueSocket({
    eventId,
    userId,
    onAdmitted,
  })

  return (
    <div className="page">
      <div className="card">
        <h1>You're in line</h1>
        <p className="subtitle">Hold tight — we'll let you in as soon as it's your turn.</p>
        <PositionDisplay position={position} etaSeconds={etaSeconds} status={status} />
        <p className="hint">Keep this tab open. Closing it will lose your spot.</p>
      </div>
    </div>
  )
}
