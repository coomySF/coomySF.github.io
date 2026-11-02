#!/bin/bash
# 把 agent 裝成 launchd 使用者服務：登入就跑、掛了會重啟。
# 需要先準備 ~/.config/secret-base/agent.env（SECRET_BASE_AGENT_KEY=...）。
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
NODE="$(command -v node)"
CLAUDE="$(command -v claude)"
LABEL="com.coomy.secret-base-agent"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>$NODE</string><string>$HERE/agent.mjs</string></array>
  <key>EnvironmentVariables</key><dict>
    <key>PATH</key><string>$(dirname "$NODE"):$(dirname "$CLAUDE"):/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>CLAUDE_BIN</key><string>$CLAUDE</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$HERE/launchd.out.log</string>
  <key>StandardErrorPath</key><string>$HERE/launchd.err.log</string>
</dict></plist>
PLIST
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "已安裝並啟動 $LABEL"
echo "看日誌：tail -f $HERE/agent.log"
echo "停止：launchctl bootout gui/$(id -u)/$LABEL"
