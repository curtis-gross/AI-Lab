# AI Lab - Deployment & Setup Guide

This guide details the complete process for setting up the Google Cloud Platform (GCP) environment, configuring access for your team, generating AI credentials, and deploying the AI Lab application.

## 1. GCP Environment Setup (Admin)

This section is for the administrator responsible for creating the cloud environment.

### Step 1: Create a Google Cloud Project
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Click the project dropdown in the top bar and select **"New Project"**.
3.  **Project Name**: `ai-lab-production` (or similar).
4.  **Billing**: Ensure a billing account is linked to this project. This is required for Cloud Run and Vertex AI.

### Step 2: Enable Required APIs
Open the **Cloud Shell** (icon in top right) or use your local terminal to enable the necessary services for this project:

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  generativelanguage.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com
```

### Step 3: Add Team Members & Permissions
You need to grant your developers access to deploy and manage resources.

1.  Go to **IAM & Admin > IAM**.
2.  Click **Grant Access**.
3.  Enter the email addresses of your team members.
4.  Assign the following roles (or a custom role with these permissions):
    *   **Cloud Run Developer** (`roles/run.developer`): To deploy and manage the app.
    *   **Artifact Registry Writer** (`roles/artifactregistry.writer`): To push container images.
    *   **Secret Manager Secret Accessor** (`roles/secretmanager.secretAccessor`): To read the API key at runtime.
    *   **Secret Manager Secret Version Manager** (`roles/secretmanager.secretVersionManager`): To add/update the API key.
    *   **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`): To use enabled APIs.
    *   *(Optional)* **Viewer** (`roles/viewer`): General read-only access to the console.

---

## 2. AI Studio & API Keys

To use Google's Gemini models, you need to link your GCP project to Google AI Studio and generate an API key.

### Step 1: Connect GCP to AI Studio
1.  Navigate to [Google AI Studio](https://aistudio.google.com/).
2.  Sign in with the Google Account that has access to your GCP project.
3.  Click on the **Settings** (gear icon) or **API Key** tab on the left.
4.  When creating a key or setting up billing, you will be asked to link a **Google Cloud Project**. Select the project you created in Section 1 (`ai-lab-production`).
    *   *Why?* This links your API usage to your corporate billing account, removing the free-tier rate limits and allowing for higher quotas.

### Step 2: Generate the API Key
1.  In AI Studio, click **"Get API key"**.
2.  Click **"Create API key in existing project"**.
3.  Select your GCP project.
4.  Copy the generated key string. **Do not share this publicly.**

---

## 3. Developer Setup (Local Machine)

Each developer should follow these steps to run the app locally and deploy changes.

### Prerequisites
*   **Node.js (v20+)**: [Download](https://nodejs.org/)
*   **Google Cloud CLI**: [Install Guide](https://cloud.google.com/sdk/docs/install)
*   **Git**: [Install Guide](https://git-scm.com/downloads)

### Installation
1.  Clone the repository:
    ```bash
    git clone <your-repo-url>
    cd demo-app
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Local Development
To run the app on your machine:

1.  Set your API key (obtained from Admin):
    ```bash
    # Mac/Linux
    export GEMINI_API_KEY="your_api_key_here" 
    
    # Windows (PowerShell)
    $env:GEMINI_API_KEY="your_api_key_here"
    ```
2.  Start the dev server:
    ```bash
    npm run dev
    ```
3.  Open `http://localhost:5173`.

---

## 4. Deployment to Cloud Run

Deploying makes the application live on the internet (or your internal network).

### Step 1: One-Time Secret Setup
Store the API Key in the cloud so the app can access it securely.

1.  Login to GCP:
    ```bash
    gcloud auth login
    gcloud config set project <YOUR_PROJECT_ID>
    ```
2.  Create the secret (if it doesn't exist) and add the key version:
    ```bash
    # Create the secret container
    gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

    # Add the actual key value
    echo -n "YOUR_ACTUAL_API_KEY_STRING" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
    ```

### Step 2: Deploy the Application
Run this command from the `demo-app` folder to build and deploy:

```bash
gcloud run deploy ai-lab-deal-gen \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest
```

*   **`--allow-unauthenticated`**: Makes the app public. Remove this flag to require Google IAM authentication (internal only).
*   **`--set-secrets`**: Injects the API key from Secret Manager.

Once complete, the terminal will show a **Service URL**. Click it to view your live AI Lab.