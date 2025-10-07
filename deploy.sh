#!/bin/bash

# VA Care App - Cloud Run Deployment Script
# This script builds and deploys the application to Google Cloud Run

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="vacare-1abb5"
REGION="us-central1"
SERVICE_NAME="vacare-app"
REPOSITORY="va-care"
IMAGE_TAG="${1:-onet-integration}"  # Use first argument or default to 'onet-integration'
IMAGE_NAME="us-central1-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}:${IMAGE_TAG}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}VA Care - Cloud Run Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Project ID:    ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Region:        ${YELLOW}${REGION}${NC}"
echo -e "Service:       ${YELLOW}${SERVICE_NAME}${NC}"
echo -e "Image Tag:     ${YELLOW}${IMAGE_TAG}${NC}"
echo ""

# Step 1: Check Docker is running
echo -e "${GREEN}[1/5] Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker Desktop and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Step 2: Build Docker image using Docker Build Cloud
echo -e "${GREEN}[2/5] Building Docker image with Docker Build Cloud...${NC}"
echo -e "${YELLOW}Building in the cloud (faster, no local resources used)...${NC}"
docker build --builder cloud-minkim17-exploreyourself --target production-cloudrun -t "${IMAGE_NAME}" .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}✗ Docker build failed${NC}"
    exit 1
fi
echo ""

# Step 3: Push to Artifact Registry
echo -e "${GREEN}[3/5] Pushing image to Artifact Registry...${NC}"
docker push "${IMAGE_NAME}"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Image pushed successfully${NC}"
    # Get the digest
    DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' "${IMAGE_NAME}" | cut -d'@' -f2)
    echo -e "${YELLOW}Digest: ${DIGEST}${NC}"
else
    echo -e "${RED}✗ Push failed${NC}"
    exit 1
fi
echo ""

# Step 4: Deploy to Cloud Run
echo -e "${GREEN}[4/5] Deploying to Cloud Run...${NC}"
gcloud run deploy "${SERVICE_NAME}" \
    --image "${IMAGE_NAME}" \
    --region "${REGION}" \
    --platform managed \
    --env-vars-file cloudrun.env.yaml \
    --allow-unauthenticated

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Deployed successfully${NC}"
else
    echo -e "${RED}✗ Deployment failed${NC}"
    exit 1
fi
echo ""

# Step 5: Update latest tag
echo -e "${GREEN}[5/5] Updating 'latest' tag...${NC}"
LATEST_IMAGE="us-central1-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}:latest"
docker tag "${IMAGE_NAME}" "${LATEST_IMAGE}"
docker push "${LATEST_IMAGE}"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Latest tag updated${NC}"
else
    echo -e "${YELLOW}⚠ Latest tag update failed (non-critical)${NC}"
fi
echo ""

# Get service URL
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --format='value(status.url)')
echo -e "Service URL: ${YELLOW}${SERVICE_URL}${NC}"
echo ""
echo -e "${YELLOW}New features in this deployment:${NC}"
echo -e "  • O*NET Web Services API integration"
echo -e "  • Career detail pages with occupation overview"
echo -e "  • Clickable career recommendation cards"
echo -e "  • Real-time job information and outlook"
echo ""
echo -e "${GREEN}Test the deployment:${NC}"
echo -e "  1. Complete an assessment"
echo -e "  2. Go to Results > Careers tab"
echo -e "  3. Click on any career card to see detailed O*NET information"
echo ""
