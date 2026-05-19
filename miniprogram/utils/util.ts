export const formatTime = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return (
    [year, month, day].map(formatNumber).join('/') +
    ' ' +
    [hour, minute, second].map(formatNumber).join(':')
  )
}

const formatNumber = (n: number) => {
  const s = n.toString()
  return s[1] ? s : '0' + s
}

export function getImageUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const app = getApp<IAppOption>()
  return app.globalData.baseUrl + url
}

export function parseImageUrls(imageUrls: string | null | undefined): string[] {
  if (!imageUrls) return []
  try {
    const arr = JSON.parse(imageUrls)
    if (Array.isArray(arr)) return arr.filter(Boolean)
  } catch {
    // single URL string
  }
  return [imageUrls]
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return dateStr.slice(0, 10)
}
