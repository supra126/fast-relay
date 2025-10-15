# 配置範例

常見使用場景的 Fast Relay 實際配置範例。

## 範例 1：帶自訂回應的 Webhook 轉發

**情境：** 從外部服務轉發 webhook，並立即回應。

**使用場景：** GitHub webhooks、Stripe webhooks，任何不等待處理的服務。

```json
{
  "routes": [
    {
      "source": "/webhook/*",
      "target": "https://webhooks.example.com/hooks",
      "description": "帶自訂回應的 Webhook 接收器",
      "pathMode": "query",
      "queryParamName": "path",
      "responseMode": "custom",
      "customResponse": {
        "status": 200,
        "body": "OK"
      }
    }
  ]
}
```

**運作方式：**
1. 外部服務發送 webhook 至 `/webhook/github`
2. 客戶端立即收到 "OK" 回應
3. 請求在背景轉發至 `https://webhooks.example.com/hooks?path=/github`
4. 處理非同步進行

**優點：**
- ✅ 快速回應外部服務
- ✅ 沒有超時問題
- ✅ 背景處理

## 範例 2：多服務 API 閘道

**情境：** 在單一代理後整合多個微服務。

**使用場景：** 在單一域名下整合多個後端服務。

```json
{
  "routes": [
    {
      "source": "/users/*",
      "target": "https://users-service.example.com/api",
      "pathMode": "append",
      "description": "使用者管理服務"
    },
    {
      "source": "/orders/*",
      "target": "https://orders-service.example.com/api",
      "pathMode": "append",
      "description": "訂單處理服務"
    },
    {
      "source": "/payments/*",
      "target": "https://payments-service.example.com/api",
      "pathMode": "append",
      "description": "付款處理服務"
    },
    {
      "source": "/notifications/*",
      "target": "https://notifications-service.example.com/api",
      "pathMode": "append",
      "description": "通知服務"
    }
  ]
}
```

**請求範例：**
```
GET /users/123 → https://users-service.example.com/api/123
POST /orders/create → https://orders-service.example.com/api/create
GET /payments/status/abc → https://payments-service.example.com/api/status/abc
```

## 範例 3：開發/測試環境路由

**情境：** 將特定路徑路由至測試環境進行測試。

**使用場景：** 在不影響生產環境的情況下測試新功能。

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

**注意：** 順序很重要！更具體的路由（`/api/beta/*`）必須放在通用路由（`/api/*`）之前。

**請求範例：**
```
GET /api/beta/users → https://staging-api.example.com/v1/users（測試環境）
GET /api/users → https://api.example.com/v1/users（生產環境）
```

## 範例 4：舊版 API 遷移

**情境：** 逐步從舊 API 遷移至新 API。

**使用場景：** 在遷移期間保持向下相容。

```json
{
  "routes": [
    {
      "source": "/api/v2/*",
      "target": "https://new-api.example.com/api",
      "description": "新 API（v2）",
      "pathMode": "append"
    },
    {
      "source": "/api/v1/*",
      "target": "https://legacy-api.example.com/api",
      "description": "舊版 API（v1）",
      "pathMode": "append"
    },
    {
      "source": "/api/*",
      "target": "https://new-api.example.com/api",
      "description": "預設使用新 API",
      "pathMode": "append"
    }
  ]
}
```

**遷移策略：**
1. 開始：所有流量導向 `legacy-api.example.com`
2. 為新 API 新增 v2 路由
3. 逐步遷移端點
4. 最後，將預設路由重導向至新 API

## 範例 5：查詢參數路由

**情境：** 目標 API 期望路徑作為查詢參數。

**使用場景：** 與舊版系統整合或特定 API 需求。

```json
{
  "routes": [
    {
      "source": "/proxy/*",
      "target": "https://api.example.com/handler",
      "pathMode": "query",
      "queryParamName": "endpoint",
      "description": "基於查詢的路由"
    }
  ]
}
```

**請求範例：**
```
GET /proxy/users/123
→ https://api.example.com/handler?endpoint=/users/123

POST /proxy/orders/create
→ https://api.example.com/handler?endpoint=/orders/create
```

## 範例 6：狀態/健康端點

**情境：** 為狀態端點提供自訂回應，無需呼叫後端。

**使用場景：** 快速狀態檢查、健康端點。

```json
{
  "routes": [
    {
      "source": "/status",
      "target": "https://backend.example.com/health",
      "responseMode": "custom",
      "customResponse": {
        "status": 200,
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "status": "ok",
          "service": "fast-relay",
          "timestamp": "2025-10-15T00:00:00Z"
        }
      }
    }
  ]
}
```

## 範例 7：混合回應模式

**情境：** 不同路由使用不同回應模式。

**使用場景：** 結合同步和非同步操作。

```json
{
  "routes": [
    {
      "source": "/webhook/*",
      "target": "https://webhooks.example.com",
      "responseMode": "custom",
      "customResponse": {
        "status": 202,
        "body": "Accepted"
      },
      "description": "非同步 webhooks"
    },
    {
      "source": "/api/*",
      "target": "https://api.example.com",
      "responseMode": "proxy",
      "description": "同步 API 呼叫"
    }
  ]
}
```

## 範例 8：多格式檔案上傳代理

**情境：** 轉發檔案上傳和表單資料至後端。

**使用場景：** 處理 multipart/form-data 和檔案上傳。

```json
{
  "routes": [
    {
      "source": "/upload/*",
      "target": "https://storage.example.com/api",
      "pathMode": "append",
      "description": "檔案上傳端點"
    },
    {
      "source": "/form/*",
      "target": "https://forms.example.com/api",
      "pathMode": "append",
      "description": "表單提交端點"
    }
  ]
}
```

**支援格式：**
- `multipart/form-data`（檔案上傳）
- `application/x-www-form-urlencoded`（表單提交）
- `application/json`（JSON 資料）
- 文字格式（plain、html、xml、javascript）

## 範例 9：API Key 保護

**情境：** 使用 API keys 保護您的代理。

**`.env` 配置：**
```env
API_KEYS=client1-secure-key,client2-secure-key,admin-master-key
```

**路由配置：**
```json
{
  "routes": [
    {
      "source": "/api/*",
      "target": "https://protected-api.example.com",
      "description": "受保護的 API"
    }
  ]
}
```

**客戶端請求：**
```bash
# 使用 Bearer token（推薦）
curl -H "Authorization: Bearer client1-secure-key" \
  https://your-proxy.com/api/users

# 使用 X-API-Key header
curl -H "X-API-Key: client1-secure-key" \
  https://your-proxy.com/api/users
```

## 範例 10：域名白名單（SSRF 防護）

**情境：** 限制代理目標為受信任的域名。

**`.env` 配置：**
```env
ALLOWED_DOMAINS=*.example.com,*.trusted-api.com,specific-service.com
```

**路由配置：**
```json
{
  "routes": [
    {
      "source": "/external/*",
      "target": "https://api.example.com",
      "description": "白名單允許"
    }
  ]
}
```

**被阻擋的嘗試：**
```json
{
  "source": "/bad/*",
  "target": "https://malicious.com"
}
```
→ **錯誤：** 域名不在 ALLOWED_DOMAINS 白名單中

## 完整生產環境範例

**情境：** 包含安全性、監控和多個服務的完整生產環境設定。

**`.env` 檔案：**
```env
# 伺服器
PORT=8080
NODE_ENV=production
BODY_LIMIT=10485760

# GitHub Gist
GIST_ID=abc123def456
GITHUB_TOKEN=ghp_secure_token_here
GIST_SYNC_INTERVAL=300
GIST_AUTO_RESTART=true

# 安全性
API_KEYS=web-client-key,mobile-client-key,internal-service-key
ALLOWED_DOMAINS=*.example.com,*.trusted-partner.com

# 效能
CORS_ORIGINS=https://app.example.com,https://admin.example.com
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=1 minute
```

**`routes.json`：**
```json
{
  "routes": [
    {
      "source": "/webhook/github/*",
      "target": "https://webhooks.example.com/github",
      "pathMode": "query",
      "queryParamName": "event",
      "responseMode": "custom",
      "customResponse": {
        "status": 200,
        "body": "OK"
      },
      "description": "GitHub webhooks（非同步）"
    },
    {
      "source": "/webhook/stripe/*",
      "target": "https://webhooks.example.com/stripe",
      "pathMode": "query",
      "queryParamName": "event",
      "responseMode": "custom",
      "customResponse": {
        "status": 200,
        "body": "OK"
      },
      "description": "Stripe webhooks（非同步）"
    },
    {
      "source": "/api/users/*",
      "target": "https://users.example.com/api",
      "pathMode": "append",
      "responseMode": "proxy",
      "description": "使用者服務"
    },
    {
      "source": "/api/orders/*",
      "target": "https://orders.example.com/api",
      "pathMode": "append",
      "responseMode": "proxy",
      "description": "訂單服務"
    },
    {
      "source": "/api/payments/*",
      "target": "https://payments.example.com/api",
      "pathMode": "append",
      "responseMode": "proxy",
      "description": "付款服務"
    }
  ]
}
```

## 測試您的配置

```bash
# 測試代理路由
curl https://your-proxy.com/api/users \
  -H "Authorization: Bearer web-client-key"

# 測試 webhook（應立即返回）
curl https://your-proxy.com/webhook/github/push \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"event":"push"}'

# 測試檔案上傳
curl https://your-proxy.com/upload/avatar \
  -F "file=@avatar.png" \
  -H "Authorization: Bearer web-client-key"

# 健康檢查（無需認證）
curl https://your-proxy.com/health
```

## 相關文件

- [配置指南](CONFIGURATION.zh-TW.md) - 詳細配置選項
- [環境變數](ENVIRONMENT.zh-TW.md) - 所有環境變數
- [安全性指南](SECURITY.zh-TW.md) - 安全性最佳實踐
