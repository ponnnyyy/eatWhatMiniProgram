# CLAUDE.md — eatWhat 微信小程序

## 项目概述

"吃什么"餐厅推荐微信小程序，TypeScript，自定义 TabBar，5 个标签页。

## 技术栈

- 微信小程序原生框架 + TypeScript
- 自定义 TabBar 组件
- 无 npm 依赖（TypeScript 通过开发者工具插件编译）

## AppID

`wxa19e5723db4b13d6`

## 项目结构

```
miniprogram/
├── app.json                    # 页面注册 + tabBar + window 配置
├── app.ts                      # 全局逻辑: 登录、baseUrl、访客记录
├── app.wxss                    # 设计系统: 暖色主题 CSS 变量 + 工具类
├── sitemap.json
├── assets/
│   └── tab-icons/              # TabBar 图标 (SVG, active + inactive)
├── components/
│   ├── navigation-bar/         # 自定义导航栏 (返回按钮、标题、安全区)
│   └── custom-tab-bar/         # 自定义底部 TabBar (5 tabs)
├── pages/
│   ├── restaurant/             # 首页: 餐厅列表 + 编辑弹窗
│   ├── nearby/                 # 附近: 地图 + 附近餐厅
│   ├── add/                    # 添加餐厅 (表单 + 地图选点)
│   ├── stats/                  # 统计仪表盘
│   ├── profile/                # 个人中心
│   ├── chat/                   # AI 对话推荐 (非 Tab 页, wx.navigateTo)
│   └── discover/               # 惊喜推荐 (非 Tab 页, wx.navigateTo)
└── utils/
    ├── api.ts                  # API 封装 (request<T> 泛型 + 全部接口)
    └── util.ts                 # 工具函数 (formatTime, getImageUrl, parseImageUrls)
```

## TabBar 配置

5 个标签页 (自定义 TabBar):

| Tab | 页面路径 | 说明 |
|-----|---------|------|
| 首页 | `pages/restaurant/restaurant` | 餐厅列表 |
| 附近 | `pages/nearby/nearby` | 附近餐厅 + 地图 |
| 添加 | `pages/add/add` | 添加新餐厅 |
| 统计 | `pages/stats/stats` | 数据统计 |
| 我的 | `pages/profile/profile` | 个人设置 |

`chat` 和 `discover` 非标签页，通过 `wx.navigateTo` 跳转。

## 认证流程

1. `app.ts` `onLaunch` → 恢复缓存的 token/userInfo/role
2. 调用 `silentLogin()` → `wx.login()` 获取 code
3. POST `/api/auth/login` → 后端 jscode2session 换取 openid → 返回 JWT token
4. Token 存 `wx.setStorageSync('token')`，请求时 Bearer Header

角色: `USER` / `ADMIN`，存 `globalData.role`。

## API 层 (`utils/api.ts`)

- `BASE_URL` 从 `getApp().globalData.baseUrl` 获取
- 开发环境: `http://10.202.198.13:9281`（本地 IP）
- 生产备选: `https://117.72.38.38` 或 `https://chishenme.online`（注释中）
- `request<T>()` 泛型封装 `wx.request`，自动注入 Bearer token

### 主要接口

| 领域 | 函数 |
|------|------|
| 餐厅 | `getRestaurants`, `getRestaurantById`, `getNearbyRestaurants`, `addRestaurant`, `updateRestaurant`, `deleteRestaurant`, `uploadImage` |
| 标签 | `getTags`, `createTag`, `deleteTag`, `setRestaurantTags` |
| 签到 | `checkIn`, `getVisits` |
| AI | `chatRecommend`, `discover`, `generateReview` |
| 统计 | `getStatsOverview`, `getStatsTrend` |
| 认证 | `wxLogin`, `getUserInfo`, `updateProfile` |

## 省市选择

- 使用微信原生 `<picker mode="region">` 选择省/市/区
- 返回值如 `["广东省","珠海市","香洲区"]`，需去后缀（`stripSuffix` 或内联正则）
- 去除"省/市/自治区/壮族/回族/维吾尔/特别行政区/地区/州/盟"后缀
- 存储格式: "广东" 不带"省"，"珠海" 不带"市"
- `wx.chooseLocation` 返回的 `res.address` 格式为"广东省珠海市香洲区…"
- 用正则 `/^(.+?(?:省|自治区|特别行政区))?(.+?(?:市|地区|州|盟))/` 解析省市
- 直辖市 (北京/天津/上海/重庆) 特殊处理: 省份 = 城市

## 地图功能

- `wx.chooseLocation` 选择位置 → 返回经纬度和地址
- 地址正则解析省市，自动填充表单和 region picker 显示
- `<map>` 组件显示标记点（添加页和编辑弹窗都有）

## 设计系统 (`app.wxss`)

**暖色编辑风格主题:**
- 页面背景: `#F5EEE5`，卡片: `#FCFAF6`，柔和: `#EDE7DF`
- 主色: `#CC8048` (暖橙/赤陶)
- 文字: `#2B2420` (主), `#7D746B` (次), `#A09890` (三)
- 语义色: 绿 `#3A8C5A`, 金 `#C08848`, 危险 `#C43425`
- 圆角梯度: xs(12rpx) → xl(44rpx)
- 工具类: `.card`, `.badge`, `.badge-accent/gold/green`, `.btn-primary`, `.btn-outline`
- 动画: `fadeInUp`, `fadeIn`, `float`, `spin`, `pageFadeIn`

## 后端概要

Spring Boot 3.2.5 + Java 17, 端口 9281, MySQL, JWT 认证, 智谱 GLM AI。
餐厅实体字段: id, province, city, name, address, avgPrice, description, recommendedDishes, latitude, longitude, imageUrls, avgRating, visitCount, tags (M:N)。
权限: ADMIN 可增删改餐厅，USER 只读 + 签到。
