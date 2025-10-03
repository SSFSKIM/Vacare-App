#!/bin/bash
echo "Starting FastAPI application..."
echo "Checking for .env file..."

# Only source .env file if NOT running in Cloud Run
# Cloud Run sets K_SERVICE environment variable
if [ -z "$K_SERVICE" ] && [ -f /app/.env ]; then
    echo ".env file found and not in Cloud Run, sourcing..."
    set -a
    . /app/.env
    set +a
else
    echo "Using environment variables (Cloud Run or no .env file)"
fi

echo "DATABUTTON_EXTENSIONS first 100 chars: ${DATABUTTON_EXTENSIONS:0:100}"
echo "Starting uvicorn..."
echo "PWD: $(pwd)"
echo "Python version: $(python --version)"
echo "Uvicorn location: $(which uvicorn)"

# Try to import main.py first to catch any import errors
echo "Testing Python imports..."
echo "Python path check:"
python -c "import sys; print('\n'.join(sys.path))"
echo "Checking if DataStorage exists:"
ls -la /app/backend/DataStorage/ 2>&1 || echo "DataStorage directory not found!"
echo "Attempting import with extended timeout..."
timeout 30 python -c "import sys; sys.path.insert(0, '/app/backend'); print('About to import main...'); import main; print('Import successful')" 2>&1 || echo "Import failed or timed out!"

echo "Starting uvicorn now..."
# Cloud Run passes env vars directly, so this will work in both environments
uvicorn main:app --host 0.0.0.0 --port 8000 2>&1
EXIT_CODE=$?
echo "Uvicorn exited with code: $EXIT_CODE"
exit $EXIT_CODE
