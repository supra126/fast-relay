# Fast Relay

[English](README.md) | [繁體中文](README.zh-TW.md)

輕量級、靈活的 HTTP 代理路由器，支援透過 GitHub Gist 動態配置。

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.com/deploy/6Mtv9w?referralCode=EnYHPz)

## ✨ 特色功能

- 🚀 **零配置部署** - 數秒內部署至 Railway
- 📝 **JSON 路由配置** - 簡單、易讀的路由設定
- 🔄 **動態配置** - 透過 GitHub Gist 更新路由，無需重新部署
- 🎯 **靈活的路徑模式** - 支援路徑附加或查詢參數路由
- ⚡ **自訂回應** - 即發即忘的非同步轉發，立即回應客戶端
- 🛡️ **生產就緒** - 基於 Fastify 打造，高效能運行
- 🔒 **內建安全性** - SSRF 防護、可選 API 認證、Token 遮罩
- 📊 **詳細日誌** - 追蹤所有請求與回應
- 📦 **多格式支援** - 自動處理 JSON、form-data、檔案上傳和文字格式

## 🎯 使用場景

- **Webhook 轉發** - 將外部服務的 webhook 路由至您的後端
- **API 聚合** - 在單一端點下整合多個後端 API
- **A/B 測試** - 根據路徑將流量導向不同後端
- **開發代理** - 將本地開發流量代理至測試/生產環境
- **舊版 API 遷移** - 透過路由特定路徑逐步遷移 API

## 🚀 快速開始

### 選項 1：部署至 Railway（推薦）

1. 點擊上方的 "Deploy on Railway" 按鈕
2. 配置環境變數（可選）
3. 完成！您的代理服務已上線

### 選項 2：本地開發

```bash
# 複製儲存庫
git clone https://github.com/yourusername/fast-relay.git
cd fast-relay

# 安裝依賴
yarn install

# 執行互動式設定精靈（推薦）
yarn setup

# 啟動開發伺服器
yarn dev
```

> 💡 **提示：** 使用[互動式設定精靈](docs/SETUP.zh-TW.md)輕鬆配置 GitHub Gist 整合！

## 💡 核心概念

### 簡單的路由配置

建立 `routes.json` 並設定您的路由規則：

```json
{
  "routes": [
    {
      "source": "/api/v1/*",
      "target": "https://api.example.com/v1",
      "pathMode": "append"
    },
    {
      "source": "/webhook/*",
      "target": "https://webhooks.example.com",
      "pathMode": "query",
      "responseMode": "custom",
      "customResponse": {
        "status": 200,
        "body": "OK"
      }
    }
  ]
}
```

### 路徑模式

**附加模式**（預設）：
```
/api/v1/users/123 → https://api.example.com/v1/users/123
```

**查詢模式**：
```
/api/v2/orders/123 → https://api.example.com/v2?path=/orders/123
```

### 回應模式

**代理模式**（預設）- 等待目標回應並返回給客戶端

**自訂模式** - 立即返回回應，非同步轉發請求

非常適合不需要等待處理的 webhook！

## 📚 文件

### 入門指南
- 🚀 [快速設定指南](docs/SETUP.zh-TW.md) - 5 分鐘精靈引導設定
- ⚙️ [配置指南](docs/CONFIGURATION.zh-TW.md) - 完整路由配置參考
- 🔐 [環境變數](docs/ENVIRONMENT.zh-TW.md) - 所有環境設定說明

### 進階主題
- 🔒 [安全性指南](docs/SECURITY.zh-TW.md) - SSRF 防護、認證、最佳實踐
- 💡 [使用範例](docs/EXAMPLES.zh-TW.md) - 常見場景的實際配置
- 🏗️ [架構](docs/ARCHITECTURE.zh-TW.md) - 技術架構與日誌詳解

### 指南
- 📖 [GitHub Gist 設定](docs/GIST_SETUP.zh-TW.md) - 詳細 Gist 配置指南

## 🔍 API 端點

### 健康檢查

```bash
GET /health
```

無需認證即可存取。

### 代理路由

所有配置的路由會根據您的 `routes.json` 自動註冊。

**使用認證**（如果設定了 `API_KEYS`）：
```bash
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:8080/api/v1/users
```

## 🔧 配置優先順序

1. **GitHub Gist**（如果設定了 `GIST_URL` 或 `GIST_ID`）- 自動同步並重啟
2. **本地 `routes.json`** - 首次執行時自動從範例建立
3. **環境變數** - 僅為舊版支援

## 🚢 部署

### Railway

1. Fork 此儲存庫
2. 連接至 Railway
3. 配置環境變數
4. 部署！

Railway 自動處理：
- 依賴安裝
- TypeScript 編譯
- 伺服器啟動
- 崩潰時自動重啟

## 📝 範例：多服務閘道

```json
{
  "routes": [
    {
      "source": "/users/*",
      "target": "https://users-service.example.com/api",
      "description": "使用者管理"
    },
    {
      "source": "/orders/*",
      "target": "https://orders-service.example.com/api",
      "description": "訂單處理"
    },
    {
      "source": "/payments/*",
      "target": "https://payments-service.example.com/api",
      "description": "付款處理"
    }
  ]
}
```

## 🏗️ 技術堆疊

- **Fastify 5.x** - 高效能 Web 框架
- **TypeScript** - 型別安全開發
- **@fastify/http-proxy** - 代理中介軟體（附加模式）
- **@fastify/formbody** - Form URL-encoded 本文解析器
- **@fastify/multipart** - Multipart form-data 和檔案上傳支援
- **Native Fetch API** - 請求轉發（查詢模式）
- **Pino** - 快速日誌記錄

## 📝 授權

MIT License - 詳見 [LICENSE](LICENSE) 檔案

---

**需要協助？**
- 📖 查看[文件](docs/)
- 🐛 在 [GitHub](https://github.com/supra126/fast-relay/issues) 回報問題
- 💬 開始[討論](https://github.com/supra126/fast-relay/discussions)
