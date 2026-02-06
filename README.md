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
    cd AI-Lab
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

## 4. Powering Google Antigravity (Bypassing Quotas)

To use your own Google Cloud Project or AI Studio API Key to power Google Antigravity (and bypass the standard user quotas), there is a slight "official vs. manual" distinction you need to know.

While Antigravity defaults to your Google account's subscription quota (like AI Pro or Ultra), you can indeed configure it to use a pay-as-you-go API key to ensure you don't hit the 5-hour refresh caps.

### 1. Connecting via AI Studio API Key (Pay-as-you-go)
If you want to use your AI Studio key to access "unlimited" (paid) quota, you can override the default provider.

*   **Step 1:** Go to [Google AI Studio](https://aistudio.google.com/) and create an API Key. Ensure it is linked to a Google Cloud Project with billing enabled if you want to exceed the free-tier rate limits.
*   **Step 2:** In Antigravity, go to Settings (`Cmd+,` or `Ctrl+,`) and search for "Models" or "Providers".
*   **Step 3:** Select "Google AI Studio" as the provider.
*   **Step 4:** Paste your API key.
*   **Step 5: Manual Model ID:** In some preview versions, you may need to manually type the Model ID into the selection box to use the newest versions. For the current flagship, use: `gemini-3-pro-preview` or `gemini-3-flash-preview`.

### 2. Connecting to a Google Cloud Project (Vertex AI)
To use your Google Cloud (GCP) Project credits or enterprise quota via Vertex AI, the process is slightly different as it uses IAM instead of a simple API key.

*   **Authentication:** Ensure you have the Google Cloud SDK installed on your machine and run `gcloud auth application-default login`.
*   **Configuration:** In Antigravity settings, choose "Vertex AI" as the model provider.
*   **Project ID:** Enter your GCP Project ID. The IDE will use your local gcloud credentials to authenticate.
*   **Quota:** This will pull from your GCP project's Vertex AI quota. If you have high-tier support or a committed use discount on GCP, this is the most "limitless" way to run the IDE.

---

## 5. Deployment to Cloud Run

Deploying makes the application live on the internet (or your internal network).

### Step 1: One-Time Secret Setup
Store the API Key in the cloud so the app can access it securely.

1.  Login to GCP:
    ```bash
    gcloud auth login
    gcloud config set project <YOUR_PROJECT_ID>
    ```
2.  Run the setup script:
    ```bash
    ./setup_api_key.sh
    ```
    Follow the prompts to paste your Gemini API Key (input will be hidden).

### Step 2: Deploy the Application
Run this command from the `AI-Lab` folder to build and deploy:

```bash
./cloud_run.sh
```

*   **`--allow-unauthenticated`**: Makes the app public. Remove this flag to require Google IAM authentication (internal only).
*   **`--set-secrets`**: Injects the API key from Secret Manager.

Once complete, the terminal will show a **Service URL**. Click it to view your live AI Lab.
## 6. Troubleshooting

### Permission Errors during Setup (`setup_api_key.sh`)
**Issue**: The script fails with `Permission denied` or `secretmanager.secrets.create` error.
**Solution**: You need the **Secret Manager Admin** (`roles/secretmanager.admin`) role, or at minimum:
- `roles/secretmanager.secretAccessor`
- `roles/secretmanager.secretVersionManager`
- `roles/secretmanager.viewer`

If you are the owner, ensure the API is enabled: `gcloud services enable secretmanager.googleapis.com`

### Cloud Run Deployment Errors

#### `iam.serviceaccounts.actAs` permission denied
**Error**: `Permission 'iam.serviceaccounts.actAs' denied on service account...`
**Solution**: Grant yourself the **Service Account User** (`roles/iam.serviceAccountUser`) role on the project.
```bash
gcloud projects add-iam-policy-binding <PROJECT_ID> \
    --member="user:<YOUR_EMAIL>" \
    --role="roles/iam.serviceAccountUser"
```

#### Artifact Registry / Repo Admin Errors
**Error**: `roles/artifactregistry.repoAdmin required`
**Solution**: Grant **Artifact Registry Repository Administrator** (`roles/artifactregistry.repoAdmin`) to your user so it can create the container repository if it doesn't exist.

#### Storage Admin Errors
**Error**: `roles/storage.admin since the deploy will create a bucket`
**Solution**: Grant **Storage Admin** (`roles/storage.admin`) or ensure the Cloud Build staging bucket exists.

#### Cloud Build Permissions
**Error**: `roles/cloudbuild.builds.editor since the command will kick off a cloud build job`
**Solution**: Grant **Cloud Build Editor** (`roles/cloudbuild.builds.editor`).

### Multi-User Secret Conflicts
**Issue**: Multiple developers overwriting the same `GEMINI_API_KEY` secret.
**Solution**: The setup scripts now support **namespacing**.
1. When running `./setup_api_key.sh`, assume the default `<USER>` suffix or type a custom name.
2. When running `./cloud_run.sh`, ensure you target that specific secret name.
