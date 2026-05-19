Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/restaurant/restaurant', text: '餐厅', icon: '/assets/tab-icons/restaurant.svg', activeIcon: '/assets/tab-icons/restaurant-active.svg' },
      { pagePath: '/pages/chat/chat', text: '对话', icon: '/assets/tab-icons/chat.svg', activeIcon: '/assets/tab-icons/chat-active.svg' },
      { pagePath: '/pages/discover/discover', text: '惊喜', icon: '/assets/tab-icons/discover.svg', activeIcon: '/assets/tab-icons/discover-active.svg' },
      { pagePath: '/pages/add/add', text: '添加', icon: '/assets/tab-icons/add.svg', activeIcon: '/assets/tab-icons/add-active.svg' },
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
