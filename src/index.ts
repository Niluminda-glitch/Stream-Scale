import express from 'express';
import cors from 'cors';
import { videoQueue } from './queue';

const app = express();
app.use(express.json());
app.use(cors()); 

// Serve the videos folder statically
app.use('/videos', express.static('videos'));

app.post('/upload', async (req, res) => {
  // In a real app, this comes from an S3 upload event or a file upload.
  // For now, we simulate a file path on your disk.
  const { videoId } = req.body;

  if (!videoId) {
    return res.status(400).json({ error: 'Video ID required' });
  }

  // Add job to the queue
  console.log(`Creating job with ID: ${videoId}`);
  const job = await videoQueue.add('transcode', {
    videoId: videoId,
    // We will create a sample video file later to test this
    inputPath: `./videos/${videoId}.mp4`
  }, {
    jobId: videoId
  });
  console.log(`Job created. Returned ID: ${job.id}`);

  return res.json({ 
    message: 'Video upload started. Processing in background.',
    jobId: videoId 
  });
});

app.get('/status/:id', async (req, res) => {
  const jobId = req.params.id;
  const job = await videoQueue.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const state = await job.getState(); // queued, active, completed, failed
  const progress = job.progress;

  res.json({ 
    id: jobId, 
    state, 
    progress 
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});