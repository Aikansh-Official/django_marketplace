#!/usr/bin/env python3
"""
CampXChange - Unified Version Management Tool
Single command to check and synchronize version numbers across:
- Root (version.json)
- Client (package.json, src/config/version.js)
- Admin (package.json, src/config/version.js)
- Server (server/settings.py, server/health.py)

Usage:
  python scripts/sync_version.py --check
  python scripts/sync_version.py 2.5.0
"""

import sys
import json
import re
from pathlib import Path

# Force utf-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent.parent

VERSION_JSON_FILE = ROOT_DIR / "version.json"
CLIENT_PKG_FILE = ROOT_DIR / "client" / "package.json"
ADMIN_PKG_FILE = ROOT_DIR / "admin" / "package.json"
CLIENT_VERSION_JS = ROOT_DIR / "client" / "src" / "config" / "version.js"
ADMIN_VERSION_JS = ROOT_DIR / "admin" / "src" / "config" / "version.js"
SERVER_SETTINGS_PY = ROOT_DIR / "server" / "server" / "settings.py"
SERVER_HEALTH_PY = ROOT_DIR / "server" / "server" / "health.py"


def get_current_versions():
    """Retrieve current version from each file."""
    versions = {}

    # 1. version.json
    if VERSION_JSON_FILE.exists():
        try:
            with open(VERSION_JSON_FILE, "r", encoding="utf-8") as f:
                versions["version.json"] = json.load(f).get("version", "UNKNOWN")
        except Exception as e:
            versions["version.json"] = f"ERROR: {e}"

    # 2. client/package.json
    if CLIENT_PKG_FILE.exists():
        try:
            with open(CLIENT_PKG_FILE, "r", encoding="utf-8") as f:
                versions["client/package.json"] = json.load(f).get("version", "UNKNOWN")
        except Exception as e:
            versions["client/package.json"] = f"ERROR: {e}"

    # 3. admin/package.json
    if ADMIN_PKG_FILE.exists():
        try:
            with open(ADMIN_PKG_FILE, "r", encoding="utf-8") as f:
                versions["admin/package.json"] = json.load(f).get("version", "UNKNOWN")
        except Exception as e:
            versions["admin/package.json"] = f"ERROR: {e}"

    # 4. client/src/config/version.js
    if CLIENT_VERSION_JS.exists():
        try:
            content = CLIENT_VERSION_JS.read_text(encoding="utf-8")
            match = re.search(r"VITE_APP_VERSION\s*\|\|\s*'([^']+)'", content)
            versions["client/src/config/version.js"] = match.group(1) if match else "FOUND"
        except Exception as e:
            versions["client/src/config/version.js"] = f"ERROR: {e}"

    # 5. admin/src/config/version.js
    if ADMIN_VERSION_JS.exists():
        try:
            content = ADMIN_VERSION_JS.read_text(encoding="utf-8")
            match = re.search(r"VITE_APP_VERSION\s*\|\|\s*'([^']+)'", content)
            versions["admin/src/config/version.js"] = match.group(1) if match else "FOUND"
        except Exception as e:
            versions["admin/src/config/version.js"] = f"ERROR: {e}"

    # 6. server/server/settings.py
    if SERVER_SETTINGS_PY.exists():
        try:
            content = SERVER_SETTINGS_PY.read_text(encoding="utf-8")
            match = re.search(r"APP_VERSION\s*=\s*'([^']+)'", content)
            versions["server/server/settings.py"] = match.group(1) if match else "FOUND"
        except Exception as e:
            versions["server/server/settings.py"] = f"ERROR: {e}"

    # 7. server/server/health.py
    if SERVER_HEALTH_PY.exists():
        try:
            content = SERVER_HEALTH_PY.read_text(encoding="utf-8")
            match = re.search(r"APP_VERSION',\s*'([^']+)'", content)
            versions["server/server/health.py"] = match.group(1) if match else "FOUND"
        except Exception as e:
            versions["server/server/health.py"] = f"ERROR: {e}"

    return versions


def check_versions():
    """Print status table of current versions across the project."""
    versions = get_current_versions()
    print("=" * 65)
    print("🏷️  CampXChange Platform Version Audit")
    print("=" * 65)
    
    unique_versions = set(v for v in versions.values() if not v.startswith("ERROR"))
    is_synced = len(unique_versions) == 1

    for file_name, ver in versions.items():
        print(f"  {file_name:<36} -> {ver}")

    print("-" * 65)
    if is_synced and unique_versions:
        synced_ver = list(unique_versions)[0]
        print(f"✅ ALL COMPONENTS IN 100% SYNC: v{synced_ver}")
    else:
        print("⚠️  MISMATCH DETECTED across components! Run sync to align them.")
    print("=" * 65)
    return is_synced


def update_versions(new_version: str):
    """Set new version across all project files simultaneously."""
    # Basic semver pattern check
    if not re.match(r"^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$", new_version):
        print(f"❌ Invalid version format: '{new_version}'. Expected semver (e.g., 2.4.0, 2.5.0)")
        sys.exit(1)

    print(f"🚀 Updating CampXChange version to v{new_version} across all files...\n")

    # 1. Update version.json
    if VERSION_JSON_FILE.exists():
        try:
            with open(VERSION_JSON_FILE, "r+", encoding="utf-8") as f:
                data = json.load(f)
                data["version"] = new_version
                if "client" in data:
                    data["client"]["buildName"] = f"CampXChange v{new_version}"
                if "admin" in data:
                    data["admin"]["buildName"] = f"CampXChange Admin v{new_version}"
                f.seek(0)
                json.dump(data, f, indent=2)
                f.truncate()
            print("  ✓ Updated version.json")
        except Exception as e:
            print(f"  ✗ Failed to update version.json: {e}")

    # 2. Update client/package.json
    if CLIENT_PKG_FILE.exists():
        try:
            with open(CLIENT_PKG_FILE, "r+", encoding="utf-8") as f:
                pkg = json.load(f)
                pkg["version"] = new_version
                f.seek(0)
                json.dump(pkg, f, indent=2)
                f.write("\n")
                f.truncate()
            print("  ✓ Updated client/package.json")
        except Exception as e:
            print(f"  ✗ Failed to update client/package.json: {e}")

    # 3. Update admin/package.json
    if ADMIN_PKG_FILE.exists():
        try:
            with open(ADMIN_PKG_FILE, "r+", encoding="utf-8") as f:
                pkg = json.load(f)
                pkg["version"] = new_version
                f.seek(0)
                json.dump(pkg, f, indent=2)
                f.write("\n")
                f.truncate()
            print("  ✓ Updated admin/package.json")
        except Exception as e:
            print(f"  ✗ Failed to update admin/package.json: {e}")

    # 4. Update client/src/config/version.js
    if CLIENT_VERSION_JS.exists():
        try:
            content = CLIENT_VERSION_JS.read_text(encoding="utf-8")
            content = re.sub(
                r"(VITE_APP_VERSION\s*\|\|\s*)'[^']+'",
                f"\\1'{new_version}'",
                content
            )
            CLIENT_VERSION_JS.write_text(content, encoding="utf-8")
            print("  ✓ Updated client/src/config/version.js")
        except Exception as e:
            print(f"  ✗ Failed to update client/src/config/version.js: {e}")

    # 5. Update admin/src/config/version.js
    if ADMIN_VERSION_JS.exists():
        try:
            content = ADMIN_VERSION_JS.read_text(encoding="utf-8")
            content = re.sub(
                r"(VITE_APP_VERSION\s*\|\|\s*)'[^']+'",
                f"\\1'{new_version}'",
                content
            )
            ADMIN_VERSION_JS.write_text(content, encoding="utf-8")
            print("  ✓ Updated admin/src/config/version.js")
        except Exception as e:
            print(f"  ✗ Failed to update admin/src/config/version.js: {e}")

    # 6. Update server/server/settings.py
    if SERVER_SETTINGS_PY.exists():
        try:
            content = SERVER_SETTINGS_PY.read_text(encoding="utf-8")
            content = re.sub(
                r"APP_VERSION\s*=\s*'[^']+'",
                f"APP_VERSION = '{new_version}'",
                content
            )
            SERVER_SETTINGS_PY.write_text(content, encoding="utf-8")
            print("  ✓ Updated server/server/settings.py")
        except Exception as e:
            print(f"  ✗ Failed to update server/server/settings.py: {e}")

    # 7. Update server/server/health.py
    if SERVER_HEALTH_PY.exists():
        try:
            content = SERVER_HEALTH_PY.read_text(encoding="utf-8")
            content = re.sub(
                r"(APP_VERSION',\s*)'[^']+'",
                f"\\1'{new_version}'",
                content
            )
            SERVER_HEALTH_PY.write_text(content, encoding="utf-8")
            print("  ✓ Updated server/server/health.py")
        except Exception as e:
            print(f"  ✗ Failed to update server/server/health.py: {e}")

    print("\n" + "=" * 65)
    check_versions()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--check":
        check_versions()
    elif len(sys.argv) > 1:
        update_versions(sys.argv[1])
    else:
        print("Usage:")
        print("  python scripts/sync_version.py --check       # Check current versions")
        print("  python scripts/sync_version.py 2.5.0         # Bump all versions to 2.5.0")
        check_versions()
