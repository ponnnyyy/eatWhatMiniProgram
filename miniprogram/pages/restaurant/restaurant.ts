import { getRestaurants, getTags, updateRestaurant, deleteRestaurant, setRestaurantTags, checkIn, uploadImage, createTag, deleteTag, getVisits, chatRecommend, generateReview } from '../../utils/api'
import { getImageUrl, parseImageUrls } from '../../utils/util'

interface Restaurant {
  id: number
  name: string
  province: string
  city: string
  address: string
  avgPrice: string
  description: string
  recommendedDishes: string
  imageUrl: string
  imageUrls: string
  images: string[]
  avgRating: number
  visitCount: number
  latitude: number
  longitude: number
  tags: Tag[]
  gradientClass: string
}

interface Tag {
  id: number
  name: string
  color: string
  bgColor?: string
}

interface CheckInForm {
  rating: number
  cost: string
  visitDate: string
  comment: string
}

interface EditForm {
  id: number
  name: string
  province: string
  city: string
  address: string
  avgPrice: string
  description: string
  recommendedDishes: string
  selectedTagIds: number[]
  latitude: number | null
  longitude: number | null
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function tagStyle(color: string): string {
  const c = color || '#CC8048'
  return `background:${hexToRgba(c, 0.13)};color:${c}`
}

const CUISINE_IMGS: Record<string, string> = {
  '川菜': 'img-sichuan', '湘菜': 'img-sichuan',
  '粤菜': 'img-cantonese',
  '日料': 'img-japanese', '日本料理': 'img-japanese', '日式': 'img-japanese',
  '火锅': 'img-hotpot',
  '西餐': 'img-western',
  '烧烤': 'img-bbq',
  '海鲜': 'img-seafood',
  '甜品': 'img-dessert', '甜点': 'img-dessert', '烘焙': 'img-dessert',
  '面食': 'img-noodle', '面条': 'img-noodle', '粉': 'img-noodle',
  '韩餐': 'img-korean', '韩国料理': 'img-korean',
  '东南亚': 'img-se-asian', '泰餐': 'img-se-asian',
  '本帮菜': 'img-shanghainese', '上海菜': 'img-shanghainese',
  '京菜': 'img-noodle',
}

const GRADIENT_CYCLE = [
  'img-sichuan', 'img-cantonese', 'img-japanese', 'img-hotpot',
  'img-western', 'img-bbq', 'img-seafood', 'img-dessert',
  'img-noodle', 'img-korean', 'img-se-asian', 'img-shanghainese'
]

function gradientClassForTags(tags: Tag[]): string {
  if (!tags || tags.length === 0) return ''
  for (const tag of tags) {
    const name = tag.name
    for (const key of Object.keys(CUISINE_IMGS)) {
      if (name.includes(key) || key.includes(name)) {
        return CUISINE_IMGS[key]
      }
    }
  }
  return ''
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  h = ((h % 360) + 360) % 360
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else { r = c; b = x }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()
}

function hexToHsv(hex: string): { h: number, s: number, v: number } {
  hex = hex.replace('#', '')
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6)
    else if (max === g) h = 60 * ((b - r) / d + 2)
    else h = 60 * ((r - g) / d + 4)
  }
  if (h < 0) h += 360
  const s = max === 0 ? 0 : d / max
  return { h, s, v: max }
}

Page({
  data: {
    restaurants: [] as Restaurant[],
    allTags: [] as Tag[],
    cityFilter: '',
    tagFilter: 0,
    searchKeyword: '',
    cities: [] as string[],
    expandedId: 0,
    currentPage: 1,
    pageSize: 10,

    editVisible: false,
    editForm: {} as EditForm,
    editRegion: [] as string[],
    editRegionDisplay: '',
    editImageItems: [] as Array<{ id: string; displayUrl: string; rawUrl?: string; localFile?: string }>,
    editMarkers: [] as any[],

    checkInVisible: false,
    checkInForm: {
      rating: 0,
      cost: '',
      visitDate: '',
      comment: ''
    } as CheckInForm,
    checkInRestaurantId: 0,

    tagManageVisible: false,
    newTagName: '',
    newTagColor: '#CC8048',

    mapVisible: false,
    mapRestaurant: {} as Restaurant,
    mapLatitude: 0,
    mapLongitude: 0,

    editTagMap: {} as Record<number, boolean>,
    presetColors: ['#CC8048', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#e84393', '#636e72'],

    colorPickerVisible: false,
    isAdmin: false,
    pickerHue: 15,
    pickerSat: 0.72,
    pickerVal: 0.76,
    hueColor: 'hsl(15, 100%, 50%)',
    hueLeft: '4%',
    svLeft: '72%',
    svTop: '24%',
    hexInput: 'CC8048',

    filteredRestaurants: [] as Restaurant[],
    paginatedRestaurants: [] as Restaurant[],
    tagFilterName: '全部标签',
    cityRange: ['全部城市'] as string[],
    tagRange: [{ name: '全部标签', id: 0 }] as any[],

    detailVisible: false,
    detailData: {} as any,
    detailVisits: [] as any[],

    aiRecInput: '',
    aiRecLoading: false,
    aiRecMessages: [] as Array<{ role: string; content: string; recommendations?: any[] }>,
    aiOverlayVisible: false,
    aiReviewLoading: false,
    aiKbHeight: 0,

    // 返回手势拦截守卫
    backGuardActive: false,
    dataLoaded: false
  },

  onLoad() {
    const app = getApp<IAppOption>()
    if (app.globalData.loginPromise) {
      app.globalData.loginPromise.then(() => this.loadData())
    } else {
      this.loadData()
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    // 非首次进入时刷新数据（从添加页返回等情况）
    if (this.data.dataLoaded) {
      this.loadData()
    }
  },

  // page-container 返回手势拦截回调
  onBackGuardLeave() {
    // 返回手势触发了 page-container 关闭，现在关闭最上层的弹框
    if (this.data.editVisible) { this.closeEdit(); return }
    if (this.data.checkInVisible) { this.closeCheckIn(); return }
    if (this.data.tagManageVisible) { this.closeTagManage(); return }
    if (this.data.mapVisible) { this.closeMap(); return }
    if (this.data.detailVisible) { this.closeDetail(); return }
    if (this.data.aiOverlayVisible) { this.closeAiOverlay(); return }
  },

  // 检查是否有弹框打开，有则激活返回守卫
  _syncBackGuard() {
    const { editVisible, checkInVisible, tagManageVisible, mapVisible, detailVisible, aiOverlayVisible } = this.data
    const anyOpen = editVisible || checkInVisible || tagManageVisible || mapVisible || detailVisible || aiOverlayVisible
    if (anyOpen && !this.data.backGuardActive) {
      this.setData({ backGuardActive: true })
    } else if (!anyOpen && this.data.backGuardActive) {
      this.setData({ backGuardActive: false })
    }
  },

  onShareAppMessage() {
    return {
      title: '好味道 — 发现身边的美食',
      path: '/pages/restaurant/restaurant'
    }
  },

  onShareTimeline() {
    return {
      title: '好味道 — 发现身边的美食'
    }
  },

  async loadData() {
    const app = getApp<IAppOption>()
    const isAdmin = app.globalData.role === 'ADMIN'
    this.setData({ isAdmin })
    try {
      const [restaurantsRes, tagsRes] = await Promise.all([
        getRestaurants(),
        getTags()
      ])
      const rawList = restaurantsRes.data.code === 200 ? restaurantsRes.data.data : []
      const restaurants = (rawList || []).map((r: any, index: number) => {
        const tags = (r.tags || []).map((t: any) => ({
          ...t,
          tagStyle: tagStyle(t.color)
        }))
        const tagBased = gradientClassForTags(tags)
        return {
          ...r,
          canEdit: r.canEdit || false,
          images: parseImageUrls(r.imageUrls).map(getImageUrl),
          tags,
          gradientClass: tagBased || GRADIENT_CYCLE[index % GRADIENT_CYCLE.length]
        }
      })
      const allTags = tagsRes.data.code === 200 ? tagsRes.data.data : []
      const cities = [...new Set(restaurants.map((r: Restaurant) => r.city).filter(Boolean))] as string[]
      const cityRange = ['全部城市', ...cities]
      const tagRange = [{ name: '全部标签', id: 0 }, ...allTags]
      this.setData({ restaurants, allTags, cities, cityRange, tagRange, dataLoaded: true })
      this.applyFilters()
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'error' })
    }
  },

  applyFilters() {
    const { restaurants, cityFilter, tagFilter, searchKeyword, currentPage, pageSize } = this.data
    let filtered = [...restaurants]

    if (cityFilter) {
      filtered = filtered.filter(r => r.city === cityFilter)
    }
    if (tagFilter) {
      filtered = filtered.filter(r => r.tags && r.tags.some(t => t.id === tagFilter))
    }
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase()
      filtered = filtered.filter(r =>
        (r.name && r.name.toLowerCase().includes(kw)) ||
        (r.description && r.description.toLowerCase().includes(kw)) ||
        (r.address && r.address.toLowerCase().includes(kw))
      )
    }

    const paginatedRestaurants = filtered.slice(0, currentPage * pageSize)
    this.setData({ filteredRestaurants: filtered, paginatedRestaurants })
  },

  onCityChange(e: any) {
    const idx = e.detail.value
    const city = idx === 0 ? '' : this.data.cities[idx - 1]
    this.setData({ cityFilter: city, currentPage: 1 })
    this.applyFilters()
  },

  onTagChange(e: any) {
    const idx = e.detail.value
    const tagId = idx === 0 ? 0 : this.data.allTags[idx - 1].id
    const tagName = idx === 0 ? '全部标签' : this.data.allTags[idx - 1].name
    this.setData({ tagFilter: tagId, tagFilterName: tagName, currentPage: 1 })
    this.applyFilters()
  },

  onSearchInput(e: any) {
    this.setData({ searchKeyword: e.detail.value, currentPage: 1 })
    this.applyFilters()
  },

  loadMore() {
    const { currentPage, pageSize, filteredRestaurants } = this.data
    if (currentPage * pageSize < filteredRestaurants.length) {
      this.setData({ currentPage: currentPage + 1 })
      this.applyFilters()
    }
  },

  onScrollToLower() {
    this.loadMore()
  },

  toggleDishes(e: any) {
    const id = e.currentTarget.dataset.id
    this.setData({ expandedId: this.data.expandedId === id ? 0 : id })
  },

  async openDetail(e: any) {
    const r: Restaurant = e.currentTarget.dataset.item
    this._showDetail(r)
  },

  async openDetailById(id: number) {
    // 确保数据已加载
    if (this.data.restaurants.length === 0) {
      await this.loadData()
    }
    const r = this.data.restaurants.find((r: Restaurant) => r.id === id)
    if (!r) {
      wx.showToast({ title: '餐厅未找到', icon: 'none' })
      return
    }
    this._showDetail(r)
  },

  async _showDetail(r: Restaurant) {
    this.setData({
      detailVisible: true,
      backGuardActive: true,
      detailData: {
        ...r,
        heroImage: r.images && r.images.length > 0 ? r.images[0] : '',
        gradientClass: r.gradientClass || gradientClassForTags(r.tags),
        dishList: r.recommendedDishes ? r.recommendedDishes.split(/[,，、;；\s]+/).filter(Boolean) : []
      },
      detailVisits: []
    })
    try {
      const visitsRes: any = await getVisits(r.id)
      if (visitsRes.data && visitsRes.data.code === 200) {
        const allVisits = visitsRes.data.data || []
        this.setData({ detailVisits: allVisits.slice(0, 3) })
      }
    } catch (e) {
      // ignore visit load failure
    }
  },

  closeDetail() {
    this.setData({ detailVisible: false })
    this._syncBackGuard()
  },

  previewImage(e: any) {
    const url = e.currentTarget.dataset.url
    const images = e.currentTarget.dataset.images
    if (url) {
      wx.previewImage({
        urls: Array.isArray(images) ? images : [url],
        current: url
      })
    }
  },

  // Edit dialog
  openEdit(e: any) {
    const r: Restaurant = e.currentTarget.dataset.item
    const editForm: EditForm = {
      id: r.id,
      name: r.name,
      province: r.province || '',
      city: r.city,
      address: r.address,
      avgPrice: String(r.avgPrice || ''),
      description: r.description || '',
      recommendedDishes: r.recommendedDishes || '',
      selectedTagIds: (r.tags || []).map(t => t.id),
      latitude: r.latitude || null,
      longitude: r.longitude || null
    }
    const editTagMap: Record<number, boolean> = {}
    ;(r.tags || []).forEach(t => { editTagMap[t.id] = true })
    const app = getApp<IAppOption>()
    const baseUrl = app.globalData.baseUrl
    const editImageItems = (r.images || []).map((url: string, i: number) => {
      const rawUrl = url.startsWith(baseUrl) ? url.slice(baseUrl.length) : url
      return {
        id: `existing-${i}`,
        displayUrl: url,
        rawUrl: rawUrl
      }
    })
    // 构建地图标记
    const editMarkers: any[] = []
    if (r.latitude && r.longitude) {
      editMarkers.push({
        id: 1,
        latitude: r.latitude,
        longitude: r.longitude,
        width: 28,
        height: 28,
        callout: {
          content: r.name,
          display: 'ALWAYS',
          borderRadius: 8,
          padding: 6,
          bgColor: '#CC8048',
          color: '#FFFFFF',
          fontSize: 12
        }
      })
    }
    const stripS = (s: string) => (s || '').replace(/省$|市$|自治区$|壮族$|回族$|维吾尔$|特别行政区$|地区$|州$|盟$/, '')
    const provinceName = stripS(r.province || '')
    const cityName = stripS(r.city || '')
    const editRegionDisplay = provinceName && cityName ? provinceName + ' ' + cityName : provinceName || cityName || ''
    // 微信 region picker 需要["广东省","珠海市","香洲区"]格式，但我们只知道名称，无法反推带后缀的完整值
    // 这里用空数组让 picker 不预选，只显示文本
    const editRegion: string[] = []

    this.setData({
      editVisible: true,
      backGuardActive: true,
      editForm,
      editRegion,
      editRegionDisplay,
      editTagMap,
      editImageItems,
      editMarkers
    })
  },

  onEditRegionChange(e: WechatMiniprogram.PickerChange) {
    const values = e.detail.value as string[]
    const stripS = (s: string) => (s || '').replace(/省$|市$|自治区$|壮族$|回族$|维吾尔$|特别行政区$|地区$|州$|盟$/, '')
    const province = stripS(values[0] || '')
    const city = stripS(values[1] || '')
    const display = province && city ? province + ' ' + city : province || city || ''
    this.setData({
      'editForm.province': province,
      'editForm.city': city,
      editRegion: values as string[],
      editRegionDisplay: display
    })
  },

  closeEdit() {
    this.setData({ editVisible: false, editRegionDisplay: '' })
    this._syncBackGuard()
  },

  preventTouchMove() {
    return
  },

  onEditInput(e: any) {
    const field = e.currentTarget.dataset.field
    let value = e.detail.value
    if (field === 'avgPrice') {
      value = value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
    }
    this.setData({ [`editForm.${field}`]: value })
  },

  onEditTagToggle(e: any) {
    const tagId = e.currentTarget.dataset.id
    const selectedTagIds = [...this.data.editForm.selectedTagIds]
    const idx = selectedTagIds.indexOf(tagId)
    if (idx > -1) {
      selectedTagIds.splice(idx, 1)
    } else {
      selectedTagIds.push(tagId)
    }
    const editTagMap = { ...this.data.editTagMap }
    editTagMap[tagId] = idx <= -1
    this.setData({ 'editForm.selectedTagIds': selectedTagIds, editTagMap })
  },

  chooseEditLocation() {
    wx.chooseLocation({
      success: (res) => {
        if (res.latitude && res.longitude) {
          const editMarkers: any[] = [{
            id: 1,
            latitude: res.latitude,
            longitude: res.longitude,
            width: 28,
            height: 28,
            callout: {
              content: res.name || '选择的位置',
              display: 'ALWAYS',
              borderRadius: 8,
              padding: 6,
              bgColor: '#CC8048',
              color: '#FFFFFF',
              fontSize: 12
            }
          }]
          // 从 address 解析省份和城市
          let province = ''
          let city = ''
          const stripS = (s: string) => (s || '').replace(/省$|市$|自治区$|壮族$|回族$|维吾尔$|特别行政区$|地区$|州$|盟$/, '')
          if (res.address) {
            const match = res.address.match(/^(.+?(?:省|自治区|特别行政区))?(.+?(?:市|地区|州|盟))/)
            if (match) {
              if (match[1]) {
                province = stripS(match[1])
              }
              if (match[2]) {
                city = stripS(match[2])
              }
              // 直辖市处理
              if (!match[1] && match[2]) {
                const municipalities = ['北京', '天津', '上海', '重庆']
                if (municipalities.includes(city)) {
                  province = city
                }
              }
            }
          }

          const editRegionDisplay = province && city ? province + ' ' + city : province || city || ''
          this.setData({
            'editForm.latitude': res.latitude,
            'editForm.longitude': res.longitude,
            'editForm.address': res.address || this.data.editForm.address,
            'editForm.province': province,
            'editForm.city': city,
            editRegionDisplay,
            editMarkers
          })
        }
      },
      fail: (err: any) => {
        if (err.errMsg && err.errMsg.indexOf('cancel') === -1) {
          wx.showModal({
            title: '提示',
            content: '需要获取位置权限才能选择位置，请在设置中开启',
            confirmText: '去设置',
            success: (modalRes: any) => {
              if (modalRes.confirm) {
                wx.openSetting({})
              }
            }
          })
        }
      }
    })
  },

  chooseEditImage() {
    const remaining = 3 - this.data.editImageItems.length
    if (remaining <= 0) {
      wx.showToast({ title: '最多3张图片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      success: (res) => {
        const newItems = res.tempFiles.map((f: any, i: number) => ({
          id: `new-${Date.now()}-${i}`,
          displayUrl: f.tempFilePath,
          localFile: f.tempFilePath
        }))
        this.setData({ editImageItems: [...this.data.editImageItems, ...newItems] })
      }
    })
  },

  removeEditImage(e: any) {
    const id = e.currentTarget.dataset.id
    this.setData({ editImageItems: this.data.editImageItems.filter(item => item.id !== id) })
  },

  async handleEditSubmit() {
    const { editForm, editImageItems } = this.data
    if (!editForm.name) {
      wx.showToast({ title: '请填写店名', icon: 'error' })
      return
    }
    try {
      const newUrls: string[] = []
      for (const item of editImageItems) {
        if (item.localFile) {
          const uploadRes: any = await uploadImage(item.localFile)
          if (uploadRes.data && uploadRes.data.code === 200) {
            newUrls.push(uploadRes.data.data.url)
          } else {
            console.error('图片上传失败:', uploadRes.data)
            wx.showToast({ title: '图片上传失败', icon: 'none' })
            return
          }
        }
      }
      const existingUrls = editImageItems.filter(i => i.rawUrl).map(i => i.rawUrl as string)
      const allUrls = [...existingUrls, ...newUrls]
      await updateRestaurant(editForm.id, {
        name: editForm.name,
        province: editForm.province,
        city: editForm.city,
        address: editForm.address,
        avgPrice: editForm.avgPrice,
        description: editForm.description,
        recommendedDishes: editForm.recommendedDishes,
        imageUrls: allUrls.length > 0 ? JSON.stringify(allUrls) : null,
        latitude: editForm.latitude,
        longitude: editForm.longitude
      })
      await setRestaurantTags(editForm.id, editForm.selectedTagIds)
      wx.showToast({ title: '更新成功', icon: 'success' })
      this.setData({ editVisible: false })
      this._syncBackGuard()
      this.loadData()
    } catch (e: any) {
      wx.showToast({ title: e.message || '更新失败', icon: 'error' })
    }
  },

  // Check-in dialog
  openCheckIn(e: any) {
    const r: Restaurant = e.currentTarget.dataset.item
    const today = new Date().toISOString().slice(0, 10)
    this.setData({
      checkInVisible: true,
      backGuardActive: true,
      checkInRestaurantId: r.id,
      checkInForm: { rating: 0, cost: '', visitDate: today, comment: '' }
    })
  },

  closeCheckIn() {
    this.setData({ checkInVisible: false })
    this._syncBackGuard()
  },

  onCheckInRating(e: any) {
    const rating = e.currentTarget.dataset.rating
    this.setData({ 'checkInForm.rating': rating })
  },

  onCheckInInput(e: any) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`checkInForm.${field}`]: e.detail.value })
  },

  onCheckInDateChange(e: any) {
    this.setData({ 'checkInForm.visitDate': e.detail.value })
  },

  async handleCheckIn() {
    const { checkInForm, checkInRestaurantId } = this.data
    if (!checkInForm.rating) {
      wx.showToast({ title: '请选择评分', icon: 'error' })
      return
    }
    try {
      await checkIn(checkInRestaurantId, {
        rating: checkInForm.rating,
        cost: checkInForm.cost || null,
        visitDate: checkInForm.visitDate || null,
        comment: checkInForm.comment || null
      })
      wx.showToast({ title: '打卡成功！', icon: 'success' })
      this.setData({ checkInVisible: false })
      this._syncBackGuard()
      this.loadData()
    } catch (e) {
      wx.showToast({ title: '打卡失败', icon: 'error' })
    }
  },

  // Map dialog
  openMap(e: any) {
    const r: Restaurant = e.currentTarget.dataset.item
    if (!r.latitude || !r.longitude) {
      wx.showToast({ title: '暂无位置信息', icon: 'none' })
      return
    }
    this.setData({
      mapVisible: true,
      backGuardActive: true,
      mapRestaurant: r,
      mapLatitude: r.latitude,
      mapLongitude: r.longitude
    })
  },

  closeMap() {
    this.setData({ mapVisible: false })
    this._syncBackGuard()
  },

  navigateToRestaurant() {
    const r = this.data.mapRestaurant
    if (!r || !r.latitude) {
      wx.showToast({ title: '该餐厅暂无位置信息', icon: 'none' })
      return
    }
    wx.openLocation({
      latitude: r.latitude,
      longitude: r.longitude,
      name: r.name || '',
      address: r.address || '',
      scale: 16
    })
  },

  // Delete
  confirmDelete(e: any) {
    const r: Restaurant = e.currentTarget.dataset.item
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${r.name}」吗？`,
      success: async (modalRes) => {
        if (modalRes.confirm) {
          try {
            const res: any = await deleteRestaurant(r.id)
            if (res.data && res.data.code === 200) {
              wx.showToast({ title: '已删除', icon: 'success' })
              this.loadData()
            } else {
              wx.showToast({ title: '删除失败', icon: 'error' })
            }
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'error' })
          }
        }
      }
    })
  },

  // Tag management
  openTagManage() {
    this.setData({ tagManageVisible: true, backGuardActive: true, newTagName: '', newTagColor: '#CC8048' })
  },

  closeTagManage() {
    this.setData({ tagManageVisible: false, colorPickerVisible: false })
    this._syncBackGuard()
  },

  onNewTagNameInput(e: any) {
    this.setData({ newTagName: e.detail.value })
  },

  onNewTagColorInput(e: any) {
    this.setData({ newTagColor: e.detail.value })
  },

  onSelectColor(e: any) {
    const color = e.currentTarget.dataset.color
    const { h, s, v } = hexToHsv(color)
    this.setData({
      newTagColor: color,
      colorPickerVisible: false,
      pickerHue: h, pickerSat: s, pickerVal: v,
      hueColor: `hsl(${h}, 100%, 50%)`,
      hueLeft: `${(h / 360) * 100}%`,
      svLeft: `${s * 100}%`,
      svTop: `${(1 - v) * 100}%`,
      hexInput: color.replace('#', '').toUpperCase()
    })
  },

  toggleColorPicker() {
    const show = !this.data.colorPickerVisible
    if (show) {
      const { newTagColor } = this.data
      const { h, s, v } = hexToHsv(newTagColor || '#CC8048')
      this.setData({
        colorPickerVisible: true,
        pickerHue: h, pickerSat: s, pickerVal: v,
        hueColor: `hsl(${h}, 100%, 50%)`,
        hueLeft: `${(h / 360) * 100}%`,
        svLeft: `${s * 100}%`,
        svTop: `${(1 - v) * 100}%`,
        hexInput: (newTagColor || '#CC8048').replace('#', '').toUpperCase()
      })
    } else {
      this.setData({ colorPickerVisible: false })
    }
  },

  confirmColorPick() {
    const { newTagColor } = this.data
    this.setData({ colorPickerVisible: false })
  },

  onHueStart(e: any) {
    this._updateHue(e)
  },

  onHueMove(e: any) {
    this._updateHue(e)
  },

  _updateHue(e: any) {
    const query = wx.createSelectorQuery().in(this)
    query.select('.hue-bar').boundingClientRect((res: any) => {
      if (!res) return
      let x = (e.touches[0] || e.changedTouches[0]).clientX - res.left
      x = Math.max(0, Math.min(x, res.width))
      const hue = Math.round((x / res.width) * 360)
      const { pickerSat, pickerVal } = this.data
      const [r, g, b] = hsvToRgb(hue, pickerSat, pickerVal)
      const hex = '#' + rgbToHex(r, g, b)
      this.setData({
        pickerHue: hue,
        hueColor: `hsl(${hue}, 100%, 50%)`,
        hueLeft: `${(hue / 360) * 100}%`,
        newTagColor: hex,
        hexInput: hex.replace('#', '').toUpperCase()
      })
    }).exec()
  },

  onSVPadStart(e: any) {
    this._updateSV(e)
  },

  onSVPadMove(e: any) {
    this._updateSV(e)
  },

  _updateSV(e: any) {
    const query = wx.createSelectorQuery().in(this)
    query.select('.color-picker-sv-pad').boundingClientRect((res: any) => {
      if (!res) return
      let x = (e.touches[0] || e.changedTouches[0]).clientX - res.left
      let y = (e.touches[0] || e.changedTouches[0]).clientY - res.top
      x = Math.max(0, Math.min(x, res.width))
      y = Math.max(0, Math.min(y, res.height))
      const s = x / res.width
      const v = 1 - y / res.height
      const { pickerHue } = this.data
      const [r, g, b] = hsvToRgb(pickerHue, s, v)
      const hex = '#' + rgbToHex(r, g, b)
      this.setData({
        pickerSat: s,
        pickerVal: v,
        svLeft: `${s * 100}%`,
        svTop: `${(1 - v) * 100}%`,
        newTagColor: hex,
        hexInput: hex.replace('#', '').toUpperCase()
      })
    }).exec()
  },

  onHexInput(e: any) {
    let val = e.detail.value.replace(/[^0-9a-fA-F]/g, '').substring(0, 6).toUpperCase()
    this.setData({ hexInput: val })
    if (val.length === 6) {
      const hex = '#' + val
      const { h, s, v } = hexToHsv(hex)
      this.setData({
        newTagColor: hex,
        pickerHue: h, pickerSat: s, pickerVal: v,
        hueColor: `hsl(${h}, 100%, 50%)`,
        hueLeft: `${(h / 360) * 100}%`,
        svLeft: `${s * 100}%`,
        svTop: `${(1 - v) * 100}%`
      })
    }
  },

  async handleAddTag() {
    const { newTagName, newTagColor } = this.data
    if (!newTagName.trim()) {
      wx.showToast({ title: '请输入标签名', icon: 'error' })
      return
    }
    try {
      const res: any = await createTag({ name: newTagName.trim(), color: newTagColor })
      if (res.data && res.data.code === 200) {
        wx.showToast({ title: '添加成功', icon: 'success' })
        this.setData({ newTagName: '' })
        this.loadData()
      } else {
        wx.showToast({ title: (res.data && res.data.message) || '添加失败', icon: 'error' })
      }
    } catch (e) {
      wx.showToast({ title: '添加失败', icon: 'error' })
    }
  },

  handleDeleteTag(e: any) {
    const tag: Tag = e.currentTarget.dataset.tag
    wx.showModal({
      title: '确认删除',
      content: `确定要删除标签「${tag.name}」吗？`,
      success: async (modalRes) => {
        if (modalRes.confirm) {
          try {
            const res: any = await deleteTag(tag.id)
            if (res.data && res.data.code === 200) {
              wx.showToast({ title: '已删除', icon: 'success' })
              this.loadData()
            } else {
              wx.showToast({ title: '删除失败', icon: 'error' })
            }
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'error' })
          }
        }
      }
    })
  },

  // AI 智能推荐
  openAiOverlay() {
    this.setData({ aiOverlayVisible: true, backGuardActive: true })
  },

  closeAiOverlay() {
    this.setData({ aiOverlayVisible: false, aiKbHeight: 0 })
    this._syncBackGuard()
  },

  onAiKbShow(e: any) {
    this.setData({ aiKbHeight: e.detail.height || 0 })
  },

  onAiKbHide() {
    this.setData({ aiKbHeight: 0 })
  },

  onAiRecInput(e: any) {
    this.setData({ aiRecInput: e.detail.value })
  },

  async handleAiRecSend() {
    const query = this.data.aiRecInput.trim()
    if (!query || this.data.aiRecLoading) return

    const userMsg = { role: 'user' as const, content: query }
    this.setData({
      aiRecMessages: [...this.data.aiRecMessages, userMsg],
      aiRecInput: '',
      aiRecLoading: true
    })

    try {
      const history = this.data.aiRecMessages.slice(0, -1).map(m => ({
        role: m.role, content: m.content
      }))
      const res: any = await chatRecommend(query, history)
      if (res.data && res.data.code === 200) {
        const recs = res.data.data.recommendations || []
        let aiContent: string
        let aiRecs: any[] | undefined

        if (recs.length > 0) {
          aiContent = recs.map((r: any) => r.name).join('、')
          aiRecs = recs
        } else {
          aiContent = '没找到特别匹配的店，换个说法试试？'
        }

        const aiMsg = { role: 'assistant' as const, content: aiContent, recommendations: aiRecs }
        this.setData({ aiRecMessages: [...this.data.aiRecMessages, aiMsg] })
      }
    } catch (e) {
      const aiMsg = { role: 'assistant' as const, content: '网络请求失败，请稍后重试' }
      this.setData({ aiRecMessages: [...this.data.aiRecMessages, aiMsg] })
    } finally {
      this.setData({ aiRecLoading: false })
    }
  },

  // AI 生成点评
  async generateAiReview() {
    if (this.data.aiReviewLoading) return
    const { checkInForm, checkInRestaurantId } = this.data
    if (!checkInForm.rating) {
      wx.showToast({ title: '请先选评分', icon: 'none' })
      return
    }

    this.setData({ aiReviewLoading: true })
    try {
      const res: any = await generateReview({
        restaurantId: checkInRestaurantId,
        rating: checkInForm.rating,
        cost: checkInForm.cost || undefined
      })
      if (res.data && res.data.code === 200) {
        this.setData({ 'checkInForm.comment': res.data.data.review })
      }
    } catch (e) {
      wx.showToast({ title: '生成失败', icon: 'none' })
    } finally {
      this.setData({ aiReviewLoading: false })
    }
  },

  stopPropagation() {
    // prevent tap from closing popup
  }
})
