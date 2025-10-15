# 安全性指南

Fast Relay 部署的完整安全性指南。

## 安全性功能

Fast Relay 包含多層安全性防護：

- 🔒 **SSRF 防護** - 阻擋對私有 IP 和雲端 metadata 服務的請求
- 🔑 **可選 API 認證** - 使用 API keys 保護端點
- 🎭 **Token 遮罩** - 自動在日誌中遮罩敏感 tokens
- ✅ **環境驗證** - 啟動時檢查弱憑證
- 🌐 **域名白名單** - 限制允許的代理目標
- ⚡ **速率限制** - 防止濫用和 DDoS 攻擊
- 🔐 **CORS 控制** - 管理跨來源請求

## SSRF（伺服器端請求偽造）防護

### 自動防護

Fast Relay 自動阻擋對以下目標的請求：

**私有 IP 範圍：**
- `10.0.0.0/8`（A 類私有網路）
- `172.16.0.0/12`（B 類私有網路）
- `192.168.0.0/16`（C 類私有網路）
- `127.0.0.0/8`（迴環）
- `0.0.0.0/8`（當前網路）

**雲端 Metadata 服務：**
- `169.254.0.0/16`（Link-local，包含 AWS metadata 服務 169.254.169.254）

**保留範圍：**
- `224.0.0.0/4`（多播）

**被阻擋的主機：**
- `localhost`
- `0.0.0.0`

### 允許的協定

僅允許以下協定：
- `http://`
- `https://`

**被阻擋：** `file://`、`ftp://`、`gopher://` 等。

### 域名白名單（可選）

透過限制允許的域名增加額外防護層：

```env
# 僅特定域名
ALLOWED_DOMAINS=api.example.com,webhooks.example.com

# 萬用字元子域名
ALLOWED_DOMAINS=*.example.com,*.trusted-service.com

# 混合配置
ALLOWED_DOMAINS=api.example.com,*.internal-services.com,specific-partner.com
```

**萬用字元規則：**
- `*.example.com` 匹配：`api.example.com`、`app.example.com`、`staging.example.com`
- `*.example.com` 不匹配：`example.com`（需要時兩者都加入）
- 不支援 `*.*.example.com`（使用 `*.example.com` 匹配所有子域名）

**錯誤範例：**
```json
{
  "error": "Domain validation failed",
  "message": "Target domain 'untrusted.com' is not in the allowed domains list"
}
```

## API 認證

### 概述

API 認證為**可選**，為方便開發預設停用。

**何時啟用：**
- ✅ 生產環境部署
- ✅ 公開對外的代理
- ✅ 處理敏感數據時
- ❌ 本地開發（可選）

### 配置

在 `.env` 中設定 `API_KEYS` 以啟用：

```env
# 單一金鑰
API_KEYS=your-secure-random-key-here

# 多個金鑰（不同客戶端/服務）
API_KEYS=web-client-key,mobile-app-key,internal-service-key,admin-key
```

### 認證方式

#### 1. Bearer Token（推薦）

```bash
curl -H "Authorization: Bearer your-api-key" \
  https://your-proxy.com/api/users
```

**優點：**
- ✅ 業界標準
- ✅ 框架支援良好
- ✅ 安全（基於標頭）

#### 2. X-API-Key Header

```bash
curl -H "X-API-Key: your-api-key" \
  https://your-proxy.com/api/users
```

**使用時機：**
- 不支援 Bearer token 時
- 偏好自訂標頭時

#### 3. Query Parameter（不建議）

```bash
curl https://your-proxy.com/api/users?api_key=your-api-key
```

**警告：**
- ❌ 金鑰在 URL 中可見
- ❌ 記錄在伺服器存取日誌中
- ❌ 被瀏覽器/代理快取
- ❌ 分享在瀏覽器歷史記錄中

**僅用於：**
- 快速測試
- 非敏感端點
- 舊版相容性

### 公開端點

`/health` 端點**始終公開**，無需認證：

```bash
curl https://your-proxy.com/health
# ✅ 無需 API key 即可運作
```

### 最佳實踐

**金鑰產生：**
```bash
# 產生安全隨機金鑰（Linux/Mac）
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**金鑰管理：**
- ✅ 使用強隨機金鑰（至少 16 字元）
- ✅ 為不同客戶端使用不同金鑰
- ✅ 定期輪換金鑰（每 90 天）
- ✅ 將金鑰儲存在環境變數中，切勿寫在程式碼中
- ✅ 使用秘密管理工具（AWS Secrets Manager、HashiCorp Vault 等）
- ❌ 切勿將金鑰提交至版本控制
- ❌ 切勿在生產環境使用範例值
- ❌ 切勿透過電子郵件或聊天分享金鑰

## Token 遮罩

### 自動遮罩

GitHub tokens 和敏感資訊在日誌中自動遮罩：

**原始值：**
```env
GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz
```

**日誌中顯示為：**
```
token: "ghp_...wxyz"
```

### 被遮罩的內容

- GitHub Personal Access Tokens（`ghp_*`、`github_pat_*`）
- 顯示前 4 字元
- 顯示後 4 字元
- 中間替換為：`...`

**範例：**
```
ghp_1234567890abcdefghijklmnopqrst → ghp_...nopqrst
```

## 環境驗證

### 啟動驗證

Fast Relay 在啟動時驗證環境變數以防止常見的安全性錯誤。

**執行的檢查：**
- ✅ GitHub token 格式（必須以 `ghp_` 或 `github_pat_` 開頭）
- ✅ API key 強度（少於 16 字元時發出警告）
- ✅ 範例/佔位符值
- ✅ 所需變數存在

**範例值（生產環境拒絕）：**
- `your-*`（例如 `your-api-key`）
- `example*`（例如 `example-token`）
- `changeme`
- `your-secret-api-key`
- `test-key`
- `dev-key`

**錯誤範例：**
```
❌ 安全性錯誤：在生產環境使用範例/佔位符值
   - API_KEYS 包含 'your-secure-api-key-here'
   - 請產生強隨機金鑰

   使用以下指令產生安全金鑰：
   openssl rand -base64 32
```

### 開發環境 vs. 生產環境

**開發環境（`NODE_ENV=development`）：**
- ⚠️  僅警告（不會失敗）
- 允許短金鑰用於測試
- 詳細錯誤訊息

**生產環境（`NODE_ENV=production`）：**
- ❌ 遇到安全性問題時啟動失敗
- 需要強金鑰
- 嚴格驗證

## 速率限制

### 配置

保護您的代理免受濫用：

```env
# 允許每個 IP 每分鐘 100 次請求
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
```

### 運作方式

- 追蹤每個 IP 位址的請求
- 超過限制時返回 `429 Too Many Requests`
- 時間窗口後重置

**達到速率限制時的回應：**
```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded, retry in 45 seconds"
}
```

### 建議

**依使用場景：**
```env
# 公開 API（嚴格）
RATE_LIMIT_MAX=50
RATE_LIMIT_WINDOW=1 minute

# 已認證 API（中等）
RATE_LIMIT_MAX=200
RATE_LIMIT_WINDOW=1 minute

# 內部服務（寬鬆）
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=1 minute

# Webhook 端點（非常寬鬆）
RATE_LIMIT_MAX=10000
RATE_LIMIT_WINDOW=1 hour
```

## CORS（跨來源資源共享）

### 配置

控制哪些來源可以存取您的代理：

```env
# 單一來源
CORS_ORIGINS=https://app.example.com

# 多個來源
CORS_ORIGINS=https://app.example.com,https://admin.example.com,https://mobile.example.com

# 開發環境
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080
```

### 預設停用

如果未設定 `CORS_ORIGINS`，CORS 完全停用：
- ✅ 配置更簡單
- ✅ 沒有預檢請求
- ❌ 僅適用於同源或伺服器對伺服器

### 何時啟用

在以下情況啟用 CORS：
- 前端應用程式在不同域名上
- 行動應用程式直接呼叫 API
- 第三方整合

## 安全性檢查清單

### 部署前

- [ ] 產生強隨機 API keys
- [ ] 設定 `NODE_ENV=production`
- [ ] 配置 `ALLOWED_DOMAINS` 白名單
- [ ] 使用 `API_KEYS` 啟用 API 認證
- [ ] 設定適當的速率限制
- [ ] 檢視所有路由目標的安全性
- [ ] 使用私密 Gist 和 GitHub token（而非公開 URL）
- [ ] 測試認證和授權
- [ ] 驗證 SSRF 防護
- [ ] 檢查日誌是否有敏感數據洩漏

### 部署後

- [ ] 監控速率限制指標
- [ ] 設定安全事件警報
- [ ] 定期輪換 API keys
- [ ] 檢視存取日誌
- [ ] 更新依賴套件
- [ ] 測試容錯情境
- [ ] 記錄安全性程序
- [ ] 培訓團隊安全性實踐

### 持續維護

- [ ] 每 90 天輪換 API keys
- [ ] 在過期前更新 GitHub tokens
- [ ] 檢視並更新 `ALLOWED_DOMAINS`
- [ ] 監控異常流量模式
- [ ] 保持 Fast Relay 更新
- [ ] 審查路由配置
- [ ] 每月檢視安全性日誌

## 安全事件應對

### 如果 API Key 被洩露

1. **立即：**
   - 從 `API_KEYS` 移除被洩露的金鑰
   - 部署更新的配置
   - 監控未經授權的存取

2. **短期：**
   - 產生新金鑰
   - 更新所有客戶端
   - 檢視存取日誌

3. **長期：**
   - 實施金鑰輪換政策
   - 新增監控/警報
   - 記錄事件

### 如果 Token 洩漏

1. **立即：**
   - 在 https://github.com/settings/tokens 撤銷 GitHub token
   - 產生新 token
   - 更新 `.env` 中的 `GITHUB_TOKEN`
   - 重新部署

2. **調查：**
   - 檢查 token 在哪裡被暴露
   - 檢視 Git 歷史
   - 檢查日誌和監控

3. **預防：**
   - 切勿將 `.env` 提交至 Git
   - 使用秘密管理工具
   - 實施 pre-commit hooks

## 額外資源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP SSRF 防護](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [API 安全性最佳實踐](https://owasp.org/www-project-api-security/)
- [GitHub Token 安全性](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure)

## 相關文件

- [環境變數](ENVIRONMENT.zh-TW.md) - 安全性相關環境變數
- [配置指南](CONFIGURATION.zh-TW.md) - 路由配置安全性
- [使用範例](EXAMPLES.zh-TW.md) - 安全配置範例
