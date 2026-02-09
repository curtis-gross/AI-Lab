#!/bin/bash

# setup_api_key.sh
# Usage: ./setup_api_key.sh

echo "Setting up Gemini API Key in Google Cloud Secret Manager..."
echo "NOTE: You need 'Secret Manager Admin' or equivalent permissions to create secrets."
echo "NOTE: This step is great for getting your app running, but not required for development."

# Default secret name with user suffix to avoid collisions in shared projects
# We use 'tr' to ensure the username is safe for Secret Manager naming conventions (alphanumeric, dashes, underscores)
SAFE_USER=$(echo "$USER" | tr -cd 'a-zA-Z0-9_-')
DEFAULT_SECRET_NAME="GEMINI_API_KEY_${SAFE_USER}"

echo "Enter Secret Name to create/update [Default: $DEFAULT_SECRET_NAME]:"
read SECRET_NAME_INPUT
SECRET_NAME=${SECRET_NAME_INPUT:-$DEFAULT_SECRET_NAME}

echo "Using Secret Name: $SECRET_NAME"

# Check if the secret already exists
if ! gcloud secrets describe $SECRET_NAME > /dev/null 2>&1; then
  echo "Creating secret '$SECRET_NAME'..."
  if ! gcloud secrets create $SECRET_NAME --locations=us-west2 --replication-policy="user-managed"; then
      echo "ERROR: Failed to create secret. Please ensure you have 'Secret Manager Admin' role."
      echo "See TROUBLESHOOTING.md for more details."
      exit 1
  fi
else
  echo "Secret '$SECRET_NAME' already exists."
fi

echo "Please enter your Gemini API Key:"
read -s API_KEY

if [ -z "$API_KEY" ]; then
  echo "API Key cannot be empty."
  exit 1
fi

# Add the secret version
echo -n "$API_KEY" | gcloud secrets versions add $SECRET_NAME --data-file=-

echo ""
echo "API Key stored in Secret Manager under '$SECRET_NAME'."
echo "Make sure to use this name when deploying!"
