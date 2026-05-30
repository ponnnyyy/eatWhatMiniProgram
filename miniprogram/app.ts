App<IAppOption>({
  globalData: {
    //baseUrl: 'http://10.202.198.13:9281',
    //baseUrl:'http://localhost:9281',
    baseUrl:'http://192.168.1.4:9281',
    //baseUrl: 'https://117.72.38.38',
    //baseUrl:'https://chishenme.online',
    userInfo: undefined,
    token: undefined,
    role: undefined,
    loginReady: false,
    loginPromise: null as Promise<void> | null
  },

  onLaunch() {
    // 恢复本地缓存的登录态
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    const role = wx.getStorageSync('role')
    if (token) this.globalData.token = token
    if (userInfo) this.globalData.userInfo = userInfo
    if (role) this.globalData.role = role

    // 静默登录获取 openid
    this.globalData.loginPromise = this.silentLogin()
  },

  async silentLogin() {
    try {
      const loginRes = await wx.login()
      if (!loginRes.code) {
        console.error('wx.login 返回空 code')
        return
      }

      const res: any = await new Promise((resolve, reject) => {
        wx.request({
          url: this.globalData.baseUrl + '/api/auth/login',
          method: 'POST',
          data: { code: loginRes.code },
          header: { 'Content-Type': 'application/json' },
          success: resolve,
          fail: reject
        })
      })

      console.log('silentLogin response:', res)

      if (res.data && res.data.code === 200) {
        const data = res.data.data
        const userInfo = {
          nickname: data.nickname || '微信用户',
          avatarUrl: data.avatarUrl || '',
          openid: data.openid
        }
        this.globalData.token = data.token
        this.globalData.role = data.role || 'USER'
        // 只在第一次登录或没有昵称时更新
        if (!this.globalData.userInfo || !this.globalData.userInfo.nickname || this.globalData.userInfo.nickname === '微信用户') {
          this.globalData.userInfo = userInfo
        }
        wx.setStorageSync('token', data.token)
        wx.setStorageSync('userInfo', this.globalData.userInfo)
        wx.setStorageSync('role', data.role || 'USER')

        // 自动上报访客记录
        this.recordVisit()
      } else {
        console.error('silentLogin API error:', res.data)
      }
    } catch (e) {
      console.error('silentLogin failed:', e)
    } finally {
      this.globalData.loginReady = true
    }
  },

  async recordVisit() {
    const userInfo = this.globalData.userInfo
    if (!userInfo) return
    try {
      const sysInfo = wx.getSystemInfoSync()
      const platform = sysInfo.platform || 'unknown'
      const device = platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'DevTools'
      wx.request({
        url: this.globalData.baseUrl + '/api/visitors/log',
        method: 'POST',
        data: {
          openid: userInfo.openid || '',
          nickname: userInfo.nickname || '',
          avatarUrl: userInfo.avatarUrl || '',
          page: '启动',
          source: '小程序',
          device
        },
        header: {
          'Content-Type': 'application/json',
          ...(this.globalData.token ? { 'Authorization': 'Bearer ' + this.globalData.token } : {})
        }
      })
    } catch (e) {
      // ignore
    }
  }
})
