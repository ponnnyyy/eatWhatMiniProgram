/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    baseUrl: string
    userInfo?: {
      nickname: string
      avatarUrl: string
      openid: string
    }
    token?: string
    loginReady?: boolean
    loginPromise?: Promise<void> | null
  }
  silentLogin(): Promise<void>
  recordVisit(): void
}
