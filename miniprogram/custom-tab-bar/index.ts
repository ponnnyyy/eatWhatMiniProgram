Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/restaurant/restaurant', text: '餐厅', icon: '/assets/tab-icons/restaurant.svg', activeIcon: '/assets/tab-icons/restaurant-active.svg' },
      { pagePath: '/pages/nearby/nearby', text: '附近', icon: '/assets/tab-icons/nearby.svg', activeIcon: '/assets/tab-icons/nearby-active.svg' },
      { pagePath: '/pages/add/add', text: '添加', icon: '/assets/tab-icons/add.svg', activeIcon: '/assets/tab-icons/add-active.svg' },
      { pagePath: '/pages/stats/stats', text: '统计', icon: '/assets/tab-icons/stats.svg', activeIcon: '/assets/tab-icons/stats-active.svg' },
      { pagePath: '/pages/profile/profile', text: '我的', icon: '/assets/tab-icons/profile.svg', activeIcon: '/assets/tab-icons/profile-active.svg' }
    ]
  },

  methods: {
    switchTab(e: any) {
      const { index, path } = e.currentTarget.dataset
      wx.switchTab({ url: path })
    }
  }
})
