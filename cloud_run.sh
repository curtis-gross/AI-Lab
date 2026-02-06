#!/bin/bash

# Configuration
# CHANGE THIS TO YOUR APP NAME
SERVICE_NAME="ailab"
REGION="us-central1"

echo "Deploying $SERVICE_NAME to Cloud Run..."

# Default secret name logic matching setup_api_key.sh
SAFE_USER=$(echo "$USER" | tr -cd 'a-zA-Z0-9_-')
DEFAULT_SECRET_NAME="GEMINI_API_KEY_${SAFE_USER}"

echo "Enter Secret Name to reference [Default: $DEFAULT_SECRET_NAME]:"
read SECRET_NAME_INPUT
SECRET_NAME=${SECRET_NAME_INPUT:-$DEFAULT_SECRET_NAME}

echo "Using Secret: $SECRET_NAME"

# Build and Deploy
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=$SECRET_NAME:latest

echo "Deployment complete."
