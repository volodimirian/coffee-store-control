#!/usr/bin/env python3
"""Test configuration parsing."""
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app.core.config import settings
    print("✓ Configuration loaded successfully!")
    print(f"  APP_ENV: {settings.app_env}")
    print(f"  CORS_ORIGINS: {settings.cors_origins}")
    print(f"  Type: {type(settings.cors_origins)}")
    sys.exit(0)
except Exception as e:
    print(f"✗ Configuration failed to load:")
    print(f"  {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
