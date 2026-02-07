# AI Lab - Deployment & Setup Guide

This guide details the process for setting up the AI Lab application. **Most users should start with Section 1: Developer Setup.**

## 1. Developer Setup (Local Machine)

Each developer should follow these steps to run the app locally and deploy changes.

### Prerequisites
*   **Node.js (v20+)**: [Download](https://nodejs.org/)
*   **Google Cloud CLI**: [Install Guide](https://cloud.google.com/sdk/docs/install)
*   **Git**: [Install Guide](https://git-scm.com/downloads)

### Installation
1.  Clone the repository:
    ```bash
    git clone <your-repo-url>
    cd AI-Lab
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Local Development
To run the app on your machine:

1.  **Set your API key**:
    You will need a Gemini API Key. If you don't have one, see [Section 2: AI Studio & API Keys](#2-ai-studio--api-keys).
    
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

## 2. AI Studio & API Keys

To use Google's Gemini models locally, you need a Google AI Studio API key.

### Step 1: Connect GCP to AI Studio
1.  Navigate to [Google AI Studio](https://aistudio.google.com/).
2.  Sign in with your Google Account.
3.  Click on the **Settings** (gear icon) or **API Key** tab on the left.
4.  Link a **Google Cloud Project** (if you have one) to enable billing and higher quotas. If you do not, read step 4!

### Step 2: Generate the API Key
1.  In AI Studio, click **"Get API key"**.
2.  Click **"Create API key"**.
3.  Copy the generated key string. use this for your local `GEMINI_API_KEY`.

---

## 3. Powering Google Antigravity (Bypassing Quotas)

To use your own Google Cloud Project or AI Studio API Key within the IDE (Antigravity) itself:

1.  **Connect via AI Studio API Key**:
    *   Go to IDE Settings (`Cmd+,`).
    *   Search for "Models" or "Providers".
    *   Select "Google AI Studio" and paste your API key.
    *   Model ID: `gemini-3-pro-preview` or `gemini-3-flash-preview`.

2.  **Connect via Vertex AI (GCP)**:
    *   Run `gcloud auth application-default login`.
    *   In IDE settings, choose "Vertex AI" and enter your Project ID.

---

## 4. GCP Environment Setup (Admin Only)

This section is for the administrator responsible for creating the cloud environment for deployment.

### Step 1: Create a Google Cloud Project
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a **New Project** (e.g., `ai-lab-production`).
3.  **Billing**: Ensure a billing account is linked.

### Step 2: Enable Required APIs
Open the **Cloud Shell** and run:
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
Grant your developers the following roles in IAM:
*   **Cloud Run Developer** (`roles/run.developer`)
*   **Artifact Registry Writer** (`roles/artifactregistry.writer`)
*   **Secret Manager Secret Accessor** (`roles/secretmanager.secretAccessor`)
*   **Secret Manager Secret Version Manager** (`roles/secretmanager.secretVersionManager`)
*   **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`)
*   *(Optional)* **Viewer** (`roles/viewer`)

---

## 5. Deployment to Cloud Run

Deploying makes the application live on the internet.

### Step 1: One-Time Secret Setup
Store the API Key in the cloud securely.
1.  Login to GCP: `gcloud auth login` & `gcloud config set project <YOUR_PROJECT_ID>`
2.  Run the setup script:
    ```bash
    ./setup_api_key.sh
    ```
    Follow the prompts. You can name your secret (e.g., `GEMINI_API_KEY_CURTIS`) to avoid conflicts.

### Step 2: Deploy the Application
Run this from the project root:
```bash
./cloud_run.sh
```
Follow the prompts to select your secret name.

---

## 6. Troubleshooting

### Permission Errors during Setup (`setup_api_key.sh`)
**Issue**: `Permission denied` or `secretmanager.secrets.create` error.
**Solution**: You need **Secret Manager Admin** (`roles/secretmanager.admin`) or compatible roles.

### Cloud Run Deployment Errors

#### `iam.serviceaccounts.actAs` permission denied
**Solution**: Grant yourself **Service Account User** (`roles/iam.serviceAccountUser`) on the project.
```bash
gcloud projects add-iam-policy-binding <PROJECT_ID> \
    --member="user:<YOUR_EMAIL>" \
    --role="roles/iam.serviceAccountUser"
```

#### Artifact Registry / Repo Admin Errors
**Solution**: Grant **Artifact Registry Repository Administrator** (`roles/artifactregistry.repoAdmin`).

#### Storage Admin Errors
**Solution**: Grant **Storage Admin** (`roles/storage.admin`).

#### Cloud Build Permissions
**Solution**: Grant **Cloud Build Editor** (`roles/cloudbuild.builds.editor`).

### Multi-User Secret Conflicts
**Solution**: Use the namespacing feature in `./setup_api_key.sh` and `./cloud_run.sh` to give your secret a unique name.
