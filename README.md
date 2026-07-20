# AI Powered Media Processing Microservice

This application lets users upload images and automatically extracts useful details from them using AI. It processes files in the background without making the user wait.

## System Architecture

Here is how the main parts of the system connect with each other:

```
[ Web Browser ]
      |
      | HTTP Requests
      v
[ Frontend (React + Vite) ] (Port 3000)
      |
      | REST API Calls
      v
[ API Server (Express + Node.js) ] (Port 5000)
      |           |           |
      | Stores    | Sends     | Uploads
      | Data      | Jobs      | Files
      v           v           v
  [MongoDB]   [ Redis ]    [ MinIO ]
  Database     Queue       Storage
                  |
                  | Picks Up Jobs
                  v
       [ Worker Service (Node.js + BullMQ) ]
                  |
    +-------------+-------------+
    |                           |
[ Hugging Face / OpenAI ]   [ OpenAI ]
   Image Captioning        Labels & Safety
```

### Main Components

* **Frontend**: A simple web user interface built with React where users can sign up, log in, upload images, view past jobs, check AI results, and see notifications.
* **API Server**: An Express server that handles user accounts, checks security, receives file uploads, and sends jobs to the background queue.
* **Worker**: A background process powered by BullMQ that runs three AI tasks on every uploaded image:
  1. **Image Captioning**: Generates a short sentence describing the image using Hugging Face (Salesforce BLIP model) with an automatic backup to OpenAI.
  2. **Object and Label Detection**: Finds key objects and concepts in the image using OpenAI vision models.
  3. **Content Safety Check**: Scans the image for unsafe content using OpenAI Moderation API.
* **MongoDB**: A database that holds user details, job progress, AI results, and user notifications.
* **Redis**: A fast in-memory store used by BullMQ to manage background jobs.
* **MinIO**: A local file storage server that works just like Amazon S3 to store uploaded images safely.

## How to Run Locally

### Option 1: Run Everything with Docker (Recommended)

Make sure you have Docker and Docker Compose installed on your computer.

1. Open your terminal and go to the project directory.
2. Copy the sample environment file to create your local environment file:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` in any text editor and fill in your API keys (see the API Keys section below).
4. Run this command to start all services:
   ```bash
   docker compose up --build
   ```
5. Open your web browser and go to `http://localhost:3000`.

### Option 2: Run Without Docker

If you prefer to run services individually, start your local MongoDB, Redis, and MinIO instances first, then run these commands in separate terminal windows:

* **Start the API server**:
  ```bash
  cd api
  npm install
  npm run dev
  ```
* **Start the Worker process**:
  ```bash
  cd worker
  npm install
  npm run dev
  ```
* **Start the Frontend website**:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```

### Running Automated Tests

* **Run API integration tests** (testing auth, file uploads, jobs, and notifications):
  ```bash
  cd api
  npm test
  ```

* **Run Worker pipeline tests** (testing AI services, retry behavior, and processor execution):
  ```bash
  cd worker
  npm test
  ```

## Environment Variables and API Keys

### Environment Variables List

| Variable Name | Required | What It Is Used For | Default Value |
|---|---|---|---|
| JWT_ACCESS_SECRET | Yes | Secret code used to lock short-term login tokens | (Set your own random string) |
| JWT_REFRESH_SECRET | Yes | Secret code used to lock long-term login tokens | (Set your own random string) |
| OPENAI_API_KEY | Yes | Your secret key for OpenAI (used for label detection, content safety, and caption backup) | (None) |
| HF_API_KEY | Optional | Your secret key for Hugging Face (used for BLIP image captioning) | (None) |
| MONGODB_URI | No | Connection link for MongoDB | mongodb://localhost:27017/camarin |
| REDIS_URL | No | Connection link for Redis queue | redis://localhost:6379 |
| MINIO_ENDPOINT | No | Host address for local MinIO file storage | localhost |
| MINIO_PORT | No | Port for local MinIO file storage | 9000 |
| MINIO_ACCESS_KEY | No | Access key for MinIO storage | minioadmin |
| MINIO_SECRET_KEY | No | Secret key for MinIO storage | minioadmin |

### How to Get Your API Keys

#### 1. OpenAI API Key
1. Go to the OpenAI website at `https://platform.openai.com`.
2. Sign up or log into your account.
3. In the left navigation menu, click on **API Keys**.
4. Click **Create new secret key**, give it a name, and copy the key string.
5. Paste this key into `OPENAI_API_KEY` inside your `.env` file.

#### 2. Hugging Face API Key
1. Go to the Hugging Face website at `https://huggingface.co`.
2. Sign up or log into your account.
3. Click your profile picture at the top right and go to **Settings** -> **Access Tokens**.
4. Click **Create new token**, select **Read** access, and copy the token.
5. Paste this token into `HF_API_KEY` inside your `.env` file.

## Assumptions and Design Choices

Here are the key decisions made while building this microservice:

### 1. Authentication Choice: JWT with Refresh Tokens
We used JSON Web Tokens (JWT). Short term access tokens last 15 minutes and stay in memory, while long term refresh tokens last 7 days and sit safely in HTTP-only cookies. This keeps the API stateless so it can scale easily without needing sticky server sessions.

### 2. Queue Choice: BullMQ with Redis
We used BullMQ powered by Redis to handle background jobs. When a user uploads an image, the API creates a job record in the database, puts the job in the Redis queue, and immediately returns a job ID to the user. The background worker picks up the job and processes it. If an external AI provider fails temporarily, BullMQ automatically retries up to 3 times with a smart waiting period.

### 3. File Storage Choice: MinIO for Local and AWS S3 for Cloud
We used MinIO for local development because it works just like Amazon S3 without requiring cloud setup or billing. Uploaded images are stored in a dedicated storage bucket. Switching to real Amazon S3 in production requires updating only four configuration values.

### 4. Frontend Job Status Updates: Polling
The React web interface polls the API every 3 seconds while a job is running. Once the job completes or fails, polling stops automatically. Polling was chosen because it is simple, reliable, and does not require complex WebSocket infrastructure while keeping server load light.

### 5. Flagged Content Handling: In-App Notifications
If the safety check detects unsafe content in any category (such as violence or adult content), the job is marked as flagged. An in-app notification is automatically created for the user. The frontend polls for new notifications and shows a red badge count on the header icon.

### 6. AI Pipeline Reliability
The AI pipeline runs three steps in order for every image: Image Captioning, Object Detection, and Content Safety Check. To make sure captioning never blocks processing, the worker attempts the Hugging Face BLIP model first. If Hugging Face is unavailable or slow, it smoothly falls back to OpenAI vision.

## Known Limitations and Future Improvements

* **Public File Access**: Local storage currently allows direct public image links for simple testing. In production, we should use temporary signed S3 links that expire after one hour.
* **Global Rate Limiting**: The current system limits overall request rates per IP address. In production, we should add per-user daily upload limits.
* **Notification Options**: Notifications currently appear in the web application interface. Adding email alerts would help notify users who navigate away from the app.
* **Search and Filtering**: Users can view past jobs sorted by date. Adding a search bar for image captions and labels would make finding past uploads even faster.

## Scalability Notes (How the System Handles High Load)

* **Scaling Workers**: If thousands of users upload images at once, we can run multiple worker containers (`docker compose up --scale worker=5`). BullMQ automatically distributes incoming jobs across all available workers.
* **Scaling the API**: The API server is completely stateless. We can run multiple API instances behind a load balancer to handle heavy traffic.
* **Database Efficiency**: MongoDB has indexed fields on user IDs and job statuses, ensuring fast database lookups even with millions of job records.

## API Collection and Documentation

You can view and test all API endpoints using either of these formats:

* **OpenAPI / Swagger Spec**: See [openapi.yaml](file:///Users/sayamkumar/Downloads/Camarin%20AI%20Assessment/camarin-ai-assessment/openapi.yaml) for the full OpenAPI 3.0 specification covering authentication, file upload, job querying, retry, and notifications.
* **Postman Collection**: Import [postman_collection.json](file:///Users/sayamkumar/Downloads/Camarin%20AI%20Assessment/camarin-ai-assessment/postman_collection.json) directly into Postman (File -> Import -> select postman_collection.json) to quickly test all endpoints.