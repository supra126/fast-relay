# 配置指南

本指南涵蓋 Fast Relay 路由的所有配置選項。

## 配置優先順序

Fast Relay 在載入配置時遵循以下優先順序：

1. **GitHub Gist**（如果設定了 `GIST_URL` 或 `GIST_ID`）
   - 啟動時獲取配置
   - 根據 `GIST_SYNC_INTERVAL` 定期自動同步
   - 若 `GIST_AUTO_RESTART=true`，變更時自動重啟

2. **本地 `routes.json` 檔案**
   - 首次執行時自動從 `routes.example.json` 建立
   - 被 Git 忽略（可安全加入自訂配置）
   - 變更需手動重啟伺服器

3. **環境變數**（舊版，不建議使用）
   - `PROXY_ROUTES` 或 `TARGET_URLS`
   - 僅為向下相容而提供

## 路由配置格式

### 基本結構

建立或編輯 `routes.json`：

```json
{
  "$schema": "./routes.schema.json",
  "routes": [
    {
      "source": "/api/v1/*",
      "target": "https://users-api.example.com/v1",
      "description": "主要 API 端點",
      "pathMode": "append",
      "responseMode": "proxy"
    }
  ]
}
```

### 路由屬性

| 屬性 | 類型 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `source` | string | ✅ | - | 來源路徑模式（使用 `/*` 表示萬用字元） |
| `target` | string | ✅ | - | 目標 URL（包含協定的完整 URL） |
| `description` | string | ❌ | - | 易讀的描述，用於文件 |
| `pathMode` | string | ❌ | `"append"` | 萬用字元路徑處理方式：`"append"` 或 `"query"` |
| `queryParamName` | string | ❌ | `"path"` | 使用 `pathMode: "query"` 時的查詢參數名稱 |
| `responseMode` | string | ❌ | `"proxy"` | 回應處理方式：`"proxy"` 或 `"custom"` |
| `customResponse` | object | ❌ | - | 自訂回應配置（`responseMode: "custom"` 時必填） |

## 路徑模式

### 附加模式（Append Mode）（預設）

將萬用字元路徑附加到目標 URL。

**配置：**
```json
{
  "source": "/api/v1/*",
  "target": "https://users-api.example.com/v1",
  "pathMode": "append"
}
```

**範例：**
```
請求：    /api/v1/users/123
目標：    https://users-api.example.com/v1
結果：    https://users-api.example.com/v1/users/123
```

**使用場景：**
- RESTful APIs
- 檔案伺服器
- 標準代理路由

### 查詢模式（Query Mode）

將萬用字元路徑作為查詢參數傳遞。

**配置：**
```json
{
  "source": "/api/v2/*",
  "target": "https://orders-api.example.com/v2",
  "pathMode": "query",
  "queryParamName": "path"
}
```

**範例：**
```
請求：    /api/v2/orders/123
目標：    https://orders-api.example.com/v2
結果：    https://orders-api.example.com/v2?path=/orders/123
```

**使用場景：**
- 期望路徑作為參數的 API
- 舊版系統
- 目標伺服器的自訂路由邏輯

## 回應模式

### 代理模式（Proxy Mode）（預設）

標準代理行為 - 等待目標回應並返回給客戶端。

**配置：**
```json
{
  "source": "/api/*",
  "target": "https://api.example.com",
  "responseMode": "proxy"
}
```

**行為：**
1. 客戶端發送請求
2. 代理將請求轉發至目標
3. 代理等待目標回應
4. 代理將目標回應返回給客戶端

**使用場景：**
- RESTful APIs
- 同步操作
- 客戶端需要實際回應數據時

### 自訂模式（Custom Mode）

即發即忘，立即返回自訂回應。

**配置：**
```json
{
  "source": "/webhook/*",
  "target": "https://webhooks.example.com/hooks",
  "pathMode": "query",
  "queryParamName": "path",
  "responseMode": "custom",
  "customResponse": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "success": true,
      "message": "Webhook received"
    }
  }
}
```

**行為：**
1. 客戶端發送請求
2. 代理立即返回自訂回應
3. 代理非同步轉發請求至目標（背景處理）
4. 目標回應被記錄但不返回給客戶端

**使用場景：**
- Webhook 端點
- 非同步通知
- 狀態/健康檢查端點
- 即發即忘操作

## 自訂回應配置

### JSON 回應

```json
{
  "customResponse": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json",
      "X-Custom-Header": "value"
    },
    "body": {
      "success": true,
      "message": "Request received",
      "timestamp": "2025-10-15T00:00:00Z"
    }
  }
}
```

### 純文字回應

```json
{
  "customResponse": {
    "status": 202,
    "body": "Accepted"
  }
}
```

### 僅自訂標頭

```json
{
  "customResponse": {
    "status": 204,
    "headers": {
      "X-Request-ID": "req-123",
      "X-Processing-Time": "0ms"
    }
  }
}
```

**注意：** 當未指定 `headers` 時，預設 `Content-Type` 會根據 `body` 類型設定：
- 物件/陣列：`application/json`
- 字串：`text/plain`

## 配置範例

### 範例 1：多服務 API 閘道

```json
{
  "routes": [
    {
      "source": "/users/*",
      "target": "https://users-service.example.com/api",
      "description": "使用者管理服務"
    },
    {
      "source": "/orders/*",
      "target": "https://orders-service.example.com/api",
      "description": "訂單處理服務"
    },
    {
      "source": "/payments/*",
      "target": "https://payments-service.example.com/api",
      "description": "付款處理服務"
    }
  ]
}
```

### 範例 2：開發/生產環境分流

```json
{
  "routes": [
    {
      "source": "/api/beta/*",
      "target": "https://staging-api.example.com/v1",
      "description": "測試環境的 Beta 功能",
      "pathMode": "append"
    },
    {
      "source": "/api/*",
      "target": "https://api.example.com/v1",
      "description": "生產環境 API",
      "pathMode": "append"
    }
  ]
}
```

**注意：** 更具體的路由應該放在前面！

### 範例 3：混合模式配置

```json
{
  "routes": [
    {
      "source": "/webhook/*",
      "target": "https://webhooks.example.com",
      "pathMode": "query",
      "responseMode": "custom",
      "customResponse": {
        "status": 200,
        "body": "OK"
      }
    },
    {
      "source": "/api/*",
      "target": "https://api.example.com",
      "pathMode": "append",
      "responseMode": "proxy"
    }
  ]
}
```

## 驗證

Fast Relay 在啟動時驗證您的配置：

- ✅ JSON 語法
- ✅ 必填欄位（`source`、`target`）
- ✅ URL 格式和協定（必須是 `http://` 或 `https://`）
- ✅ SSRF 防護（阻擋私有 IP）
- ✅ 域名白名單（如果設定了 `ALLOWED_DOMAINS`）

**常見驗證錯誤：**

```
❌ 缺少必填欄位：source
❌ 無效的目標 URL：必須以 http:// 或 https:// 開頭
❌ SSRF 防護：目標 URL 包含私有 IP 位址
❌ 域名不允許：目標域名不在 ALLOWED_DOMAINS 白名單中
```

## 路由匹配順序

路由按照 `routes.json` 中出現的順序進行匹配。

**範例：**
```json
{
  "routes": [
    {"source": "/api/v1/users/*", "target": "https://users-v1.example.com"},
    {"source": "/api/v1/*", "target": "https://api-v1.example.com"},
    {"source": "/api/*", "target": "https://api.example.com"}
  ]
}
```

請求 `/api/v1/users/123` 將匹配**第一條**路由，而非第二或第三條。

**最佳實踐：** 將更具體的路由放在更通用的路由之前。

## 更新配置

### 使用 GitHub Gist（推薦）

1. 在 GitHub 上編輯您的 Gist
2. 儲存變更
3. 等待同步間隔（預設：5 分鐘）
4. 伺服器自動以新配置重啟 ✨

### 使用本地檔案

1. 編輯 `routes.json`
2. 儲存變更
3. **手動重啟伺服器**

```bash
# 開發環境
yarn dev

# 生產環境
yarn build
yarn start:prod
```

## 疑難排解

### 問題：路由未載入

**可能原因：**
- JSON 語法錯誤
- 缺少必填欄位
- 無效的 URL 格式

**解決方案：** 檢查伺服器日誌中的驗證錯誤

### 問題：匹配到錯誤的路由

**原因：** 路由順序很重要！

**解決方案：** 將更具體的路由移到通用路由之前

### 問題：配置未更新

**對於 Gist 使用者：**
- 檢查 `GIST_SYNC_INTERVAL` 未設為 0
- 檢查 `GIST_AUTO_RESTART` 設為 true
- 驗證 Gist URL/ID 正確

**對於本地檔案使用者：**
- 記得手動重啟伺服器

## 相關文件

- [環境變數](ENVIRONMENT.zh-TW.md) - 完整環境變數參考
- [設定指南](SETUP.zh-TW.md) - 互動式設定精靈
- [使用範例](EXAMPLES.zh-TW.md) - 實際配置範例
- [安全性](SECURITY.zh-TW.md) - 安全性最佳實踐
