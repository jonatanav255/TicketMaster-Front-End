import { secondsToMinutes } from "../shared/format"
import type { SocketStatus } from "./useQueueSocket"

interface Props {
  position: number | null
  etaSeconds: number | null
  status: SocketStatus
}

const statusLabel: Record<SocketStatus, string> = {
  connecting: "Connecting...",
  open: "Live",
  reconnecting: "Reconnecting...",
  closed: "Disconnected",
}

export function PositionDisplay({ position, etaSeconds, status }: Props) {
  return (
    <div className="position-display">
      <div className={`status status-${status}`}>
        <span className="status-dot" />
        {statusLabel[status]}
      </div>
      <div className="position-number">
        {position === null ? "—" : position + 1}
      </div>
      <div className="position-label">
        {position === null ? "Waiting for position..." : "in line"}
      </div>
      <div className="eta">
        {etaSeconds === null
          ? ""
          : `Estimated wait: ${secondsToMinutes(etaSeconds)}`}
      </div>
    </div>
  )
}
