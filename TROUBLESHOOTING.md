# Troubleshooting Guide

This document captures common issues and solutions encountered during the setup and deployment of the AI Lab application.

## 1. Setup Script Permissions (`setup_api_key.sh`)

**Issue**: The script fails with `Permission denied` or `secretmanager.secrets.create` error.

**Cause**: The user running the script does not have sufficient permissions to create secrets in the Google Cloud Project.

**Solution**:
Ask your project administrator to grant you the **Secret Manager Admin** (`roles/secretmanager.admin`) role, or at minimum:
- `roles/secretmanager.secretAccessor`
- `roles/secretmanager.secretVersionManager`
- `roles/secretmanager.viewer` (to check existence)

If you are the owner, ensure you have enabled the Secret Manager API:
```bash
gcloud services enable secretmanager.googleapis.com
```

---

## 2. Cloud Run Deployment Errors

### Permission 'iam.serviceaccounts.actAs' denied

**Error**:
```
Permission 'iam.serviceaccounts.actAs' denied on service account <PROJECT_NUMBER>-compute@developer.gserviceaccount.com
```

**Cause**:
When you deploy to Cloud Run from the CLI, you are asking Google Cloud to "act as" the default compute service account to run your container. Your personal user account needs permission to do this.

**Solution**:
Grant the **Service Account User** (`roles/iam.serviceAccountUser`) role to yourself on the project (or specifically on the compute service account).

```bash
# Grant to yourself on the project level
gcloud projects add-iam-policy-binding <PROJECT_ID> \
    --member="user:<YOUR_EMAIL>" \
    --role="roles/iam.serviceAccountUser"
```

### Repo Admin / Artifact Registry Errors

**Error**:
```
roles/artifactregistry.repoAdmin required
```

**Cause**:
The deployment command tries to upload your container image to Google Artifact Registry. If the repository doesn't exist, it tries to create one.

**Solution**:
Grant **Artifact Registry Repository Administrator** (`roles/artifactregistry.repoAdmin`) or ensure the repository is pre-created by an admin.

### Storage Admin Errors

**Error**:
```
roles/storage.admin since the deploy will create a bucket
```

**Cause**:
Cloud Build (used by `gcloud run deploy --source .`) stages your source code in a Cloud Storage bucket before building.

**Solution**:
Grant **Storage Admin** (`roles/storage.admin`) or ensure a staging bucket exists and is accessible.

### Cloud Build Permissions

**Error**:
```
roles/cloudbuild.builds.editor since the command will kick off a cloud build job
```

**Cause**:
Building the container from source requires triggering Cloud Build.

**Solution**:
Grant **Cloud Build Editor** (`roles/cloudbuild.builds.editor`).

---

## 3. Secret "Clobbering" (Multiple Users)

**Issue**:
If multiple developers leverage the same GCP Project, they might overwrite each other's `GEMINI_API_KEY` secret.

**Solution**:
The updated setup scripts support namespacing.
1. Use `./setup_api_key.sh` and provide a unique suffix (e.g., your username).
2. Use `./cloud_run.sh` and it will attempt to detect or ask for the secret name you created.

Alternatively, strictly use **Environment Variables** for local development and ensure the Project Admin manages a single, shared "Production" API key for the deployed Cloud Run instance.
