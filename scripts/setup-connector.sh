#!/bin/bash
# MergeIT Connector Setup Script — run on the dashboard VM
# Clones/updates the connector, installs deps, and starts it on port 5000.

set -e
CONNECTOR_DIR="/opt/mergeit-connector"
CONNECTOR_REPO="https://github.com/AycersCSS/wazuh-dashboard.git"
CONNECTOR_BRANCH="connector"

echo "=== MergeIT Connector Setup ==="

if [ -d "$CONNECTOR_DIR" ]; then
  echo "[1/4] Pulling latest connector..."
  cd "$CONNECTOR_DIR"
  git pull origin "$CONNECTOR_BRANCH" 2>/dev/null || true
else
  echo "[1/4] Cloning connector..."
  git clone -b "$CONNECTOR_BRANCH" "$CONNECTOR_REPO" "$CONNECTOR_DIR" 2>/dev/null || {
    echo "Branch $CONNECTOR_BRANCH not found — cloning main and copying connector files."
    git clone "$CONNECTOR_REPO" "$CONNECTOR_DIR"
  }
fi

echo "[2/4] Installing Python dependencies..."
cd "$CONNECTOR_DIR"
pip3 install -r requirements.txt 2>/dev/null || pip install -r requirements.txt

echo "[3/4] Checking .env..."
if [ ! -f .env ]; then
  echo "WAZUH_API_URL=https://192.168.1.71:55000" > .env
  echo "WAZUH_API_USERNAME=wazuh-wui" >> .env
  echo "WAZUH_API_PASSWORD=AHjXj2Ucf0NcoG.c7xQsklgA+cdg8xw" >> .env
  echo "WAZUH_SSL_VERIFY=false" >> .env
  echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
  echo "WAZUH_INDEXER_URL=https://192.168.1.71:9200" >> .env
  echo ".env created with default Wazuh API credentials"
fi

echo "[4/4] Starting connector on port 5000..."
kill $(lsof -ti:5000) 2>/dev/null || true
nohup python3 main.py > /tmp/connector.log 2>&1 &
sleep 2

echo ""
echo "=== Connector is running on http://localhost:5000 ==="
echo "Test: curl http://localhost:5000/"
curl -s http://localhost:5000/ | head -3
