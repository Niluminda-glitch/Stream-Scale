import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = {
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
};

// This is the queue where we will push video jobs
export const videoQueue = new Queue('video-transcoding', { connection });