#!/usr/bin/env node
/**
 * Fast Relay Setup Wizard
 * Interactive setup tool for GitHub Gist configuration
 *
 * Supports both English and Traditional Chinese
 */

import { input, select, confirm, password } from '@inquirer/prompts'
import chalk from 'chalk'
import open from 'open'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// ==================== i18n Messages ====================

const messages = {
  'en': {
    title: '🚀 Fast Relay Setup Wizard',
    selectLanguage: 'Select your language / 選擇語言',

    // Menu
    selectMethod: 'Choose Gist configuration method:',
    methodPublic: 'Public Gist (Simple, no token needed)',
    methodPrivate: 'Private Gist (Secure, requires token)',
    methodLocal: 'Local configuration (No Gist)',

    // Public Gist
    publicStep1: '📋 Step 1: Create a Public Gist',
    publicInstructions: [
      '1. Click "New gist" button',
      '2. Filename: routes.json',
      '3. Paste your route configuration',
      '4. Choose "Create secret gist" or "Create public gist"',
      '5. Click "Raw" button and copy the URL'
    ],
    openBrowser: 'Opening GitHub Gist page...',
    ready: 'Ready to continue?',
    enterGistUrl: 'Paste your Gist Raw URL:',
    invalidUrl: 'Invalid URL format. Should start with https://gist.githubusercontent.com/',

    // Private Gist
    privateStep1: '📋 Step 1: Generate GitHub Token',
    privateInstructions: [
      '1. Click "Generate new token (classic)"',
      '2. Description: Fast Relay - Production',
      '3. Expiration: Choose based on your needs',
      '4. Scope: Check ONLY "gist" ✓',
      '5. Click "Generate token"',
      '6. Copy the generated token'
    ],
    privateStep2: '📋 Step 2: Create Private Gist',
    privateGistInstructions: [
      '1. Create a new Gist',
      '2. Filename: routes.json',
      '3. Paste your route configuration',
      '4. Choose "Create secret gist"',
      '5. Copy the Gist ID from URL'
    ],
    enterToken: 'Paste your GitHub Token:',
    enterGistId: 'Paste your Gist ID:',
    invalidToken: 'Token format may be incorrect (should start with ghp_ or github_pat_)',
    emptyValue: 'This field is required',

    // Verification
    verifying: '🔍 Verifying configuration...',
    verifyingToken: '🔍 Verifying token...',
    verifyingGist: '🔍 Verifying Gist...',
    tokenValid: '✅ Token is valid!',
    tokenInvalid: '❌ Token verification failed',
    gistValid: '✅ Gist configuration is valid!',
    gistInvalid: '❌ Failed to fetch Gist configuration',
    routesFound: '✅ Found routes.json with {count} route(s)',
    routesNotFound: '❌ routes.json file not found in Gist',

    // Save configuration
    saveToEnv: 'Save to .env file?',
    envSaved: '✅ Configuration saved to .env',
    envExists: '⚠️  .env file already exists',
    overwrite: 'Overwrite existing .env file?',

    // Summary
    summary: '\n📊 Configuration Summary:',
    method: 'Method',
    gistUrl: 'Gist URL',
    gistId: 'Gist ID',
    token: 'GitHub Token',
    routeCount: 'Routes',

    // Next steps
    nextSteps: '\n📝 Next Steps:',
    nextStep1: '1. Review your .env file',
    nextStep2: '2. Start development: yarn dev',
    nextStep3: '3. Or deploy to Railway',

    // Local mode
    localMode: '📁 Local Configuration Mode',
    localInstructions: [
      'Using local routes.json file.',
      'No GitHub Gist configuration needed.',
      '',
      'Edit routes.json to configure your routes.'
    ],

    // Errors
    error: '❌ Error:',
    tryAgain: 'Please try again',

    // Complete
    complete: '✨ Setup Complete!',
    exitMessage: 'You can run this wizard again anytime with: yarn setup'
  },

  'zh-TW': {
    title: '🚀 Fast Relay 設定精靈',
    selectLanguage: '選擇語言 / Select your language',

    // Menu
    selectMethod: '選擇 Gist 配置方式：',
    methodPublic: '公開 Gist（簡單，不需要 token）',
    methodPrivate: '私密 Gist（安全，需要 token）',
    methodLocal: '本地配置（不使用 Gist）',

    // Public Gist
    publicStep1: '📋 步驟 1：建立公開 Gist',
    publicInstructions: [
      '1. 點擊「New gist」按鈕',
      '2. 檔案名稱：routes.json',
      '3. 貼上您的路由配置',
      '4. 選擇「Create secret gist」或「Create public gist」',
      '5. 點擊「Raw」按鈕並複製 URL'
    ],
    openBrowser: '正在開啟 GitHub Gist 頁面...',
    ready: '準備好繼續了嗎？',
    enterGistUrl: '貼上您的 Gist Raw URL：',
    invalidUrl: 'URL 格式無效。應該以 https://gist.githubusercontent.com/ 開頭',

    // Private Gist
    privateStep1: '📋 步驟 1：生成 GitHub Token',
    privateInstructions: [
      '1. 點擊「Generate new token (classic)」',
      '2. 描述：Fast Relay - Production',
      '3. 到期時間：根據您的需求選擇',
      '4. 權限範圍：只勾選「gist」✓',
      '5. 點擊「Generate token」',
      '6. 複製生成的 token'
    ],
    privateStep2: '📋 步驟 2：建立私密 Gist',
    privateGistInstructions: [
      '1. 建立新的 Gist',
      '2. 檔案名稱：routes.json',
      '3. 貼上您的路由配置',
      '4. 選擇「Create secret gist」',
      '5. 從 URL 複製 Gist ID'
    ],
    enterToken: '貼上您的 GitHub Token：',
    enterGistId: '貼上您的 Gist ID：',
    invalidToken: 'Token 格式可能不正確（應該以 ghp_ 或 github_pat_ 開頭）',
    emptyValue: '此欄位為必填',

    // Verification
    verifying: '🔍 驗證配置中...',
    verifyingToken: '🔍 驗證 token 中...',
    verifyingGist: '🔍 驗證 Gist 中...',
    tokenValid: '✅ Token 有效！',
    tokenInvalid: '❌ Token 驗證失敗',
    gistValid: '✅ Gist 配置有效！',
    gistInvalid: '❌ 無法獲取 Gist 配置',
    routesFound: '✅ 找到 routes.json，包含 {count} 個路由',
    routesNotFound: '❌ 在 Gist 中找不到 routes.json 檔案',

    // Save configuration
    saveToEnv: '儲存到 .env 檔案？',
    envSaved: '✅ 配置已儲存至 .env',
    envExists: '⚠️  .env 檔案已存在',
    overwrite: '覆蓋現有的 .env 檔案？',

    // Summary
    summary: '\n📊 配置摘要：',
    method: '方式',
    gistUrl: 'Gist URL',
    gistId: 'Gist ID',
    token: 'GitHub Token',
    routeCount: '路由數量',

    // Next steps
    nextSteps: '\n📝 下一步：',
    nextStep1: '1. 檢查您的 .env 檔案',
    nextStep2: '2. 啟動開發：yarn dev',
    nextStep3: '3. 或部署至 Railway',

    // Local mode
    localMode: '📁 本地配置模式',
    localInstructions: [
      '使用本地 routes.json 檔案。',
      '不需要 GitHub Gist 配置。',
      '',
      '編輯 routes.json 來配置您的路由。'
    ],

    // Errors
    error: '❌ 錯誤：',
    tryAgain: '請重試',

    // Complete
    complete: '✨ 設定完成！',
    exitMessage: '您可以隨時使用此命令再次執行精靈：yarn setup'
  }
}

// ==================== Helper Functions ====================

function t(lang, key, replacements = {}) {
  let message = messages[lang][key] || key
  Object.keys(replacements).forEach(k => {
    message = message.replace(`{${k}}`, replacements[k])
  })
  return message
}

async function verifyToken(token) {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'fast-relay-setup'
      }
    })
    return response.ok
  } catch (error) {
    return false
  }
}

async function verifyGist(gistId, token) {
  try {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': token ? `token ${token}` : undefined,
        'User-Agent': 'fast-relay-setup'
      }
    })

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch Gist' }
    }

    const data = await response.json()

    if (!data.files['routes.json']) {
      return { success: false, error: 'routes.json not found' }
    }

    const routesFile = data.files['routes.json']
    const config = JSON.parse(routesFile.content)

    return {
      success: true,
      routeCount: config.routes?.length || 0,
      config
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function verifyGistUrl(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return { success: false, error: 'Failed to fetch Gist' }
    }
    const content = await response.text()
    const config = JSON.parse(content)
    return {
      success: true,
      routeCount: config.routes?.length || 0,
      config
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

function saveToEnvFile(config, lang) {
  const envPath = resolve(process.cwd(), '.env')
  let envContent = ''

  if (config.method === 'public') {
    envContent = `# Fast Relay Configuration
# Generated by setup wizard

# GitHub Gist Configuration (Public Gist)
GIST_URL=${config.gistUrl}
GIST_SYNC_INTERVAL=300
GIST_AUTO_RESTART=true
GIST_FETCH_TIMEOUT=10000

# Server Configuration
PORT=8080
HOST=0.0.0.0
NODE_ENV=development
BODY_LIMIT=1048576

# Performance & Security
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
`
  } else if (config.method === 'private') {
    envContent = `# Fast Relay Configuration
# Generated by setup wizard

# GitHub Gist Configuration (Private Gist)
GIST_ID=${config.gistId}
GITHUB_TOKEN=${config.token}
GIST_SYNC_INTERVAL=300
GIST_AUTO_RESTART=true
GIST_FETCH_TIMEOUT=10000

# Server Configuration
PORT=8080
HOST=0.0.0.0
NODE_ENV=development
BODY_LIMIT=1048576

# Performance & Security
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
`
  }

  writeFileSync(envPath, envContent, 'utf-8')
}

// ==================== Main Wizard ====================

async function main() {
  console.clear()

  // Detect system language
  const systemLang = process.env.LANG?.includes('zh') || process.env.LANGUAGE?.includes('zh') ? 'zh-TW' : 'en'

  // Check for --lang argument
  const langArg = process.argv.find(arg => arg.startsWith('--lang='))
  let lang = langArg ? langArg.split('=')[1] : null

  // Ask for language if not specified
  if (!lang || !messages[lang]) {
    lang = await select({
      message: messages['en'].selectLanguage,
      choices: [
        { name: 'English', value: 'en' },
        { name: '繁體中文', value: 'zh-TW' }
      ],
      default: systemLang
    })
  }

  console.clear()
  console.log(chalk.blue.bold(t(lang, 'title')))
  console.log()

  // Select configuration method
  const method = await select({
    message: t(lang, 'selectMethod'),
    choices: [
      { name: t(lang, 'methodPublic'), value: 'public' },
      { name: t(lang, 'methodPrivate'), value: 'private' },
      { name: t(lang, 'methodLocal'), value: 'local' }
    ]
  })

  if (method === 'local') {
    console.log()
    console.log(chalk.yellow(t(lang, 'localMode')))
    console.log()
    t(lang, 'localInstructions').forEach(line => console.log(line))
    console.log()
    console.log(chalk.green(t(lang, 'complete')))
    console.log(chalk.dim(t(lang, 'exitMessage')))
    return
  }

  let config = { method }

  // ==================== Public Gist Setup ====================
  if (method === 'public') {
    console.log()
    console.log(chalk.yellow(t(lang, 'publicStep1')))
    console.log()
    t(lang, 'publicInstructions').forEach(line => console.log(line))
    console.log()
    console.log(t(lang, 'openBrowser'))

    await confirm({
      message: t(lang, 'ready'),
      default: true
    })

    await open('https://gist.github.com/')

    const gistUrl = await input({
      message: t(lang, 'enterGistUrl'),
      validate: (value) => {
        if (!value) return t(lang, 'emptyValue')
        if (!value.startsWith('https://gist.githubusercontent.com/')) {
          return t(lang, 'invalidUrl')
        }
        return true
      }
    })

    config.gistUrl = gistUrl

    // Verify Gist URL
    console.log()
    console.log(t(lang, 'verifyingGist'))
    const result = await verifyGistUrl(gistUrl)

    if (!result.success) {
      console.log(chalk.red(t(lang, 'gistInvalid')))
      console.log(chalk.red(`${t(lang, 'error')} ${result.error}`))
      process.exit(1)
    }

    console.log(chalk.green(t(lang, 'gistValid')))
    console.log(chalk.green(t(lang, 'routesFound', { count: result.routeCount })))
    config.routeCount = result.routeCount
  }

  // ==================== Private Gist Setup ====================
  if (method === 'private') {
    // Step 1: Get GitHub Token
    console.log()
    console.log(chalk.yellow(t(lang, 'privateStep1')))
    console.log()
    t(lang, 'privateInstructions').forEach(line => console.log(line))
    console.log()
    console.log(t(lang, 'openBrowser'))

    await confirm({
      message: t(lang, 'ready'),
      default: true
    })

    await open('https://github.com/settings/tokens/new?scopes=gist&description=Fast%20Relay')

    const token = await password({
      message: t(lang, 'enterToken'),
      mask: '*',
      validate: (value) => {
        if (!value) return t(lang, 'emptyValue')
        if (!value.startsWith('ghp_') && !value.startsWith('github_pat_')) {
          return t(lang, 'invalidToken')
        }
        return true
      }
    })

    config.token = token

    // Verify token
    console.log()
    console.log(t(lang, 'verifyingToken'))
    const tokenValid = await verifyToken(token)

    if (!tokenValid) {
      console.log(chalk.red(t(lang, 'tokenInvalid')))
      process.exit(1)
    }

    console.log(chalk.green(t(lang, 'tokenValid')))

    // Step 2: Get Gist ID
    console.log()
    console.log(chalk.yellow(t(lang, 'privateStep2')))
    console.log()
    t(lang, 'privateGistInstructions').forEach(line => console.log(line))
    console.log()

    await confirm({
      message: t(lang, 'ready'),
      default: true
    })

    await open('https://gist.github.com/')

    const gistId = await input({
      message: t(lang, 'enterGistId'),
      validate: (value) => {
        if (!value) return t(lang, 'emptyValue')
        return true
      }
    })

    config.gistId = gistId

    // Verify Gist
    console.log()
    console.log(t(lang, 'verifyingGist'))
    const result = await verifyGist(gistId, token)

    if (!result.success) {
      console.log(chalk.red(t(lang, 'gistInvalid')))
      if (result.error === 'routes.json not found') {
        console.log(chalk.red(t(lang, 'routesNotFound')))
      } else {
        console.log(chalk.red(`${t(lang, 'error')} ${result.error}`))
      }
      process.exit(1)
    }

    console.log(chalk.green(t(lang, 'gistValid')))
    console.log(chalk.green(t(lang, 'routesFound', { count: result.routeCount })))
    config.routeCount = result.routeCount
  }

  // ==================== Summary ====================
  console.log(chalk.cyan(t(lang, 'summary')))
  console.log(`  ${t(lang, 'method')}: ${method}`)
  if (method === 'public') {
    console.log(`  ${t(lang, 'gistUrl')}: ${config.gistUrl.substring(0, 60)}...`)
  } else {
    console.log(`  ${t(lang, 'gistId')}: ${config.gistId}`)
    console.log(`  ${t(lang, 'token')}: ${config.token.substring(0, 7)}...${config.token.slice(-4)}`)
  }
  console.log(`  ${t(lang, 'routeCount')}: ${config.routeCount}`)

  // ==================== Save Configuration ====================
  console.log()
  const shouldSave = await confirm({
    message: t(lang, 'saveToEnv'),
    default: true
  })

  if (shouldSave) {
    const envPath = resolve(process.cwd(), '.env')
    if (existsSync(envPath)) {
      console.log(chalk.yellow(t(lang, 'envExists')))
      const shouldOverwrite = await confirm({
        message: t(lang, 'overwrite'),
        default: false
      })
      if (!shouldOverwrite) {
        console.log()
        console.log(chalk.green(t(lang, 'complete')))
        console.log(chalk.dim(t(lang, 'exitMessage')))
        return
      }
    }

    saveToEnvFile(config, lang)
    console.log(chalk.green(t(lang, 'envSaved')))
  }

  // ==================== Next Steps ====================
  console.log(chalk.cyan(t(lang, 'nextSteps')))
  console.log(`  ${t(lang, 'nextStep1')}`)
  console.log(`  ${t(lang, 'nextStep2')}`)
  console.log(`  ${t(lang, 'nextStep3')}`)

  console.log()
  console.log(chalk.green.bold(t(lang, 'complete')))
  console.log(chalk.dim(t(lang, 'exitMessage')))
}

// ==================== Run ====================

main().catch(error => {
  console.error(chalk.red('Error:'), error.message)
  process.exit(1)
})
