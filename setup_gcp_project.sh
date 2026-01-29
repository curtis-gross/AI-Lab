#!/bin/bash

# setup_gcp_project.sh
# Usage: ./setup_gcp_project.sh <PROJECT_ID>

PROJECT_ID=$1

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: ./setup_gcp_project.sh <PROJECT_ID>"
  echo "Please provide your Google Cloud Project ID."
  exit 1
fi

echo "Setting up Google Cloud Project: $PROJECT_ID"

# Set default project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  generativelanguage.googleapis.com \
  secretmanager.googleapis.com

echo "APIs enabled."

# Create a Secret for the Gemini API Key if it doesn't exist
# Note: You still need to add the actual key value manually or via command line if you have it.
# This just checks/prepares the secret container.
SECRET_NAME="GEMINI_API_KEY"
EXISTS=$(gcloud secrets list --filter="name:$SECRET_NAME" --format="value(name)")

if [ -z "$EXISTS" ]; then
    echo "Creating secret '$SECRET_NAME'..."
    gcloud secrets create $SECRET_NAME --replication-policy="automatic"
    echo "Secret created. Please add your API key version using:"
    echo "  echo -n 'YOUR_API_KEY' | gcloud secrets versions add $SECRET_NAME --data-file=-"
else
    echo "Secret '$SECRET_NAME' already exists."
fi

echo "Setup complete. Next steps:"
echo "1. Ensure you have a valid Gemini API Key."
echo "2. Add the key version if you haven't already."
echo "3. Run 'npm install' and 'npm run build'."
echo "4. Deploy using 'gcloud run deploy' (see README)."
