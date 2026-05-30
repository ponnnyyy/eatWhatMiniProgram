import { addRestaurant, uploadImage, getTags, setRestaurantTags } from '../../utils/api'
import { parseImageUrls } from '../../utils/util'

interface TagItem {
  id: number
  name: string
}

interface FormData {
  name: string
  province: string
  city: string
  address: string
  avgPrice: string
  description: string
  recommendedDishes: string
  latitude: number | null
  longitude: number | null
  imageUrl: string
  tagIds: number[]
}

interface SearchPoint {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
}

Page({
  data: {
    form: {
      name: '',
      province: '',
      city: '',
      address: '',
      avgPrice: '',
      description: '',
      recommendedDishes: '',
      latitude: null as number | null,
      longitude: null as number | null,
      imageUrl: '',
      tagIds: [] as number[]
    } as FormData,
    region: [] as string[],
    regionDisplay: '',
    allTags: [] as TagItem[],
    selectedTagMap: {} as Record<number, boolean>,
    imagePreviews: [] as string[],
    imageFiles: [] as string[],
    submitting: false,
    markers: [] as any[],
    searchKeyword: '',
    searchResults: [] as SearchPoint[]
  },

  onLoad() {
    const app = getApp<IAppOption>()
    if (app.globalData.loginPromise) {
      app.globalData.loginPromise.then(() => this.loadTags())
    } else {
      this.loadTags()
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  onShareAppMessage() {
    return {
      title: '好味道 — 添加你喜欢的餐厅',
      path: '/pages/add/add'
    }
  },

  onShareTimeline() {
    return {
      title: '好味道 — 添加你喜欢的餐厅'
    }
  },

  async loadTags() {
    try {
      const res: any = await getTags()
      if (res.data && res.data.code === 200) {
        this.setData({ allTags: res.data.data || [] })
      }
    } catch (err) {
      console.error('加载标签失败:', err)
    }
  },

  onInputChange(e: WechatMiniprogram.Input) {
    const { field } = e.currentTarget.dataset
    this.setData({
      [`form.${field}`]: e.detail.value
    })
  },

  onTextareaInput(e: WechatMiniprogram.Input) {
    const { field } = e.currentTarget.dataset
    this.setData({
      [`form.${field}`]: e.detail.value
    })
  },

  toggleTag(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id
    const tagIds = [...this.data.form.tagIds]
    const index = tagIds.indexOf(id)
    if (index > -1) {
      tagIds.splice(index, 1)
    } else {
      tagIds.push(id)
    }
    const selectedTagMap: Record<number, boolean> = {}
    tagIds.forEach(tid => { selectedTagMap[tid] = true })
    this.setData({ 'form.tagIds': tagIds, selectedTagMap })
  },

  stripSuffix(s: string) {
    return (s || '').replace(/省$|市$|自治区$|壮族$|回族$|维吾尔$|特别行政区$|地区$|自治州$|盟$/, '')
  },

  onRegionChange(e: WechatMiniprogram.PickerChange) {
    const values = e.detail.value as string[]
    const province = this.stripSuffix(values[0] || '')
    const city = this.stripSuffix(values[1] || '')
    this.setData({
      'form.province': province,
      'form.city': city,
      region: values as string[],
      regionDisplay: province && city ? province + ' ' + city : province || city || ''
    })
  },

  chooseImage() {
    const remaining = 3 - this.data.imageFiles.length
    if (remaining <= 0) {
      wx.showToast({ title: '最多3张图片', icon: 'none' })
      return
    }
    wx.chooseImage({
      count: remaining,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          imagePreviews: [...this.data.imagePreviews, ...res.tempFilePaths],
          imageFiles: [...this.data.imageFiles, ...res.tempFilePaths]
        })
      }
    })
  },

  removeImage(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index
    const previews = [...this.data.imagePreviews]
    const files = [...this.data.imageFiles]
    previews.splice(index, 1)
    files.splice(index, 1)
    this.setData({ imagePreviews: previews, imageFiles: files })
  },

  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        if (res.latitude && res.longitude) {
          const markers: any[] = [{
            id: 1,
            latitude: res.latitude,
            longitude: res.longitude,
            width: 32,
            height: 32,
            callout: {
              content: res.name || '选择的位置',
              display: 'ALWAYS',
              borderRadius: 8,
              padding: 8,
              bgColor: '#CC8048',
              color: '#FFFFFF',
              fontSize: 14
            }
          }]

          // 从 address 解析省份和城市
          let province = ''
          let city = ''
          if (res.address) {
            const match = res.address.match(/^(.+?(?:省|自治区|特别行政区))?(.+?(?:市|地区|州|盟))/)
            if (match) {
              if (match[1]) {
                province = this.stripSuffix(match[1])
              }
              if (match[2]) {
                city = this.stripSuffix(match[2])
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

          const regionDisplay = province && city ? province + ' ' + city : province || city || ''
          this.setData({
            'form.latitude': res.latitude,
            'form.longitude': res.longitude,
            'form.address': res.address || '',
            'form.province': province,
            'form.city': city,
            regionDisplay: regionDisplay,
            markers: markers
          })
        }
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.indexOf('cancel') === -1) {
          wx.showModal({
            title: '提示',
            content: '需要获取位置权限才能选择位置，请在设置中开启',
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting()
              }
            }
          })
        }
      }
    })
  },

  async handleSubmit() {
    const { form, imageFiles, submitting } = this.data

    if (submitting) return

    if (!form.name.trim()) {
      wx.showToast({ title: '请输入店名', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    try {
      // Upload all images
      const uploadedUrls: string[] = []
      for (const file of imageFiles) {
        const uploadRes: any = await uploadImage(file)
        if (uploadRes.data && uploadRes.data.code === 200) {
          uploadedUrls.push(uploadRes.data.data.url)
        }
      }

      const restaurantData = {
        name: form.name.trim(),
        province: form.province.trim() || null,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        avgPrice: form.avgPrice || null,
        description: form.description.trim() || null,
        recommendedDishes: form.recommendedDishes.trim() || null,
        latitude: form.latitude,
        longitude: form.longitude,
        imageUrls: uploadedUrls.length > 0 ? JSON.stringify(uploadedUrls) : null
      }

      const res: any = await addRestaurant(restaurantData)
      if (res.data && res.data.code === 200) {
        const savedId = res.data.data.id
        if (form.tagIds.length > 0 && savedId) {
          try { await setRestaurantTags(savedId, form.tagIds) } catch (e) { /* ignore */ }
        }
        wx.showToast({ title: '餐厅添加成功！', icon: 'success' })
        setTimeout(() => {
          this.resetForm()
          wx.switchTab({ url: '/pages/restaurant/restaurant' })
        }, 1500)
      } else {
        wx.showToast({ title: (res.data && res.data.message) || '添加失败', icon: 'none' })
      }
    } catch (err: any) {
      console.error('添加餐厅失败:', err)
      wx.showToast({ title: err.message || '网络错误，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  resetForm() {
    this.setData({
      form: {
        name: '',
        province: '',
        city: '',
        address: '',
        avgPrice: '',
        description: '',
        recommendedDishes: '',
        latitude: null,
        longitude: null,
        imageUrl: '',
        tagIds: []
      },
      region: [],
      regionDisplay: '',
      selectedTagMap: {},
      imagePreviews: [],
      imageFiles: [],
      markers: [],
      searchKeyword: '',
      searchResults: []
    })
  }
})
