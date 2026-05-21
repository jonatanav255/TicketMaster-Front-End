export function secondsToMinutes(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0s"
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds}s`
}
