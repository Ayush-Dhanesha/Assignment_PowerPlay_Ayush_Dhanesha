# 🚀 Docker Deployment to Google Cloud Run

## Current Deployment

**Live API:** https://ticketboss-api-j3ocwoeisq-el.a.run.app  
**Docker Hub:** https://hub.docker.com/r/ayushdhanesha/ticketboss  
**Region:** asia-south1 (Mumbai, India)

---

## Prerequisites

- Docker Desktop installed and running
- Docker Hub account (username: `ayushdhanesha`)
- Google Cloud account with billing enabled
- gcloud CLI installed
- MongoDB Atlas connection string

---

## Step 1: Build & Push to Docker Hub

```bash
docker buildx build --platform linux/amd64 --provenance=false --sbom=false \
  -t ayushdhanesha/ticketboss:1.0 --push .
```

**Why `linux/amd64`?** Cloud Run only supports AMD64 architecture.

---

## Step 2: Verify Image

```bash
docker buildx imagetools inspect ayushdhanesha/ticketboss:1.0
```

Look for: `application/vnd.docker.distribution.manifest.v2+json`

---

## Step 3: Setup GCP

```bash
# Login to GCP
gcloud auth login

# Set project
gcloud config set project project-26bc5042-f05e-4d33-9cc

# Enable required services
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

---

## Step 4: Deploy to Cloud Run

```bash
gcloud run deploy ticketboss-api \
--image docker.io/ayushdhanesha/ticketboss:1.0 \
--platform managed \
--region asia-south1 \
--allow-unauthenticated \
--set-env-vars "PORT=8080,MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ticketboss?retryWrites=true&w=majority"
```

**Important:** 
- Wrap `--set-env-vars` in quotes if URI contains special characters
- Replace MongoDB URI with your actual connection string

---

## Step 5: Get Service URL

```bash
gcloud run services describe ticketboss-api \
  --region asia-south1 \
  --format 'value(status.url)'
```

---

## Step 6: Test Deployment

```bash
# Health check
curl $(gcloud run services describe ticketboss-api --region asia-south1 --format 'value(status.url)')/health

# Create reservation
curl -X POST $(gcloud run services describe ticketboss-api --region asia-south1 --format 'value(status.url)')/reservations \
  -H "Content-Type: application/json" \
  -d '{"partnerId":"test","seats":5}'
```

---

## Update Deployment

When you make code changes:

```bash
# 1. Build new version
docker buildx build --platform linux/amd64 --provenance=false --sbom=false \
  -t ayushdhanesha/ticketboss:1.1 --push .

# 2. Deploy update
gcloud run deploy ticketboss-api \
  --image docker.io/ayushdhanesha/ticketboss:1.1 \
  --region asia-south1
```

---

## Deployment Details

| Setting | Value |
|---------|-------|
| Platform | Google Cloud Run (Fully Managed) |
| Region | asia-south1 (Mumbai) |
| Container Port | 8080 |
| Memory | 512 MiB |
| CPU | 1 vCPU |
| Min Instances | 0 (scales to zero) |
| Max Instances | 10 |
| Timeout | 300 seconds |
| Ingress | All traffic |
| Authentication | Allow unauthenticated |

---

## Monitoring

View logs:
```bash
gcloud run services logs read ticketboss-api --region asia-south1 --limit 50
```

View in GCP Console:
https://console.cloud.google.com/run?project=project-26bc5042-f05e-4d33-9cc

---

## Troubleshooting

**Build fails:**
- Make sure Docker Desktop is running
- Check `package-lock.json` is not in `.dockerignore`

**Deploy fails:**
- Verify billing is enabled in GCP
- Check MongoDB URI is correctly formatted
- Ensure port 8080 is exposed in Dockerfile

**Connection issues:**
- Whitelist `0.0.0.0/0` in MongoDB Atlas Network Access
- Verify MongoDB connection string is correct

---

## Cost Estimate

- **Free tier:** 2 million requests/month
- **Scaling:** $0 when not in use (scales to zero)
- **Typical cost:** $0-5/month for development/testing

---

## Files

- `Dockerfile` - Container definition
- `.dockerignore` - Files excluded from build
- `DEPLOY.md` - This deployment guide
- `README.md` - Complete API documentation

