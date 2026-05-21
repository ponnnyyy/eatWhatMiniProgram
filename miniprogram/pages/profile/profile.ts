import { getRestaurants } from '../../utils/api'

const app = getApp<IAppOption>()

Page({
  data: {
    myRestaurants: [] as any[],
    loading: true
  },

  async onLoad() {
    if (app.globalData.loginPromise) {
      await app.globalData.loginPromise
    }
    this.loadData()
  },

  async onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },

  async loadData() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
    this.setData({ loading: true })

    if (!userInfo || !userInfo.openid) {
      this.setData({ loading: false })
      return
    }

    try {
      const res: any = await getRestaurants()
      if (res.data && res.data.code === 200) {
        const all: any[] = res.data.data || []
        this.setData({
          myRestaurants: all.filter(r => r.createdBy === userInfo.openid),
          loading: false
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      this.setData({ loading: false })
    }
  },

  goToDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.switchTab({
      url: '/pages/restaurant/restaurant',
      success: () => {
        const page = getCurrentPages().find(p => p.route === 'pages/restaurant/restaurant') as any
        if (page && page.openDetail) {
          page.openDetail(id)
        }
      }
    })
  }
})
