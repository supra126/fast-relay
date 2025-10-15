# 設定精靈指南

Fast Relay 包含互動式設定精靈，幫助您快速且輕鬆地配置 GitHub Gist 整合。

## 快速開始

使用以下命令之一執行設定精靈：

```bash
# 自動偵測系統語言
yarn setup

# 強制使用英文介面
yarn setup:en

# 強制使用繁體中文介面
yarn setup:zh-TW
```

## 配置方式

設定精靈支援三種配置方式：

### 1. 公開 Gist（建議用於測試）

**最適合：** 開發、測試，或不需要保持路由私密的情境。

**優點：**
- ✅ 無需 GitHub token
- ✅ 快速簡單的設定
- ✅ 易於分享配置

**步驟：**
1. 執行 `yarn setup` 並選擇「公開 Gist」
2. 精靈會在瀏覽器開啟 https://gist.github.com/
3. 建立新的 Gist：
   - 檔案名稱：`routes.json`
   - 內容：您的路由配置（參考 [routes.example.json](../routes.example.json)）
   - 可見度：選擇「Create secret gist」或「Create public gist」
4. 點擊「Raw」按鈕並複製 URL
5. 將 URL 貼到精靈中
6. 精靈會驗證您的 Gist 並儲存配置

**產生的 `.env` 配置：**
```env
GIST_URL=https://gist.githubusercontent.com/username/hash/raw/...
```

---

### 2. 私密 Gist（建議用於正式環境）

**最適合：** 需要保持路由私密的正式環境。

**優點：**
- ✅ 私密且安全
- ✅ 透過 GitHub token 控制存取
- ✅ 適合正式環境使用

**步驟：**

#### 步驟 1：生成 GitHub Token
1. 執行 `yarn setup` 並選擇「私密 Gist」
2. 精靈會開啟 https://github.com/settings/tokens/new
3. 配置您的 token：
   - 描述：`Fast Relay - Production`
   - 到期時間：根據您的安全需求選擇
   - 權限範圍：**只勾選** `gist` ✓
4. 點擊「Generate token」
5. 複製生成的 token（以 `ghp_` 或 `github_pat_` 開頭）
6. 將它貼到精靈中

#### 步驟 2：建立私密 Gist
1. 精靈會驗證您的 token
2. 接著會開啟 https://gist.github.com/
3. 建立新的 Gist：
   - 檔案名稱：`routes.json`
   - 內容：您的路由配置
   - 可見度：選擇「Create secret gist」
4. 從 URL 複製 Gist ID
   - URL 格式：`https://gist.github.com/username/<GIST_ID>`
   - 範例：如果 URL 是 `https://gist.github.com/john/abc123def456`，Gist ID 就是 `abc123def456`
5. 將 Gist ID 貼到精靈中
6. 精靈會驗證 Gist 並儲存配置

**產生的 `.env` 配置：**
```env
GIST_ID=your_gist_id_here
GITHUB_TOKEN=ghp_your_token_here
```

---

### 3. 本地配置

**最適合：** 完全不想使用 GitHub Gist 的情況。

**優點：**
- ✅ 不需要 GitHub 帳號
- ✅ 完全本地控制
- ✅ 無外部依賴

**步驟：**
1. 執行 `yarn setup` 並選擇「本地配置」
2. 編輯專案根目錄的 `routes.json` 檔案
3. 使用 `yarn dev` 或 `yarn start` 啟動伺服器

**注意：** 使用本地配置時，更新路由後需要手動重啟伺服器。

---

## 配置檔案

精靈會自動生成包含適當設定的 `.env` 檔案：

```env
# GitHub Gist 配置
GIST_URL=...              # 用於公開 Gist
# 或
GIST_ID=...               # 用於私密 Gist
GITHUB_TOKEN=...          # 用於私密 Gist

# 同步設定
GIST_SYNC_INTERVAL=300    # 每 5 分鐘檢查更新
GIST_AUTO_RESTART=true    # 路由變更時自動重啟
GIST_FETCH_TIMEOUT=10000  # 10 秒後超時

# 伺服器配置
PORT=8080
HOST=0.0.0.0
NODE_ENV=development
BODY_LIMIT=1048576

# 效能與安全
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
```

---

## 驗證流程

精靈會執行自動驗證：

### 公開 Gist：
1. ✅ 驗證 URL 格式
2. ✅ 取得 Gist 內容
3. ✅ 驗證 `routes.json` 是有效的 JSON
4. ✅ 計算路由數量

### 私密 Gist：
1. ✅ 驗證 token 格式
2. ✅ 透過 GitHub API 驗證 token
3. ✅ 驗證 Gist ID
4. ✅ 檢查 Gist 中是否存在 `routes.json` 檔案
5. ✅ 驗證 JSON 格式
6. ✅ 計算路由數量

---

## 設定完成後

精靈完成後，您會看到摘要和下一步指示：

```
📊 配置摘要：
  方式: private
  Gist ID: abc123def456
  GitHub Token: ghp_***...****
  路由數量: 5

✅ 配置已儲存至 .env

📝 下一步：
  1. 檢查您的 .env 檔案
  2. 啟動開發：yarn dev
  3. 或部署至 Railway
```

### 啟動伺服器

```bash
# 開發模式（支援熱重載）
yarn dev

# 正式環境模式
yarn build
yarn start:prod
```

---

## 疑難排解

### 問題：「在 Gist 中找不到 routes.json 檔案」

**解決方案：** 確保您的 Gist 檔案名稱正確為 `routes.json`（區分大小寫）。

### 問題：「Token 驗證失敗」

**可能原因：**
- Token 格式不正確（應該以 `ghp_` 或 `github_pat_` 開頭）
- Token 已過期
- Token 沒有 `gist` 權限範圍

**解決方案：** 使用正確的權限範圍生成新的 token。

### 問題：「無法取得 Gist 配置」

**可能原因：**
- Gist ID 不正確
- Gist 是私密的但未提供 token
- 網路連線問題

**解決方案：** 再次確認您的 Gist ID，並確保 token 有存取權限。

### 問題：「.env 檔案已存在」

精靈會詢問您是否要覆蓋現有的 `.env` 檔案。選擇：
- **是** - 用新配置取代
- **否** - 保留現有配置並退出

---

## 重新執行精靈

您可以隨時再次執行設定精靈：

```bash
yarn setup
```

以下情況很有用：
- 從公開 Gist 改為私密 Gist（或相反）
- 更新 GitHub token
- 切換到不同的 Gist
- 排除配置問題

---

## 手動配置

如果您偏好不使用精靈而手動配置，請參閱：
- [GIST_SETUP.zh-TW.md](./GIST_SETUP.zh-TW.md) - 詳細的手動設定指南

---

## 下一步

- [了解路由配置](../routes.example.json)
- [進階配置](./GIST_SETUP.zh-TW.md)

---

## 需要協助？

如果您遇到此處未涵蓋的問題：
1. 查看上方的[疑難排解](#疑難排解)章節
2. 檢閱 [GIST_SETUP.zh-TW.md](./GIST_SETUP.zh-TW.md) 以獲取更多詳情
3. 在 [GitHub](https://github.com/supra126/fast-relay/issues) 上開啟 issue
