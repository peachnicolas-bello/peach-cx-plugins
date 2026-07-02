#!/usr/bin/env bash
# Peach CX Toolkit: one-command setup
#
# This script sets up everything a CX teammate needs to use Claude Code
# with the Peach investigation workflow. Run it once after cloning.
#
# What it does:
#   1. Checks that Node.js and gh (GitHub CLI) are installed
#   2. Registers the peach-cx plugin marketplace in Claude Code settings
#   3. Installs Zendesk and Shortcut MCP server wrappers
#   4. Tells you how to connect Slack (one click in Claude Code)
#
# Usage:
#   cd peach-cx-plugins
#   bash setup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
CLAUDE_JSON="$HOME/.claude.json"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }

echo ""
echo "========================================="
echo "  Peach CX Toolkit Setup"
echo "========================================="
echo ""

# ─── Step 0: Prerequisites ───

echo "Checking prerequisites..."

command -v node >/dev/null 2>&1 || fail "Node.js is not installed. Install it from https://nodejs.org"
ok "Node.js found ($(node --version))"

command -v npx >/dev/null 2>&1 || fail "npx is not available. It ships with Node.js, try reinstalling Node."
ok "npx found"

if command -v gh >/dev/null 2>&1; then
    ok "GitHub CLI found"
    if gh auth status >/dev/null 2>&1; then
        ok "GitHub CLI is authenticated"
        GH_TOKEN="$(gh auth token 2>/dev/null || true)"
    else
        warn "GitHub CLI is installed but not logged in."
        echo "   Run: gh auth login"
        echo "   Then re-run this script."
        exit 1
    fi
else
    warn "GitHub CLI (gh) not found."
    echo "   Install it: brew install gh"
    echo "   Then: gh auth login"
    echo "   Then re-run this script."
    exit 1
fi

echo ""

# ─── Step 1: Register plugin marketplace ───

echo "Setting up Claude Code plugins..."

mkdir -p "$HOME/.claude"

python3 - "$CLAUDE_SETTINGS" <<'PYEOF'
import sys, json, os

path = sys.argv[1]

if os.path.exists(path):
    with open(path) as f:
        config = json.load(f)
else:
    config = {}

# Add marketplace
if "extraKnownMarketplaces" not in config:
    config["extraKnownMarketplaces"] = {}

config["extraKnownMarketplaces"]["peach-cx"] = {
    "source": {
        "source": "github",
        "repo": "peachnicolas-bello/peach-cx-plugins"
    }
}

# Enable all plugins
if "enabledPlugins" not in config:
    config["enabledPlugins"] = {}

for plugin in ["cx@peach-cx", "dev@peach-cx", "support@peach-cx", "research@peach-cx"]:
    config["enabledPlugins"][plugin] = True

with open(path, "w") as f:
    json.dump(config, f, indent=2)
PYEOF

ok "Plugin marketplace registered in $CLAUDE_SETTINGS"
ok "All 4 plugins enabled (cx, dev, support, research)"

echo ""

# ─── Step 2: Install MCP server wrappers ───

echo "Installing MCP server wrappers..."

mkdir -p "$HOME/.local/zendesk-mcp-wrapper"
mkdir -p "$HOME/.local/shortcut-mcp-wrapper"

cp "$SCRIPT_DIR/mcp-servers/zendesk/wrapper.js" "$HOME/.local/zendesk-mcp-wrapper/wrapper.js"
cp "$SCRIPT_DIR/mcp-servers/zendesk/package.json" "$HOME/.local/zendesk-mcp-wrapper/package.json"
cp "$SCRIPT_DIR/mcp-servers/shortcut/wrapper.js" "$HOME/.local/shortcut-mcp-wrapper/wrapper.js"
cp "$SCRIPT_DIR/mcp-servers/shortcut/package.json" "$HOME/.local/shortcut-mcp-wrapper/package.json"
cp "$SCRIPT_DIR/mcp-servers/shared/dns-resilient.cjs" "$HOME/.local/zendesk-mcp-wrapper/dns-resilient.cjs"
cp "$SCRIPT_DIR/mcp-servers/shared/dns-resilient.cjs" "$HOME/.local/shortcut-mcp-wrapper/dns-resilient.cjs"

chmod +x "$HOME/.local/zendesk-mcp-wrapper/wrapper.js"
chmod +x "$HOME/.local/shortcut-mcp-wrapper/wrapper.js"

ok "Wrapper files installed"

echo ""

# ─── Step 3: Collect API tokens ───

echo "Now I need your API tokens. Here is where to find them:"
echo ""
echo "  Zendesk token:"
echo "    1. Go to https://peachfinance.zendesk.com/admin/apps-integrations/apis/zendesk-api/settings"
echo "    2. Click 'Add API token'"
echo "    3. Copy the token"
echo ""
echo "  Shortcut token:"
echo "    1. Go to https://app.shortcut.com/peachfinance/settings/account/api-tokens"
echo "    2. Click 'Generate Token'"
echo "    3. Copy the token"
echo ""

read -rp "Your Peach email (e.g. jane.doe@peachfinance.com): " USER_EMAIL

if [ -z "$USER_EMAIL" ]; then
    fail "Email is required."
fi

echo ""
read -rp "Zendesk API token: " ZD_TOKEN

if [ -z "$ZD_TOKEN" ]; then
    fail "Zendesk token is required."
fi

echo ""
read -rp "Shortcut API token: " SC_TOKEN

if [ -z "$SC_TOKEN" ]; then
    fail "Shortcut token is required."
fi

echo ""
echo "Saving tokens..."

python3 - "$CLAUDE_JSON" "$USER_EMAIL" "$ZD_TOKEN" "$SC_TOKEN" <<'PYEOF'
import sys, json, os

path = sys.argv[1]
email = sys.argv[2]
zd_token = sys.argv[3]
sc_token = sys.argv[4]
home = os.path.expanduser("~")

if os.path.exists(path):
    with open(path) as f:
        config = json.load(f)
else:
    config = {}

if "mcpServers" not in config:
    config["mcpServers"] = {}

config["mcpServers"]["zendesk"] = {
    "command": "node",
    "args": [os.path.join(home, ".local", "zendesk-mcp-wrapper", "wrapper.js")],
    "env": {
        "ZENDESK_EMAIL": email,
        "ZENDESK_TOKEN": zd_token,
        "ZENDESK_SUBDOMAIN": "peachfinance"
    }
}

config["mcpServers"]["shortcut"] = {
    "command": "node",
    "args": [os.path.join(home, ".local", "shortcut-mcp-wrapper", "wrapper.js")],
    "env": {
        "SHORTCUT_API_TOKEN": sc_token
    }
}

with open(path, "w") as f:
    json.dump(config, f, indent=2)
PYEOF

ok "Zendesk MCP configured"
ok "Shortcut MCP configured"

echo ""

# ─── Step 4: Slack instructions ───

echo "========================================="
echo "  Almost done! One last step (manual):"
echo "========================================="
echo ""
echo "  Connect Slack inside Claude Code:"
echo ""
echo "    1. Open Claude Code (the app or claude.ai/code)"
echo "    2. Click the puzzle-piece icon (MCP) in the sidebar"
echo "    3. Find 'Slack' and click 'Connect'"
echo "    4. Authorize with the Peach Finance workspace"
echo ""
echo "  That gives Claude access to search Slack threads,"
echo "  which the investigation workflow uses on every ticket."
echo ""

# ─── Done ───

echo "========================================="
echo -e "  ${GREEN}Setup complete!${NC}"
echo "========================================="
echo ""
echo "  Restart Claude Code to load everything."
echo ""
echo "  After restarting, try typing /investigate in a session"
echo "  to verify the skills loaded correctly."
echo ""
