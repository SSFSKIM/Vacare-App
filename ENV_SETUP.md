# Environment Setup Guide

This guide explains how to set up environment variables for the VA Care application.

## Quick Start

### 1. Local Development

Copy the example environment files and fill in your credentials:

```bash
# Backend environment
cp "explore-yourself (6)/.env.example" "explore-yourself (6)/.env"

# Edit the .env file with your actual credentials
```

### 2. Cloud Run Deployment

Choose one format:

**Option A: Plain text format**
```bash
cp cloudrun.env.example cloudrun.env
# Edit cloudrun.env with your actual credentials
```

**Option B: YAML format**
```bash
cp cloudrun.env.yaml.example cloudrun.env.yaml
# Edit cloudrun.env.yaml with your actual credentials
```

## Required Environment Variables

### Firebase Configuration

```bash
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=1:your-sender-id:web:your-app-suffix
```

Get these from: [Firebase Console](https://console.firebase.google.com/) → Project Settings → General

### Firebase Admin SDK

```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

Get this from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key

### OpenAI API

```bash
OPENAI_API_KEY=sk-proj-...
OPENAI_REPORT_MODEL=gpt-4o
```

Get your API key from: [OpenAI Platform](https://platform.openai.com/api-keys)

### O*NET Web Services API

```bash
ONET_USERNAME=your-onet-username
ONET_PASSWORD=your-onet-password
```

Register for O*NET API access at: [O*NET Web Services](https://services.onetcenter.org/reference/)

**Current credentials for this project:**
- Username: `exploreyourself`
- Password: `3364miw`

## Security Best Practices

### ⚠️ Important: Never commit real credentials to Git

All environment files containing real credentials are already in `.gitignore`:
- `.env`
- `.env.*` (except `.env.example`)
- `cloudrun.env`
- `cloudrun.env.yaml`
- `cloudrun.env.backup`

### ✅ Safe to commit:
- `.env.example`
- `cloudrun.env.example`
- `cloudrun.env.yaml.example`

## Deployment

### Google Cloud Run

1. Set environment variables directly in Cloud Console:
   ```bash
   gcloud run services update vacare-app \
     --set-env-vars ONET_USERNAME=exploreyourself,ONET_PASSWORD=3364miw \
     --region=us-central1
   ```

2. Or use the env file during deployment:
   ```bash
   gcloud run deploy vacare-app \
     --env-vars-file=cloudrun.env.yaml \
     --region=us-central1
   ```

### Docker Compose

Environment variables are automatically loaded from `explore-yourself (6)/.env`

```bash
# Start services
make dev

# Or manually
docker-compose -f docker-compose.dev.yml up --build
```

## Troubleshooting

### Missing environment variables

If you see errors about missing environment variables:

1. Check that your `.env` file exists in the correct location
2. Verify all required variables are set
3. Restart your development server

### O*NET API authentication errors

If you get 401 errors from O*NET API:

1. Verify your credentials are correct
2. Check that environment variables are loaded:
   ```python
   import os
   print(os.getenv("ONET_USERNAME"))
   print(os.getenv("ONET_PASSWORD"))
   ```

### Firebase initialization errors

If Firebase fails to initialize:

1. Verify `FIREBASE_SERVICE_ACCOUNT_KEY` is valid JSON
2. Check that the service account has the necessary permissions
3. Ensure the Firebase project ID matches your configuration

## Need Help?

- Check existing environment example files for reference
- Refer to [CLAUDE.md](./CLAUDE.md) for project-specific configuration
- See [README.md](./README.md) for general project documentation
