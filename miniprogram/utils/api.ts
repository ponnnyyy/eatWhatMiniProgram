const app = getApp<IAppOption>()
const BASE_URL = app.globalData.baseUrl

interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

function getAuthHeader(): Record<string, string> {
  const token = wx.getStorageSync('token')
  return token ? { 'Authorization': 'Bearer ' + token } : {}
}

function request<T = any>(options: WechatMiniprogram.RequestOption): Promise<{ data: ApiResponse<T> }> {
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      url: BASE_URL + options.url,
      header: { ...getAuthHeader(), ...options.header },
      success: (res) => {
        resolve({ data: res.data as ApiResponse<T> })
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

// ===== 餐厅 =====

export function getRestaurants() {
  return request({ url: '/api/restaurants', method: 'GET' })
}

export function getRestaurantById(id: number) {
  return request({ url: `/api/restaurants/${id}`, method: 'GET' })
}

export function getNearbyRestaurants(latitude: number, longitude: number, radius: number = 5) {
  return request({ url: `/api/restaurants/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`, method: 'GET' })
}

export function addRestaurant(data: any) {
  return request({ url: '/api/restaurants', method: 'POST', data })
}

export function updateRestaurant(id: number, data: any) {
  return request({ url: `/api/restaurants/${id}`, method: 'PUT', data })
}

export function deleteRestaurant(id: number) {
  return request({ url: `/api/restaurants/${id}`, method: 'DELETE' })
}

export function uploadImage(filePath: string): Promise<{ data: ApiResponse<{ url: string }> }> {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: BASE_URL + '/api/restaurants/upload',
      filePath,
      name: 'file',
      header: getAuthHeader(),
      success: (res) => {
        if (res.statusCode === 413) {
          reject(new Error('图片太大，请压缩后重试'))
          return
        }
        if (res.statusCode === 401 || res.statusCode === 403) {
          reject(new Error('登录已过期，请重新打开小程序'))
          return
        }
        try {
          resolve({ data: JSON.parse(res.data) })
        } catch (e) {
          reject(new Error('上传失败'))
        }
      },
      fail: reject
    })
  })
}

// ===== 标签 =====

export function getTags() {
  return request({ url: '/api/restaurants/tags', method: 'GET' })
}

export function createTag(data: { name: string; color: string }) {
  return request({ url: '/api/restaurants/tags', method: 'POST', data })
}

export function deleteTag(id: number) {
  return request({ url: `/api/restaurants/tags/${id}`, method: 'DELETE' })
}

export function setRestaurantTags(restaurantId: number, tagIds: number[]) {
  return request({ url: `/api/restaurants/${restaurantId}/tags`, method: 'POST', data: tagIds })
}

// ===== 打卡 =====

export function checkIn(restaurantId: number, data: any) {
  return request({ url: `/api/restaurants/${restaurantId}/checkin`, method: 'POST', data })
}

export function getVisits(restaurantId: number) {
  return request({ url: `/api/restaurants/${restaurantId}/visits`, method: 'GET' })
}

// ===== AI =====

export function chatRecommend(query: string, history: Array<{ role: string; content: string }> = []) {
  return request({ url: '/api/chat', method: 'POST', data: { query, history } })
}

export function discover() {
  return request({ url: '/api/recommend/discover', method: 'GET' })
}

// ===== 统计 =====

export function getStatsOverview() {
  return request({ url: '/api/stats/overview', method: 'GET' })
}

export function getStatsTrend() {
  return request({ url: '/api/stats/trend', method: 'GET' })
}

// ===== 认证 =====

export function wxLogin(code: string, nickname?: string, avatarUrl?: string) {
  return request({ url: '/api/auth/login', method: 'POST', data: { code, nickname, avatarUrl } })
}

export function getUserInfo() {
  return request({ url: '/api/auth/user', method: 'GET' })
}

export function updateProfile(data: { nickname?: string; avatarUrl?: string }) {
  return request({ url: '/api/auth/profile', method: 'PUT', data })
}

export function generateReview(data: { restaurantId: number; rating?: number; cost?: string }) {
  return request({ url: '/api/recommend/review', method: 'POST', data })
}

// ===== 访客记录 =====

export function recordVisit(data: { openid: string; nickname: string; avatarUrl: string; page: string; source: string; device: string }) {
  return request({ url: '/api/visitors/log', method: 'POST', data })
}
