"""Vercel Serverless Function entry point for BrainBaseline FastAPI backend."""
import os
import sys
from pathlib import Path

# Add repository root to Python path so `packages` and `apps` can be imported
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from apps.api.main import app
