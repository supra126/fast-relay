# Setup Wizard Guide

Fast Relay includes an interactive setup wizard to help you configure GitHub Gist integration quickly and easily.

## Quick Start

Run the setup wizard with one of these commands:

```bash
# Auto-detect system language
yarn setup

# Force English interface
yarn setup:en

# Force Traditional Chinese interface
yarn setup:zh-TW
```

## Configuration Methods

The setup wizard supports three configuration methods:

### 1. Public Gist (Recommended for Testing)

**Best for:** Development, testing, or when you don't need to keep your routes private.

**Advantages:**
- ✅ No GitHub token required
- ✅ Quick and simple setup
- ✅ Easy to share configurations

**Steps:**
1. Run `yarn setup` and select "Public Gist"
2. The wizard will open https://gist.github.com/ in your browser
3. Create a new Gist:
   - Filename: `routes.json`
   - Content: Your route configuration (see [routes.example.json](../routes.example.json))
   - Visibility: Choose "Create secret gist" or "Create public gist"
4. Click the "Raw" button and copy the URL
5. Paste the URL into the wizard
6. The wizard will verify your Gist and save the configuration

**Generated `.env` configuration:**
```env
GIST_URL=https://gist.githubusercontent.com/username/hash/raw/...
```

---

### 2. Private Gist (Recommended for Production)

**Best for:** Production environments where you need to keep routes private.

**Advantages:**
- ✅ Private and secure
- ✅ Access control via GitHub token
- ✅ Suitable for production use

**Steps:**

#### Step 1: Generate GitHub Token
1. Run `yarn setup` and select "Private Gist"
2. The wizard will open https://github.com/settings/tokens/new
3. Configure your token:
   - Description: `Fast Relay - Production`
   - Expiration: Choose based on your security requirements
   - Scopes: Check **ONLY** `gist` ✓
4. Click "Generate token"
5. Copy the generated token (it starts with `ghp_` or `github_pat_`)
6. Paste it into the wizard

#### Step 2: Create Private Gist
1. The wizard will verify your token
2. It will then open https://gist.github.com/
3. Create a new Gist:
   - Filename: `routes.json`
   - Content: Your route configuration
   - Visibility: Choose "Create secret gist"
4. Copy the Gist ID from the URL
   - URL format: `https://gist.github.com/username/<GIST_ID>`
   - Example: If URL is `https://gist.github.com/john/abc123def456`, the Gist ID is `abc123def456`
5. Paste the Gist ID into the wizard
6. The wizard will verify the Gist and save the configuration

**Generated `.env` configuration:**
```env
GIST_ID=your_gist_id_here
GITHUB_TOKEN=ghp_your_token_here
```

---

### 3. Local Configuration

**Best for:** When you don't want to use GitHub Gist at all.

**Advantages:**
- ✅ No GitHub account needed
- ✅ Full local control
- ✅ No external dependencies

**Steps:**
1. Run `yarn setup` and select "Local configuration"
2. Edit the `routes.json` file in your project root
3. Start the server with `yarn dev` or `yarn start`

**Note:** With local configuration, you need to manually restart the server when you update routes.

---

## Configuration File

The wizard automatically generates a `.env` file with appropriate settings:

```env
# GitHub Gist Configuration
GIST_URL=...              # For public Gist
# OR
GIST_ID=...               # For private Gist
GITHUB_TOKEN=...          # For private Gist

# Sync Settings
GIST_SYNC_INTERVAL=300    # Check for updates every 5 minutes
GIST_AUTO_RESTART=true    # Auto-restart when routes change
GIST_FETCH_TIMEOUT=10000  # Timeout after 10 seconds

# Server Configuration
PORT=8080
HOST=0.0.0.0
NODE_ENV=development
BODY_LIMIT=1048576

# Performance & Security
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
```

---

## Verification Process

The wizard performs automatic verification:

### For Public Gist:
1. ✅ Validates URL format
2. ✅ Fetches the Gist content
3. ✅ Verifies `routes.json` is valid JSON
4. ✅ Counts the number of routes

### For Private Gist:
1. ✅ Validates token format
2. ✅ Verifies token with GitHub API
3. ✅ Validates Gist ID
4. ✅ Checks `routes.json` file exists in Gist
5. ✅ Verifies JSON format
6. ✅ Counts the number of routes

---

## After Setup

Once the wizard completes, you'll see a summary and next steps:

```
📊 Configuration Summary:
  Method: private
  Gist ID: abc123def456
  GitHub Token: ghp_***...****
  Routes: 5

✅ Configuration saved to .env

📝 Next Steps:
  1. Review your .env file
  2. Start development: yarn dev
  3. Or deploy to Railway
```

### Starting the Server

```bash
# Development mode (with hot reload)
yarn dev

# Production mode
yarn build
yarn start:prod
```

---

## Troubleshooting

### Issue: "routes.json file not found in Gist"

**Solution:** Make sure your Gist file is named exactly `routes.json` (case-sensitive).

### Issue: "Token verification failed"

**Possible causes:**
- Token format is incorrect (should start with `ghp_` or `github_pat_`)
- Token has expired
- Token doesn't have `gist` scope

**Solution:** Generate a new token with the correct scope.

### Issue: "Failed to fetch Gist configuration"

**Possible causes:**
- Gist ID is incorrect
- Gist is private but no token provided
- Network connection issue

**Solution:** Double-check your Gist ID and ensure your token has access to it.

### Issue: ".env file already exists"

The wizard will ask if you want to overwrite the existing `.env` file. Choose:
- **Yes** - Replace with new configuration
- **No** - Keep existing configuration and exit

---

## Re-running the Wizard

You can run the setup wizard again at any time:

```bash
yarn setup
```

This is useful when:
- Changing from public to private Gist (or vice versa)
- Updating GitHub token
- Switching to a different Gist
- Troubleshooting configuration issues

---

## Manual Configuration

If you prefer to configure manually without the wizard, see:
- [GIST_SETUP.md](./GIST_SETUP.md) - Detailed manual setup guide

---

## Next Steps

- [Understanding Routes Configuration](../routes.example.json)
- [Advanced Configuration](./GIST_SETUP.md)

---

## Need Help?

If you encounter issues not covered here:
1. Check the [troubleshooting section](#troubleshooting) above
2. Review [GIST_SETUP.md](./GIST_SETUP.md) for more details
3. Open an issue on [GitHub](https://github.com/supra126/fast-relay/issues)
