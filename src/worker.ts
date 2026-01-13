import { Worker } from 'bullmq';
import { S3Client, PutObjectCommand, CreateBucketCommand, PutBucketPolicyCommand, HeadBucketCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execPromise = util.promisify(exec);
const BUCKET_NAME = process.env.BUCKET_NAME || 'stream-bucket';

const connection = {
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null
};

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'admin',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'password123'
  },
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  forcePathStyle: true
});

async function ensureBucketExists() {
  try {
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
      // console.log(`Bucket ${BUCKET_NAME} exists.`);
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        console.log(`Bucket ${BUCKET_NAME} not found. Creating...`);
        await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
        console.log(`Bucket ${BUCKET_NAME} created.`);
        
        // Set Public Policy
        const policy = {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: "*",
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
            }
          ]
        };
        
        await s3Client.send(new PutBucketPolicyCommand({
          Bucket: BUCKET_NAME,
          Policy: JSON.stringify(policy)
        }));
        console.log(`Public access policy set for ${BUCKET_NAME}.`);

        // Set CORS Policy
        await s3Client.send(new PutBucketCorsCommand({
          Bucket: BUCKET_NAME,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedHeaders: ["*"],
                AllowedMethods: ["GET", "HEAD"],
                AllowedOrigins: ["*"],
                ExposeHeaders: []
              }
            ]
          }
        }));
        console.log(`CORS configuration set for ${BUCKET_NAME}.`);
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error("Error ensuring bucket exists:", err);
  }
}

const VARIANTS = [
  { name: '360p', size: '640x360', bitrate: '800k' },
  { name: '720p', size: '1280x720', bitrate: '2500k' }
];

async function uploadDirToS3(localDir: string, s3Prefix: string) {
  const files = fs.readdirSync(localDir);
  for (const file of files) {
    const fullPath = path.join(localDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      await uploadDirToS3(fullPath, s3Prefix + '/' + file);
      continue;
    }
    
    const s3Key = s3Prefix + '/' + file;
    //console.log(`Uploading ${s3Key}...`);
    const content = fs.readFileSync(fullPath);
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME || 'stream-bucket',
      Key: s3Key,
      Body: content
    }));
  }
}

const worker = new Worker('video-transcoding', async (job) => {
  console.log(`[Job ${job.id}] Processing video upload...`);
  const { inputPath, videoId } = job.data;
  const outputDir = path.join('videos', 'output', videoId);

  // Clean output directory
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    // 1. Transcode
    const promises = VARIANTS.map(async (variant) => {
      const variantDir = path.join(outputDir, variant.name);
      if (!fs.existsSync(variantDir)) fs.mkdirSync(variantDir);
      
      const args = [
        '-i', inputPath,
        '-vf', `scale=${variant.size}`,
        '-b:v', variant.bitrate,
        '-codec:v', 'libx264',
        '-codec:a', 'aac',
        '-hls_time', '10',
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', path.join(variantDir, 'segment%03d.ts'),
        '-start_number', '0',
        path.join(variantDir, 'index.m3u8')
      ];
      
      const cmd = `ffmpeg ${args.join(' ')}`;
      console.log(`[Job ${job.id}] Running: ${cmd}`);
      await execPromise(cmd);
    });

    await Promise.all(promises);

    // 2. Create Master Playlist
    let masterContent = '#EXTM3U\n#EXT-X-VERSION:3\n';
    VARIANTS.forEach(v => {
      const bandwidth = parseInt(v.bitrate) * 1000 * 1.2; // roughly estimated
      masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${v.size}\n${v.name}/index.m3u8\n`;
    });
    fs.writeFileSync(path.join(outputDir, 'master.m3u8'), masterContent);

    // 3. Upload to MinIO
    console.log(`[Job ${job.id}] Uploading to MinIO bucket: ${process.env.BUCKET_NAME || 'stream-bucket'}`);
    await uploadDirToS3(outputDir, `videos/${videoId}`);
    
    console.log(`[Job ${job.id}] COMPLETED. Stream available at: ${process.env.S3_ENDPOINT || 'http://localhost:9000'}/${process.env.BUCKET_NAME || 'stream-bucket'}/videos/${videoId}/master.m3u8`);
    
  } catch (error) {
    console.error(`[Job ${job.id}] FAILED:`, error);
    throw error;
  }
}, { 
  connection,
  concurrency: 1
});

worker.on('ready', () => {
    console.log('Worker is listening for jobs...');
    ensureBucketExists();
});

worker.on('error', (err) => {
    console.error('Worker error:', err);
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with ${err.message}`);
});