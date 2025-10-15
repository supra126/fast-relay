# 環境變數

Fast Relay 支援的所有環境變數完整參考。

## 快速參考

```env
# 伺服器
PORT=8080
HOST=0.0.0.0
NODE_ENV=development
BODY_LIMIT=10485760

# GitHub Gist（擇一方式）
GIST_URL=https://gist.githubusercontent.com/...
# 或
GIST_ID=abc123
GITHUB_TOKEN=ghp_xxxxx

# Gist 同步
GIST_SYNC_INTERVAL=300
GIST_AUTO_RESTART=true
GIST_FETCH_TIMEOUT=10000

# 安全性（可選）
API_KEYS=key1,key2,key3
ALLOWED_DOMAINS=*.example.com

# 效能
CORS_ORIGINS=https://app.example.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
```

## 伺服器配置

### PORT

**類型：** Number
**預設值：** `8080`
**必填：** 否

伺服器監聽的埠號。

```env
PORT=8080
```

**Railway/雲端平台：** 設為 `$PORT` 以使用平台指定的埠號：
```env
PORT=$PORT
```

### HOST

**類型：** String
**預設值：** `0.0.0.0`
**必填：** 否

伺服器綁定的主機位址。

```env
# 監聽所有介面（預設）
HOST=0.0.0.0

# 僅監聽本機（開發環境）
HOST=127.0.0.1
```

### NODE_ENV

**類型：** String
**值：** `development` | `production`
**預設值：** `development`
**必填：** 否

決定執行環境。

```env
NODE_ENV=production
```

**效果：**
- `development`：美化輸出的日誌，詳細輸出
- `production`：JSON 格式日誌，效能最佳化，更嚴格的驗證

### BODY_LIMIT

**類型：** Number（bytes）
**預設值：** `10485760`（10MB）
**必填：** 否

請求本文的最大大小。

```env
# 1MB
BODY_LIMIT=1048576

# 10MB（預設）
BODY_LIMIT=10485760

# 50MB
BODY_LIMIT=52428800
```

**使用場景：**
- 小型載荷：1MB
- 標準 API：10MB
- 檔案上傳：50MB+

## GitHub Gist 配置

### 方式 1：公開 Gist（透過 Raw URL）

#### GIST_URL

**類型：** String（URL）
**必填：** 否（除非使用 Gist）

GitHub Gist 配置的 Raw URL。

```env
GIST_URL=https://gist.githubusercontent.com/username/abc123.../raw/routes.json
```

**如何取得：**
1. 在 GitHub 上開啟您的 Gist
2. 點擊「Raw」按鈕
3. 複製 URL

**注意：** 公開和私密 Gist 皆可使用。

### 方式 2：私密 Gist（透過 Gist ID + Token）

#### GIST_ID

**類型：** String
**必填：** 否（除非使用私密 Gist）

您的 GitHub Gist ID。

```env
GIST_ID=abc123def456
```

**如何取得：**
- 從 Gist URL：`https://gist.github.com/username/abc123def456`
- ID 為：`abc123def456`

#### GITHUB_TOKEN

**類型：** String
**必填：** 是（使用 `GIST_ID` 時）

具有 `gist` 權限範圍的 GitHub Personal Access Token。

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**如何建立：**
1. 前往 https://github.com/settings/tokens
2. 點擊「Generate new token (classic)」
3. 選擇權限範圍：**gist**（僅此項）
4. 產生並複製 token

**安全性：**
- ✅ Token 在日誌中自動遮罩
- ✅ 使用 `.env` 檔案（切勿提交至 Git）
- ✅ 定期輪換 tokens
- ❌ 切勿在生產環境使用範例/佔位符格式

### Gist 同步設定

#### GIST_SYNC_INTERVAL

**類型：** Number（秒）
**預設值：** `300`（5 分鐘）
**必填：** 否

檢查配置更新的頻率。

```env
# 每 30 秒檢查一次
GIST_SYNC_INTERVAL=30

# 每 5 分鐘檢查一次（預設）
GIST_SYNC_INTERVAL=300

# 停用自動同步
GIST_SYNC_INTERVAL=0
```

**建議：**
- 開發環境：30-60 秒
- 生產環境：300 秒（5 分鐘）
- 僅使用本地檔案時停用：0

#### GIST_AUTO_RESTART

**類型：** Boolean
**預設值：** `true`
**必填：** 否

配置變更時自動重啟伺服器。

```env
# 變更時自動重啟（預設）
GIST_AUTO_RESTART=true

# 需要手動重啟
GIST_AUTO_RESTART=false
```

**注意：** 在 Railway/雲端平台上，重啟會觸發自動重新部署。

#### GIST_FETCH_TIMEOUT

**類型：** Number（毫秒）
**預設值：** `10000`（10 秒）
**必填：** 否

等待 Gist API 回應的最長時間。

```env
# 5 秒
GIST_FETCH_TIMEOUT=5000

# 10 秒（預設）
GIST_FETCH_TIMEOUT=10000

# 30 秒（網路較慢）
GIST_FETCH_TIMEOUT=30000
```

## 安全性配置

### API_KEYS

**類型：** String（逗號分隔）
**必填：** 否
**預設值：** 無（停用認證）

請求認證用的 API keys。

```env
# 單一金鑰
API_KEYS=your-secure-random-key-here

# 多個金鑰（不同客戶端）
API_KEYS=key-for-client1,key-for-client2,admin-master-key
```

**認證方式：**
1. Bearer token：`Authorization: Bearer <key>`
2. API key header：`X-API-Key: <key>`
3. Query parameter：`?api_key=<key>`（不建議）

**最佳實踐：**
- ✅ 使用強隨機金鑰（至少 16 字元）
- ✅ 在生產環境使用 Bearer token
- ✅ 定期輪換金鑰
- ❌ 不要在敏感 API 使用查詢參數
- ❌ 不要將真實金鑰提交至版本控制

**驗證：**
- 在生產環境使用範例值時啟動失敗
- 金鑰長度少於 16 字元時發出警告

### ALLOWED_DOMAINS

**類型：** String（逗號分隔）
**必填：** 否
**預設值：** 無（允許所有公開域名）

用於 SSRF 防護的允許目標域名白名單。

```env
# 特定域名
ALLOWED_DOMAINS=api.example.com,webhooks.example.com

# 萬用字元子域名
ALLOWED_DOMAINS=*.example.com,*.trusted-api.com

# 混合
ALLOWED_DOMAINS=api.example.com,*.internal-services.com
```

**萬用字元匹配：**
- `*.example.com` 匹配：`api.example.com`、`app.example.com`
- `*.example.com` 不匹配：`example.com`（需要時兩者都加入）

**注意：** 無論此設定為何，始終阻擋私有 IP。

## 效能與安全性

### CORS_ORIGINS

**類型：** String（逗號分隔）
**必填：** 否
**預設值：** 無（停用 CORS）

跨來源資源共享的允許來源。

```env
# 單一來源
CORS_ORIGINS=https://app.example.com

# 多個來源
CORS_ORIGINS=https://app.example.com,https://admin.example.com

# 開發環境
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

**注意：** 如果未設定，CORS 完全停用。

### RATE_LIMIT_MAX

**類型：** Number
**預設值：** `100`
**必填：** 否

每個時間窗口的最大請求數。

```env
# 嚴格
RATE_LIMIT_MAX=50

# 預設
RATE_LIMIT_MAX=100

# 寬鬆
RATE_LIMIT_MAX=1000
```

### RATE_LIMIT_WINDOW

**類型：** String
**預設值：** `1 minute`
**必填：** 否

速率限制的時間窗口。

```env
# 每秒
RATE_LIMIT_WINDOW=1 second

# 每分鐘（預設）
RATE_LIMIT_WINDOW=1 minute

# 每小時
RATE_LIMIT_WINDOW=1 hour
```

**格式：** `<數字> <單位>`，單位可以是：
- `second` / `seconds`
- `minute` / `minutes`
- `hour` / `hours`

## 舊版配置（不建議）

### PROXY_ROUTES

**類型：** String（逗號分隔的路由）
**必填：** 否

舊版路由定義格式。

```env
PROXY_ROUTES=/api/v1/*->https://api.example.com/v1,/webhook->https://webhooks.example.com
```

**限制：** 不支援自訂回應或查詢模式。

### TARGET_URLS

**類型：** String（URL）
**必填：** 否

簡單的單一目標代理。

```env
TARGET_URLS=https://api.example.com
```

**限制：** 所有請求都導向同一目標。

## 環境檔案（.env）

### 範例 .env 檔案

```env
# 伺服器
PORT=8080
HOST=0.0.0.0
NODE_ENV=production
BODY_LIMIT=10485760

# GitHub Gist（私密）
GIST_ID=abc123def456
GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz
GIST_SYNC_INTERVAL=300
GIST_AUTO_RESTART=true
GIST_FETCH_TIMEOUT=10000

# 安全性
API_KEYS=client1-secure-key,client2-secure-key
ALLOWED_DOMAINS=*.example.com,*.trusted-api.com

# 效能
CORS_ORIGINS=https://app.example.com,https://admin.example.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
```

### 載入優先順序

1. 專案根目錄的 `.env` 檔案
2. 系統環境變數
3. 預設值

## 驗證

Fast Relay 在啟動時驗證環境變數：

✅ **檢查項目：**
- GitHub token 格式（必須以 `ghp_` 或 `github_pat_` 開頭）
- API keys 長度和強度
- 生產環境的範例/佔位符值
- URL 格式

❌ **以下情況將導致啟動失敗：**
- 在生產環境的 `API_KEYS` 使用 `your-`、`example`、`changeme`
- 在生產環境的 `GITHUB_TOKEN` 使用佔位符值
- 所需變數缺失

## 疑難排解

### 問題：伺服器啟動失敗

**檢查：**
- `.env` 檔案存在且位於專案根目錄
- `.env` 中沒有語法錯誤
- 所需變數已設定
- 生產環境沒有範例/佔位符值

### 問題：Gist 同步無法運作

**檢查：**
- `GIST_URL` 或 `GIST_ID` + `GITHUB_TOKEN` 設定正確
- `GIST_SYNC_INTERVAL` 未設為 0
- Token 具有 `gist` 權限範圍
- 與 GitHub 的網路連線正常

### 問題：認證無法運作

**檢查：**
- `API_KEYS` 已設定
- 使用正確的認證方式（建議使用 Bearer token）
- 金鑰完全匹配（區分大小寫）
- 不是使用 `/health` 端點（始終公開）

## 相關文件

- [配置指南](CONFIGURATION.zh-TW.md) - 路由配置選項
- [安全性指南](SECURITY.zh-TW.md) - 安全性最佳實踐
- [設定指南](SETUP.zh-TW.md) - 互動式設定精靈
