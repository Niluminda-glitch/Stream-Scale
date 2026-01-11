# StreamScale 🚀

**StreamScale** is a distributed, scalable video transcoding system capable of transcodng video into adaptive bitrate HLS streams (360p, 720p) and orchestrating uploads to S3-compatible storage (MinIO). It features a robust job queue system and a reactive real-time dashboard.

![StreamScale Dashboard](https://via.placeholder.com/800x400?text=StreamScale+Dashboard+Preview)

## 📁 Repository Structure

- **/src** (Backend): Node.js/Express API & BullMQ Worker
- **/frontend** (Frontend): Next.js 14 Dashboard UI
- **docker-compose.yml**: Infrastructure (Redis + MinIO)

---

## 🛠️ Prerequisites

- **Docker & Docker Compose**
- **Node.js** (v18+)
- **FFmpeg** (Must be installed and in system PATH)

---

## 🚀 Getting Started

### 1. Start Infrastructure
Spin up the required services (Redis for queues, MinIO for storage).
```bash
docker-compose up -d
```
*Access MinIO Console at http://localhost:9001 (User: admin / Pass: password123)*

### 2. Start the Backend API
The API handles video upload requests and status polling.
```bash
# From root directory
npm install
npm run start:api
```
*API runs on: http://localhost:3000*

### 3. Start the Transcoding Worker
The worker processes jobs from the queue, runs FFmpeg, and uploads to MinIO.
```bash
# From root directory (open new terminal)
npm run start:worker
```

### 4. Start the Frontend Dashboard
Launch the reactive UI to upload and watch videos.
```bash
# Go to frontend folder
cd frontend
npm install
npm run dev
```
*UI runs on: http://localhost:3001 (or 3000)*

---

## 🎯 Usage

1.  Open the Dashboard in your browser.
2.  Enter a unique **Project ID** (e.g., `demo-video-1`).
3.  Click **Process Video**.
4.  Watch the status update in real-time:
    -   **Waiting**: Job queued in Redis.
    -   **Transcoding**: Worker is converting video to HLS.
    -   **Completed**: Video is live!
5.  The HLS Player will appear automatically when ready.

---

## 🔧 Configuration

**Environment Variables (.env)**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
AWS_ACCESS_KEY_ID=admin
AWS_SECRET_ACCESS_KEY=password123
AWS_REGION=us-east-1
BUCKET_NAME=stream-bucket
S3_ENDPOINT=http://localhost:9000
```

---

## 🏗️ Architecture

1.  **Client** submits ID to API.
2.  **API** pushes job to Redis (BullMQ).
3.  **Worker** pulls job, downloads source, runs FFmpeg (360p/720p).
4.  **MinIO** stores the HLS segments (.m3u8, .ts).
5.  **Client** polls API for status and plays stream via HLS.js.

---

## 📜 License

MIT
