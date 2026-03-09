#!/bin/bash

# Configuration
# CHANGE THIS TO YOUR APP NAME
SERVICE_NAME="ailab-app"
REGION="us-central1"

echo "Deploying $SERVICE_NAME to Cloud Run..."

if [ -z "$GEMINI_API_KEY" ]; then
  echo "Error: GEMINI_API_KEY environment variable is not set."
  echo "Please export your API key first: export GEMINI_API_KEY='your_key'"
  exit 1
fi

# Build and Deploy
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars=GEMINI_API_KEY=$GEMINI_API_KEY

echo "Deployment complete."
