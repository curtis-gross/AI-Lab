#!/bin/bash

# Retrieve API Key if not set
if [ -z "$GEMINI_API_KEY" ]; then
    echo "GEMINI_API_KEY not found in environment."
    echo "Attempting to fetch from gcloud secrets..."
    export GEMINI_API_KEY=$(gcloud secrets versions access latest --secret="GEMINI_API_KEY" 2>/dev/null)
    
    if [ -z "$GEMINI_API_KEY" ]; then
        echo "Warning: Could not retrieve GEMINI_API_KEY. AI features may not work."
    else
        echo "GEMINI_API_KEY retrieved successfully."
    fi
fi

# Function to kill background processes on exit
cleanup() {
    echo "Stopping background processes..."
    kill $(jobs -p) 2>/dev/null
}
trap cleanup EXIT

# Start Backend
echo "Starting Backend Server (port 8080)..."
node server.js &

# Wait a moment for server to initialize
sleep 2

# Start Frontend
echo "Starting Frontend Dev Server..."
npm run dev
