import { getNearbyRestaurants } from '../../utils/api'
import { parseImageUrls } from '../../utils/util'

interface NearbyRestaurant {
  id: number
  name: string
  city: string
  address: string
  avgPrice: string
  description: string
  recommendedDishes: string
  imageUrls: string
  images: string[]
  latitude: number
  longitude: number
  avgRating: number
  visitCount: number
  distance: number
  distanceText: string
  tags: Array<{ id: number; name: string; color: string }>
}

Page({
  data: {
    loading: true,
    locationDenied: false,
    userLat: 0,
    userLng: 0,
    restaurants: [] as NearbyRestaurant[],
    markers: [] as any[],
    selectedId: 0,
    scrollToId: '',
    radius: 5,
    radiusLabels: ['1km', '2km', '5km', '10km', '20km'],
    selectedRadiusIndex: 2,
    mapScale: 14
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    this.loadLocation()
  },

  loadLocation() {
    this.setData({ loading: true, locationDenied: false })
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({ userLat: res.latitude, userLng: res.longitude })
        this.loadNearby()
      },
      fail: () => {
        this.setData({ loading: false, locationDenied: true })
      }
    })
  },

  async loadNearby() {
    const { userLat, userLng, radius, selectedRadiusIndex } = this.data
    const actualRadius = [1, 2, 5, 10, 20][selectedRadiusIndex]
    try {
      const res = await getNearbyRestaurants(userLat, userLng, actualRadius)
      const list: NearbyRestaurant[] = (res.data as any).data || []
      // 解析 images & 构建 tagStyle
      list.forEach(r => {
        r.images = parseImageUrls(r.imageUrls)
        if (r.tags) {
          r.tags.forEach((t: any) => {
            const c = t.color || '#CC8048'
            const r1 = parseInt(c.slice(1, 3), 16)
            const g1 = parseInt(c.slice(3, 5), 16)
            const b1 = parseInt(c.slice(5, 7), 16)
            t.tagStyle = `background: rgba(${r1}, ${g1}, ${b1}, 0.12); color: ${c};`
          })
        }
      })
      // 构建 markers
      const markers = list.map(r => ({
        id: r.id,
        latitude: r.latitude,
        longitude: r.longitude,
        title: r.name,
        width: 28,
        height: 28,
        callout: {
          content: r.name,
          display: 'BYCLICK' as const,
          borderRadius: 8,
          bgColor: '#FCFAF6',
          padding: 6,
          fontSize: 12,
          color: '#2B2420',
          borderColor: '#DFD9D1',
          borderWidth: 1
        }
      }))
      // 根据半径调整地图缩放
      const scaleMap: Record<number, number> = { 1: 16, 2: 15, 5: 14, 10: 13, 20: 12 }
      this.setData({
        loading: false,
        restaurants: list,
        markers,
        radius: actualRadius,
        mapScale: scaleMap[actualRadius] || 14
      })
    } catch {
      this.setData({ loading: false, restaurants: [], markers: [] })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onRadiusChange(e: any) {
    const index = Number(e.detail.value)
    this.setData({ selectedRadiusIndex: index })
    this.loadNearby()
  },

  onMarkerTap(e: any) {
    const markerId = e.detail.markerId || e.markerId
    if (!markerId) return
    this.setData({
      selectedId: markerId,
      scrollToId: `item-${markerId}`
    })
    // 3秒后取消高亮
    setTimeout(() => {
      this.setData({ selectedId: 0, scrollToId: '' })
    }, 3000)
  },

  onListItemTap(e: any) {
    const item: NearbyRestaurant = e.currentTarget.dataset.item
    if (!item) return
    this.setData({
      selectedId: item.id,
      userLat: item.latitude,
      userLng: item.longitude,
      mapScale: 16
    })
    setTimeout(() => {
      this.setData({ selectedId: 0 })
    }, 3000)
  },

  retryLocation() {
    wx.openSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation']) {
          this.loadLocation()
        }
      }
    })
  }
})
