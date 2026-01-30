#!/bin/bash

echo "Starting local development server..."

# Build the frontend first
echo "Building frontend..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "Build successful. Starting Node.js server..."
  # Start the server
  # Fetch API Key from Secret Manager
  echo "Fetching API Key from Secret Manager..."
  export GEMINI_API_KEY=$(gcloud secrets versions access latest --secret="GEMINI_API_KEY")
  
  if [ -z "$GEMINI_API_KEY" ]; then
    echo "Error: GEMINI_API_KEY is empty. Check gcloud authentication and secret existence."
    exit 1
  else
    echo "GEMINI_API_KEY retrieved successfully (Length: ${#GEMINI_API_KEY})"
  fi
  
  node server.js
else
  echo "Frontend build failed. Server not started."
fi
