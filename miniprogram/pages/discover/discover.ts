import { discover } from '../../utils/api'

interface Restaurant {
  name: string
  city: string
  avgPrice: number
  recommendReason: string
  description: string
  address: string
}

Page({
  data: {
    result: null as Restaurant | null,
    loading: false
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  async handleDiscover() {
    this.setData({ loading: true, result: null })
    try {
      const res: any = await discover()
      if (res.data && res.data.code === 200) {
        this.setData({ result: res.data.data })
      } else {
        wx.showToast({ title: '获取推荐失败', icon: 'error' })
      }
    } catch (err) {
      wx.showToast({ title: '获取推荐失败', icon: 'error' })
    } finally {
      this.setData({ loading: false })
    }
  }
})
