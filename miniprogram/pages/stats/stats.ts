import { getStatsOverview, getStatsTrend } from '../../utils/api'

interface TagDist {
  [tag: string]: number
}

interface CityDist {
  [city: string]: number
}

interface TopRestaurant {
  id: number
  name: string
  city: string
  visitCount: number
  avgRating: number
}

interface StatsData {
  totalRestaurants: number
  totalVisits: number
  avgRating: number
  cityDist: CityDist
  tagDist: TagDist
  topRestaurants: TopRestaurant[]
}

interface TrendItem {
  month: string
  count: number
}

Page({
  data: {
    statsData: null as StatsData | null,
    trendData: [] as TrendItem[],
    loading: true,
    topTag: '',
    maxCityCount: 1,
    maxTrendCount: 1
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      const [statsRes, trendRes]: any[] = await Promise.all([
        getStatsOverview(),
        getStatsTrend()
      ])

      const statsData: StatsData | null = (statsRes.data && statsRes.data.code === 200) ? statsRes.data.data : null
      const trendData: TrendItem[] = (trendRes.data && trendRes.data.code === 200) ? trendRes.data.data : []

      // Compute top tag
      let topTag = ''
      let maxTagCount = 0
      if (statsData && statsData.tagDist) {
        for (const tag in statsData.tagDist) {
          if (statsData.tagDist[tag] > maxTagCount) {
            maxTagCount = statsData.tagDist[tag]
            topTag = tag
          }
        }
      }

      // Compute max city count for bar scaling
      let maxCityCount = 1
      if (statsData && statsData.cityDist) {
        for (const city in statsData.cityDist) {
          if (statsData.cityDist[city] > maxCityCount) {
            maxCityCount = statsData.cityDist[city]
          }
        }
      }

      // Compute max trend count for bar scaling
      let maxTrendCount = 1
      trendData.forEach(item => {
        if (item.count > maxTrendCount) {
          maxTrendCount = item.count
        }
      })

      this.setData({
        statsData,
        trendData,
        topTag,
        maxCityCount,
        maxTrendCount,
        loading: false
      })
    } catch (err) {
      console.error('loadData error:', err)
      this.setData({ loading: false })
    }
  }
})
