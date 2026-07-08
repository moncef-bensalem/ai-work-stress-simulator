#!/bin/sh
set -e
pip install -r requirements.txt -q
exec uvicorn app.main:socket_app --host 0.0.0.0 --port 8000 --reload
