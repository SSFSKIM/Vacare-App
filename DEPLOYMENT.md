# Deployment Guide - O*NET Integration

This guide explains how to deploy the VA Care application with the new O*NET Web Services API integration to Google Cloud Run.

## Prerequisites

1. **Docker Desktop** - Must be running
2. **Google Cloud SDK** - `gcloud` CLI installed and configured
3. **Artifact Registry** - Access to `us-central1-docker.pkg.dev/vacare-1abb5/va-care`
4. **Environment Variables** - `cloudrun.env.yaml` with O*NET credentials

## Quick Deployment

### Option 1: Using the Deployment Script (Recommended)

```bash
# Make sure Docker Desktop is running first
./deploy.sh
```

The script will automatically:
1. ✅ Check Docker is running
2. 🏗️ Build the Docker image
3. 📤 Push to Artifact Registry
4. 🚀 Deploy to Cloud Run
5. 🏷️ Update the 'latest' tag

### Option 2: Manual Step-by-Step

#### Step 1: Build Docker Image

```bash
docker build --target production-cloudrun \
  -t us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:onet-integration .
```

**Note:** Build takes ~5-10 minutes depending on your machine.

#### Step 2: Push to Artifact Registry

```bash
docker push us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:onet-integration
```

**Verify the push:**
```bash
docker push us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:onet-integration 2>&1 | grep -E "(Pushed|digest)"
```

#### Step 3: Deploy to Cloud Run

```bash
gcloud run deploy vacare-app \
  --image us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:onet-integration \
  --region us-central1 \
  --platform managed \
  --env-vars-file cloudrun.env.yaml \
  --allow-unauthenticated
```

#### Step 4: Update Latest Tag

```bash
docker tag us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:onet-integration \
  us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:latest

docker push us-central1-docker.pkg.dev/vacare-1abb5/va-care/vacare-app:latest
```

## What's New in This Deployment

### Backend Changes
- ✅ New API endpoint: `/onet-career/overview/{onet_code}`
- ✅ O*NET Web Services API integration with httpx
- ✅ Career recommendation responses include `onet_code`
- ✅ Environment variables for O*NET credentials

### Frontend Changes
- ✅ New route: `/career/:onetCode`
- ✅ Career detail page component
- ✅ Clickable career recommendation cards
- ✅ Real-time occupation data from O*NET

### Environment Variables
```yaml
ONET_USERNAME: "exploreyourself"
ONET_PASSWORD: "3364miw"
```

## Testing the Deployment

1. **Navigate to the app:**
   ```bash
   gcloud run services describe vacare-app --region=us-central1 --format='value(status.url)'
   ```

2. **Complete an assessment:**
   - Go through Interest, Ability, Knowledge, or Skills assessment
   - Navigate to Results page

3. **Test O*NET integration:**
   - Click on "Careers" tab
   - Click on any career recommendation card
   - Verify the career detail page loads with:
     - Occupation title and O*NET code
     - Alternative job titles (Also Known As)
     - Job description (What They Do)
     - Typical tasks (On the Job)
     - Bright Outlook badge (if applicable)
     - Links to Knowledge/Skills/Abilities resources

4. **Expected behavior:**
   - Career cards with O*NET codes should be clickable
   - Clicking should navigate to `/career/{code}` page
   - Page should display real-time data from O*NET API

## Troubleshooting

### Docker Build Issues

**Problem:** Docker daemon not running
```
ERROR: Cannot connect to the Docker daemon
```

**Solution:**
```bash
# macOS
open -a Docker

# Wait for Docker Desktop to fully start, then retry
```

**Problem:** Build fails with dependency errors
```bash
# Clear Docker cache and rebuild
docker builder prune
docker build --no-cache --target production-cloudrun ...
```

### Deployment Issues

**Problem:** Environment variables not set
```
ERROR: env-vars-file not found
```

**Solution:**
```bash
# Make sure cloudrun.env.yaml exists
ls -la cloudrun.env.yaml

# Or copy from example
cp cloudrun.env.yaml.example cloudrun.env.yaml
# Edit with your credentials
```

**Problem:** O*NET API returns 401 Unauthorized
```bash
# Check environment variables are loaded
gcloud run services describe vacare-app --region=us-central1 --format='value(spec.template.spec.containers[0].env)'

# Verify ONET_USERNAME and ONET_PASSWORD are present
```

### Runtime Issues

**Problem:** Career detail page shows 404
- Check that the O*NET code is valid (format: XX-XXXX.XX)
- Verify O*NET API credentials are correct
- Check backend logs:
  ```bash
  gcloud run services logs read vacare-app --region=us-central1 --limit=50
  ```

**Problem:** No O*NET code in career recommendations
- This can happen if the occupation title doesn't match O*NET database
- Check backend logs for warnings about missing codes
- The card will still display but won't be clickable

## Rollback

If you need to rollback to a previous version:

```bash
# List recent revisions
gcloud run revisions list --service=vacare-app --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic vacare-app \
  --region=us-central1 \
  --to-revisions=REVISION_NAME=100
```

## Monitoring

### View Logs
```bash
# Real-time logs
gcloud run services logs tail vacare-app --region=us-central1

# Recent errors
gcloud run services logs read vacare-app --region=us-central1 --limit=50 | grep ERROR
```

### Check Service Status
```bash
gcloud run services describe vacare-app --region=us-central1
```

### View Metrics
- [Cloud Console - Cloud Run](https://console.cloud.google.com/run/detail/us-central1/vacare-app)
- Check request count, latency, and error rate

## Additional Resources

- [ENV_SETUP.md](./ENV_SETUP.md) - Environment variable configuration
- [CLAUDE.md](./CLAUDE.md) - Project documentation
- [O*NET Web Services API](https://services.onetcenter.org/reference/) - API documentation
