# StreamScale

**StreamScale** is a distributed, scalable video transcoding system that mimics the core architecture of platforms like Netflix or YouTube. It handles video uploads, queues them for processing, transcodes them into adaptive bitrate HLS streams, and stores them in Object Storage (MinIO/S3).

It includes a **Backend API**, a **Background Worker**, and a **Next.js Frontend Dashboard**.

## 🚀 Features
*   **Upload API**: Endpoint to accept video IDs and queue jobs.
*   **Redis Queue**: Setup with BullMQ for robust job processing.
*   **Scalable Workers**: Background workers that transcode video using FFmpeg.
*   **Adaptive Bitrate**: Generates 360p and 720p HLS playlists (`.m3u8`).
*   **Object Storage**: Uploads chunks to MinIO (S3 Compatible).
*   **Reactive UI**: Next.js dashboard with real-time polling and embedded HLS player.

---

## 🛠️ Tech Stack
*   **Frontend**: Next.js 14, Tailwind CSS, Video.js, Axios.
*   **Backend**: Node.js, Express, BullMQ (Redis), Simple Storage Service (AWS SDK v3).
*   **Infrastructure**: Docker (Redis, MinIO).
*   **Processing**: FFmpeg.

---

## 📂 Project Structure
```bash
Stream-Scale/
├── src/               # Backend API & Worker Code
│   ├── index.ts       # Express API Entry point
│   ├── worker.ts      # BullMQ Worker (FFmpeg Logic)
│   ├── queue.ts       # Shared Queue Config
├── stream-ui/         # Next.js Frontend Application
├── docker-compose.yml # Infrastructure (Redis + MinIO)
├── package.json       # Backend Dependencies
└── ...
```

---

## ⚡ Getting Started

### 1. Prerequisites
*   Node.js (v18+)
*   Docker & Docker Compose
*   FFmpeg installed on your host machine (or run worker in Docker).

### 2. Start Infrastructure
Start Redis and MinIO:
```bash
docker-compose up -d
```
*   **MinIO Console**: http://localhost:9001 (User: `admin`, Pass: `password123`)

### 3. Start Backend
Run the API Server (Terminal 1):
```bash
npm install
npm run start:api
```
Run the Worker (Terminal 2):
```bash
npm run start:worker
```

### 4. Start Frontend
Navigate to the UI folder and start the dev server (Terminal 3):
```bash
cd stream-ui
npm install
npm run dev
```
Open **http://localhost:3001** (or 3000) to view the dashboard.

---

## 🎥 How to Use
1.  Open the Dashboard.
2.  Enter a unique **Project ID** (e.g., `my-movie-1`).
3.  Click **Process Video**.
4.  The system will:
    *   Queue the job (Status: *Waiting*)
    *   Pick it up by the worker (Status: *Transcoding*)
    *   Transcode to HLS and Upload to MinIO.
    *   Finish (Status: *Completed*).
5.  Watch the video directly in the dashboard!

---

## 🔗 Repository
[https://github.com/Niluminda-glitch/Stream-Scale](https://github.com/Niluminda-glitch/Stream-Scale)
