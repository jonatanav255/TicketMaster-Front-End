const TOKEN_KEY = "admissionToken"
const USER_ID_KEY = "userId"

const safeGet = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

const safeSet = (key: string, value: string) => {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

const safeRemove = (key: string) => {
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export const getToken = () => safeGet(TOKEN_KEY)
export const setToken = (token: string) => safeSet(TOKEN_KEY, token)
export const clearToken = () => safeRemove(TOKEN_KEY)

export const getUserId = () => safeGet(USER_ID_KEY)
export const setUserId = (userId: string) => safeSet(USER_ID_KEY, userId)
export const clearUserId = () => safeRemove(USER_ID_KEY)
