#!/usr/bin/env bash
# Setup script for Peach CX MCP servers (Zendesk + Shortcut)
#
# Run this once after cloning peach-cx-plugins. It installs the MCP server
# wrappers into ~/.local/ and adds the server entries to ~/.claude.json.
# Each teammate needs their own API tokens.
#
# Usage:
#   cd peach-cx-plugins
#   bash mcp-servers/setup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_JSON="$HOME/.claude.json"

echo "=== Peach CX MCP Server Setup ==="
echo ""

# 1. Install wrapper files to ~/.local/
echo "Installing wrapper files..."

mkdir -p "$HOME/.local/zendesk-mcp-wrapper"
mkdir -p "$HOME/.local/shortcut-mcp-wrapper"
mkdir -p "$HOME/.local/shared-mcp"

cp "$SCRIPT_DIR/zendesk/wrapper.js" "$HOME/.local/zendesk-mcp-wrapper/wrapper.js"
cp "$SCRIPT_DIR/zendesk/package.json" "$HOME/.local/zendesk-mcp-wrapper/package.json"
cp "$SCRIPT_DIR/shortcut/wrapper.js" "$HOME/.local/shortcut-mcp-wrapper/wrapper.js"
cp "$SCRIPT_DIR/shortcut/package.json" "$HOME/.local/shortcut-mcp-wrapper/package.json"
cp "$SCRIPT_DIR/shared/dns-resilient.cjs" "$HOME/.local/zendesk-mcp-wrapper/dns-resilient.cjs"
cp "$SCRIPT_DIR/shared/dns-resilient.cjs" "$HOME/.local/shortcut-mcp-wrapper/dns-resilient.cjs"

chmod +x "$HOME/.local/zendesk-mcp-wrapper/wrapper.js"
chmod +x "$HOME/.local/shortcut-mcp-wrapper/wrapper.js"

echo "  Wrapper files installed to ~/.local/"

# 2. Collect credentials
echo ""

# Zendesk
read -rp "Zendesk email (e.g. you@peachfinance.com): " ZD_EMAIL
read -rp "Zendesk API token: " ZD_TOKEN
ZD_SUBDOMAIN="peachfinance"

# Shortcut
read -rp "Shortcut API token: " SC_TOKEN

echo ""
echo "Adding MCP servers to $CLAUDE_JSON..."

# 3. Merge into ~/.claude.json using python3 (available on macOS)
python3 - "$CLAUDE_JSON" "$ZD_EMAIL" "$ZD_TOKEN" "$ZD_SUBDOMAIN" "$SC_TOKEN" <<'PYEOF'
import sys, json, os

claude_json_path = sys.argv[1]
zd_email = sys.argv[2]
zd_token = sys.argv[3]
zd_subdomain = sys.argv[4]
sc_token = sys.argv[5]

home = os.path.expanduser("~")

# Load existing or create new
if os.path.exists(claude_json_path):
    with open(claude_json_path) as f:
        config = json.load(f)
else:
    config = {}

if "mcpServers" not in config:
    config["mcpServers"] = {}

config["mcpServers"]["zendesk"] = {
    "command": "node",
    "args": [os.path.join(home, ".local", "zendesk-mcp-wrapper", "wrapper.js")],
    "env": {
        "ZENDESK_EMAIL": zd_email,
        "ZENDESK_TOKEN": zd_token,
        "ZENDESK_SUBDOMAIN": zd_subdomain
    }
}

config["mcpServers"]["shortcut"] = {
    "command": "node",
    "args": [os.path.join(home, ".local", "shortcut-mcp-wrapper", "wrapper.js")],
    "env": {
        "SHORTCUT_API_TOKEN": sc_token
    }
}

with open(claude_json_path, "w") as f:
    json.dump(config, f, indent=2)

print(f"  Updated {claude_json_path}")
PYEOF

echo ""
echo "=== Setup complete ==="
echo ""
echo "MCP servers added: zendesk, shortcut"
echo ""
echo "For Slack: connect via claude.ai MCP connections UI."
echo "  1. Open claude.ai/code (or the Claude Code app)"
echo "  2. Go to Settings > MCP Connections"
echo "  3. Connect 'Slack' and authorize with your Peach workspace"
echo ""
echo "Restart Claude Code to pick up the new MCP servers."
