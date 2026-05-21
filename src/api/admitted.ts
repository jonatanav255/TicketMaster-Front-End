import { get } from "./client"

export interface WhoamiResponse {
  userId: string
  eventId: string
}

export const fetchWhoami = (token: string) =>
  get<WhoamiResponse>("/api/v1/admission/whoami", {
    Authorization: `Bearer ${token}`,
  })
