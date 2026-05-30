import { chatRecommend } from '../../utils/api'

interface ChatMessage {
  role: 'user' | 'ai'
  content: string
  recommendations?: Recommendation[]
}

interface Recommendation {
  name: string
  avgPrice: number
  city: string
  address: string
  description: string
  recommendedDishes: string
  reason: string
}

Page({
  data: {
    messages: [] as ChatMessage[],
    inputText: '',
    loading: false,
    scrollToView: ''
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  onInput(e: any) {
    this.setData({ inputText: e.detail.value })
  },

  selectHint(e: any) {
    const text = e.currentTarget.dataset.text
    this.setData({ inputText: text })
    setTimeout(() => this.sendMessage(), 100)
  },

  async sendMessage() {
    const { inputText, messages } = this.data
    const text = inputText.trim()
    if (!text || this.data.loading) return

    // Add user message
    const userMessage: ChatMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMessage]
    this.setData({ messages: newMessages, inputText: '', loading: true })
    this.scrollToBottom()

    // Build history for API (exclude last user message)
    const history: Array<{role: string, content: string}> = []
    for (const msg of newMessages.slice(0, -1)) {
      if (msg.role === 'user') {
        history.push({ role: 'user', content: msg.content })
      } else if (msg.role === 'ai') {
        if (msg.recommendations && msg.recommendations.length > 0) {
          const summary = msg.recommendations.map((r: any) => `推荐了${r.name}(${[r.province, r.city].filter(Boolean).join(' ')})：${r.reason}`).join('；')
          history.push({ role: 'assistant', content: summary })
        } else if (msg.content) {
          history.push({ role: 'assistant', content: msg.content })
        }
      }
    }

    try {
      const res: any = await chatRecommend(text, history)
      const recs = (res.data && res.data.data && res.data.data.recommendations) || []
      let aiMessage: ChatMessage
      if (recs.length > 0) {
        aiMessage = { role: 'ai', content: '', recommendations: recs }
      } else {
        aiMessage = { role: 'ai', content: '没找到特别匹配的店，要不要试试惊喜推荐？' }
      }
      const updatedMessages = [...newMessages, aiMessage]
      this.setData({ messages: updatedMessages, loading: false })
      this.scrollToBottom()
    } catch (e) {
      const errorMessage: ChatMessage = {
        role: 'ai',
        content: '网络请求失败，请稍后重试'
      }
      const updatedMessages = [...newMessages, errorMessage]
      this.setData({ messages: updatedMessages, loading: false })
      this.scrollToBottom()
    }
  },

  scrollToBottom() {
    setTimeout(() => {
      const query = wx.createSelectorQuery()
      query.select('.chat-messages').boundingClientRect()
      query.selectViewport().scrollOffset()
      query.exec((res) => {
        if (res[0]) {
          const lastMsgId = `msg-${this.data.messages.length - 1}`
          this.setData({ scrollToView: lastMsgId })
        }
      })
    }, 100)
  },

  clearChat() {
    wx.showModal({
      title: '清空对话',
      content: '确定要清空所有对话记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ messages: [], scrollToView: '' })
        }
      }
    })
  }
})
