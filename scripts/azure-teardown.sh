#!/usr/bin/env bash
# ==============================================================================
# FootprintPix — Azure Teardown Script
# ==============================================================================
# This script tears down the Azure Resource Group (and all contained resources:
# Azure Static Web App, Storage Account, Blob Containers, and Table Storage)
# to ensure zero ongoing billing after testing or demoing the application.
# ==============================================================================

set -euo pipefail

DEFAULT_RG="rg-footprintpix-prod"
RESOURCE_GROUP="${1:-$DEFAULT_RG}"
DRY_RUN=false
FORCE=false

# Parse flags
for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=true
      ;;
    -f|--force|--yes)
      FORCE=true
      ;;
    --help|-h)
      echo "Usage: $0 [RESOURCE_GROUP_NAME] [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -f, --force, --yes   Skip confirmation prompt and tear down immediately"
      echo "  --dry-run            List resources that would be deleted without deleting"
      echo "  -h, --help           Show this help message"
      echo ""
      echo "Default Resource Group: ${DEFAULT_RG}"
      exit 0
      ;;
    *)
      if [[ "$arg" != "$RESOURCE_GROUP" ]]; then
        RESOURCE_GROUP="$arg"
      fi
      ;;
  esac
done

echo "🔍 Checking Azure CLI installation and login status..."
if ! command -v az &>/dev/null; then
  echo "❌ Error: Azure CLI ('az') is not installed or not in PATH."
  echo "   Install it with: brew install azure-cli (macOS) or visit https://aka.ms/azure-cli"
  exit 1
fi

if ! az account show &>/dev/null; then
  echo "⚠️  You are not currently logged in to Azure."
  echo "👉 Initiating Azure login..."
  az login --output table
fi

CURRENT_SUB=$(az account show --query "{Name:name, ID:id}" -o tsv 2>/dev/null || echo "Unknown")
echo "✅ Logged in to Azure subscription: ${CURRENT_SUB}"
echo "🎯 Target Resource Group: ${RESOURCE_GROUP}"

# Check if resource group exists
if ! az group exists --name "${RESOURCE_GROUP}" | grep -q "true"; then
  echo "ℹ️  Resource group '${RESOURCE_GROUP}' does not exist. Nothing to tear down!"
  exit 0
fi

# List resources currently in the group
echo ""
echo "📦 Resources discovered in '${RESOURCE_GROUP}':"
RESOURCES=$(az resource list --resource-group "${RESOURCE_GROUP}" --query "[].{Name:name, Type:type, Location:location}" -o table 2>/dev/null || true)

if [[ -z "${RESOURCES}" || "${RESOURCES}" =~ "Name" && $(echo "${RESOURCES}" | wc -l) -le 2 ]]; then
  echo "   (No active resources found in group, or group is already empty)"
else
  echo "${RESOURCES}"
fi

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "🔎 [DRY RUN] Would delete resource group '${RESOURCE_GROUP}' and all listed resources above."
  exit 0
fi

if [ "$FORCE" = false ]; then
  echo ""
  read -rp "⚠️  Are you sure you want to permanently delete '${RESOURCE_GROUP}' and ALL its resources? (y/N): " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "❌ Teardown cancelled by user."
    exit 0
  fi
fi

echo ""
echo "🚀 Deleting resource group '${RESOURCE_GROUP}' (this will purge the Static Web App, Storage Account, Blobs, and Tables)..."
az group delete --name "${RESOURCE_GROUP}" --yes --no-wait

echo ""
echo "✨ Teardown initiated successfully in the background!"
echo "   Azure is now deleting the resource group and stopping all related compute/storage charges."
echo "   You can verify deletion status anytime with: az group exists --name ${RESOURCE_GROUP}"

