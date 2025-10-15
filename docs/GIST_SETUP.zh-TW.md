# GitHub Gist 配置設定指南

本指南將引導您在 Fast Relay 中設定 GitHub Gist 以實現動態路由配置。

## 為什麼使用 GitHub Gist？

- ✅ **無需重新部署** - 更新路由無需重新部署應用程式
- ✅ **版本控制** - 自動記錄所有配置變更歷史
- ✅ **簡單編輯** - 直接在 GitHub 瀏覽器中編輯
- ✅ **多實例同步** - 在多個部署間共享配置
- ✅ **免費** - 公開和私密 Gist 都是免費的

## 目錄

1. [快速設定（公開 Gist）](#快速設定公開-gist)
2. [安全設定（私密 Gist）](#安全設定私密-gist)
3. [Railway 配置](#railway-配置)
4. [測試您的設定](#測試您的設定)
5. [疑難排解](#疑難排解)

---

## 快速設定（公開 Gist）

適用於：非敏感配置、示範專案、公開 API

### 步驟 1：建立 Gist

1. 前往 https://gist.github.com/
2. 登入您的 GitHub 帳號
3. 點擊「New gist」按鈕

### 步驟 2：新增您的配置

1. 將檔案名稱設為 `routes.json`
2. 貼上您的路由配置：

```json
{
  "$schema": "./routes.schema.json",
  "routes": [
    {
      "source": "/api/v1/*",
      "target": "https://users-api.example.com/api",
      "pathMode": "append",
      "description": "主要 API 路由"
    }
  ]
}
```

3. 選擇「Create secret gist」（建議）或「Create public gist」

> **注意：**「Secret」gist 是未列出的，但並未加密。任何擁有 URL 的人都可以查看。

### 步驟 3：取得 Raw URL

1. 點擊「Raw」按鈕（檔案內容右上方）
2. 從瀏覽器的網址列複製完整 URL

   格式應類似：
   ```
   https://gist.githubusercontent.com/username/abc123def456.../raw/routes.json
   ```

### 步驟 4：配置 Railway

1. 前往您的 Railway 專案
2. 導航至 **Variables** 標籤
3. 新增以下變數：

   ```env
   GIST_URL=https://gist.githubusercontent.com/your-username/your-gist-id/raw/routes.json
   GIST_SYNC_INTERVAL=300
   GIST_AUTO_RESTART=true
   ```

4. 您的應用程式將自動重啟並載入配置

### 步驟 5：測試配置

1. 對您的代理發出測試請求：
   ```bash
   curl https://your-app.railway.app/api/v1/test
   ```

2. 檢查日誌以確認配置已載入：
   ```
   [INFO] 🔄 Fetching config from Gist Raw URL
   [INFO] ✅ Gist config fetched successfully (Raw URL)
   [INFO] 💾 Configuration saved to local file
   ```

### 步驟 6：更新您的配置

1. 返回 GitHub 上的 Gist
2. 點擊「Edit」按鈕
3. 進行您的變更
4. 點擊「Update secret gist」
5. 等待 5 分鐘（或您配置的間隔時間）
6. 您的應用程式將自動使用新配置重啟！✨

---

## 安全設定（私密 Gist）

適用於：生產環境、敏感 URL、內部服務

### 步驟 1：建立 Personal Access Token

1. 前往 https://github.com/settings/tokens
2. 點擊「Generate new token」→「Generate new token (classic)」
3. 給它一個描述性名稱：例如「Fast Relay - Production」
4. 選擇到期時間：根據您的安全需求選擇
5. 選擇權限範圍：**僅勾選 `gist`**（讀寫 gist）
6. 點擊「Generate token」
7. **重要：** 立即複製 token（不會再次顯示！）

   格式：`ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 步驟 2：建立私密 Gist

1. 前往 https://gist.github.com/
2. 建立您的 `routes.json` 檔案（與公開設定相同）
3. 選擇「Create secret gist」
4. 建立後，從 URL 複製 Gist ID

   從：`https://gist.github.com/username/abc123def456...`

   複製：`abc123def456...`（用戶名稱後的部分）

### 步驟 3：配置 Railway（私密）

1. 前往您的 Railway 專案
2. 導航至 **Variables** 標籤
3. 新增以下變數：

   ```env
   GIST_ID=your-gist-id
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   GIST_SYNC_INTERVAL=300
   GIST_AUTO_RESTART=true
   ```

4. 您的應用程式將自動重啟

### 步驟 4：驗證私密存取

檢查您的日誌中是否有：
```
[INFO] 🔄 Fetching config from GitHub API
[INFO] ✅ Gist config fetched successfully (GitHub API)
```

---

## Railway 配置

### 環境變數參考

| 變數 | 是否必要 | 預設值 | 說明 |
|------|----------|--------|------|
| `GIST_URL` | ✅ (公開) | - | 公開 Gist 的 Raw URL |
| `GIST_ID` | ✅ (私密) | - | 私密 Gist 的 Gist ID |
| `GITHUB_TOKEN` | ✅ (私密) | - | Personal Access Token（權限範圍：gist） |
| `GIST_SYNC_INTERVAL` | ❌ | `300` | 同步間隔（秒，設為 0 停用） |
| `GIST_AUTO_RESTART` | ❌ | `true` | 配置變更時自動重啟 |

### 配置行為

**當 GIST_AUTO_RESTART=true（預設）：**
- 應用程式每 N 秒檢查 Gist（預設：300 秒 / 5 分鐘）
- 如果配置已變更 → 儲存新配置 → 優雅關閉
- Railway 自動重啟應用程式
- 載入新配置

**當 GIST_AUTO_RESTART=false：**
- 應用程式每 N 秒檢查 Gist
- 如果配置已變更 → 儲存新配置 → 記錄警告
- 需要手動重啟才能使變更生效

### 多實例部署

您可以使用相同的 Gist 部署多個實例：

```
實例 A（生產環境）    ┐
實例 B（測試環境）    ├─→ 相同的 GIST_URL
實例 C（開發環境）    ┘
```

所有實例將自動同步到相同的配置。

---

## 測試您的設定

### 1. 驗證配置載入

檢查您的應用程式日誌：

```
[INFO] 🔄 Gist sync enabled, initializing configuration...
[INFO] 🔄 Fetching config from Gist Raw URL
[INFO] ✅ Gist config fetched successfully (Raw URL)
[INFO] 💾 Configuration saved to local file
[INFO] ✅ Gist configuration initialization complete
[INFO] 🎯 Route mappings:
[INFO]    /api/v1/* → https://users-api.example.com/api [append]
[INFO] 🚀 Proxy server started successfully!
[INFO] 🔄 Starting Gist configuration sync {"intervalSeconds":300,"autoRestart":true}
```

### 2. 測試路由轉發

```bash
# 測試 API 路由
curl https://your-app.railway.app/api/v1/test

# 檢查健康端點
curl https://your-app.railway.app/health
```

### 3. 測試配置更新

1. 在 GitHub 上編輯您的 Gist
2. 新增註解或變更路由
3. 儲存 Gist
4. 觀察您的 Railway 日誌：

```
[INFO] 🔄 Detected Gist configuration change!
[INFO] 💾 Configuration saved to local file
[INFO] 🔄 Configuration updated, triggering app restart...
```

5. 重啟後，驗證新配置已載入

---

## 疑難排解

### ❌ 「Failed to fetch Gist config」

**可能原因：**
- 無效的 GIST_URL 或 GIST_ID
- 網路連線問題
- 速率限制（公開 Gist）

**解決方案：**
1. 驗證您的 GIST_URL 是「Raw」URL
2. 檢查 Gist 是否可存取（嘗試在瀏覽器中開啟 URL）
3. 對於速率限制，使用帶有 token 的私密 Gist

### ❌ 「routes.json file not found in Gist」

**原因：** Gist 不包含名為 `routes.json` 的檔案

**解決方案：**
1. 在 GitHub 上開啟您的 Gist
2. 確保檔案名稱正確為 `routes.json`（區分大小寫）
3. 如果您重新命名了它，更新檔案並儲存

### ❌ 「Invalid Gist configuration format」

**原因：** JSON 語法錯誤或無效的路由配置

**解決方案：**
1. 驗證您的 JSON：https://jsonlint.com/
2. 對照 `routes.schema.json` 中的結構檢查
3. 常見問題：
   - 缺少必要欄位（`source`、`target`）
   - 無效的 `pathMode` 值（必須是「append」或「query」）
   - 無效的 `responseMode` 值（必須是「proxy」或「custom」）
   - `responseMode: "custom"` 時缺少 `customResponse`

### ❌ 「HTTP 401」或「HTTP 403」錯誤

**原因：** 無效或過期的 GitHub token

**解決方案：**
1. 驗證您的 token 具有 `gist` 權限範圍
2. 檢查 token 是否已過期
3. 生成新 token 並更新 `GITHUB_TOKEN`

### ⚠️ 配置未更新

**可能原因：**
1. `GIST_AUTO_RESTART=false`（需要手動重啟）
2. 配置未變更（JSON 相同）
3. 同步間隔尚未經過

**解決方案：**
1. 檢查 `GIST_AUTO_RESTART` 設定
2. 對配置進行有意義的變更
3. 等待同步間隔完成
4. 檢查日誌中的同步嘗試

### 🔍 除錯

透過檢查 Railway 日誌啟用詳細日誌記錄：

```bash
# 查看即時日誌
railway logs

# 或在 Railway 控制台：Deployments → Your Deployment → Logs
```

尋找：
- 配置獲取嘗試
- 驗證錯誤
- 同步間隔日誌
- 重啟觸發

---

## 最佳實踐

### 1. 使用描述性名稱

```json
{
  "routes": [
    {
      "source": "/api/v1/*",
      "target": "https://users-api.example.com/api",
      "description": "生產環境 API v1 - 所有端點" ← 很有幫助！
    }
  ]
}
```

### 2. 先在本地測試變更

```bash
# 在本地複製您的 Gist
git clone https://gist.github.com/username/gist-id.git

# 編輯 routes.json
vim routes.json

# 驗證 JSON
cat routes.json | jq .

# 準備好後推送
git add routes.json
git commit -m "Add new webhook route"
git push
```

### 3. 保留備份

```bash
# 下載您目前的配置
curl https://gist.githubusercontent.com/.../raw/routes.json > routes.backup.json
```

### 4. 使用版本控制

Gist 會自動追蹤所有變更。查看歷史記錄：
1. 在 GitHub 上開啟您的 Gist
2. 點擊「Revisions」（右上方）
3. 查看所有帶時間戳記的變更

### 5. 設定合理的同步間隔

```env
# 開發環境：快速更新
GIST_SYNC_INTERVAL=60

# 生產環境：平衡（預設）
GIST_SYNC_INTERVAL=300

# 穩定生產環境：較慢更新（每週變更）
GIST_SYNC_INTERVAL=1800
```

---

## 安全性考量

### 公開 Gist

- ✅ 適用於：非敏感配置、示範專案
- ❌ 不適用於：內部 URL、API 金鑰、敏感端點
- 注意：「Secret」gist 只是未列出，並非加密

### 私密 Gist + Token

- ✅ 適用於：生產環境、內部服務、敏感 URL
- ⚠️ 保持 token 安全：僅儲存在 Railway 環境變數中
- 🔒 Token 權限：僅授予 `gist` 權限範圍（無儲存庫存取）

### Railway 環境變數

Railway 環境變數：
- ✅ 靜態加密
- ✅ 不會在日誌中顯示
- ✅ 僅您的專案可存取

---

## 進階配置

### 多環境

為不同環境使用不同的 Gist：

**Gist 結構：**
- `routes-production.json`
- `routes-staging.json`
- `routes-development.json`

**Railway 設定：**
```env
# 生產環境
GIST_URL=https://gist.githubusercontent.com/.../routes-production.json

# 測試環境
GIST_URL=https://gist.githubusercontent.com/.../routes-staging.json
```

### 條件路由

使用 Gist 分支或多個檔案：

```json
// routes-main.json
{
  "routes": [
    {
      "source": "/api/v1/*",
      "target": "https://users-api.example.com/api"
    }
  ]
}

// routes-beta.json
{
  "routes": [
    {
      "source": "/api/v1/*",
      "target": "https://beta-api.example.com/api"
    }
  ]
}
```

透過更新 `GIST_URL` 環境變數來切換。

---

## 需要協助？

- 📖 [主要文件](../README.zh-TW.md)
- 🐛 [回報問題](https://github.com/supra126/fast-relay/issues)
- 💡 [請求功能](https://github.com/supra126/fast-relay/issues)
- 📧 [聯絡支援](mailto:supra126@gmail.com)

---

**祝您路由愉快！🚀**
