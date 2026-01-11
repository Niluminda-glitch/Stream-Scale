const fs = require('fs');

const content = `import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const connection = {
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
};

const VARIANTS = [
  { name: '360p', size: '640x360', bitrate: '800k' },
  { name: '720p', size: '1280x720', bitrate: '2500k' }
];

const worker = new Worker('video-transcoding', async (job) => {
  console.log('Processing job ' + job.id + '...');
  const { inputPath, videoId } = job.data;

  const outputDir = './videos/output/' + videoId;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    const promises = VARIANTS.map(async (variant) => {
      const variantDir = outputDir + '/' + variant.name;
      if (!fs.existsSync(variantDir)) fs.mkdirSync(variantDir);

      console.log('Starting ' + variant.name + ' transcode for ' + videoId + '...');

      const command = 'ffmpeg -i ' + inputPath + ' ' + 
        '-vf scale=' + variant.size + ' ' +
        '-b:v ' + variant.bitrate + ' ' +
        '-codec:v libx264 -codec:a aac ' +
        '-hls_time 10 ' +
        '-hls_playlist_type vod ' +
        '-hls_segment_filename "' + variantDir + '/segment%03d.ts" ' +
        '-start_number 0 ' +
        variantDir + '/index.m3u8';

      await execPromise(command);
      console.log('Finished ' + variant.name + ' for ' + videoId);
    });

    await Promise.all(promises);

    let masterPlaylistContent = '#EXTM3U\\n#EXT-X-VERSION:3\\n';
    
    VARIANTS.forEach(variant => {
      const bandwidth = parseInt(variant.bitrate) * 1000 * 1.2; 
      masterPlaylistContent += '#EXT-X-STREAM-INF:BANDWIDTH=' + bandwidth + ',RESOLUTION=' + variant.size + '\\n';
      masterPlaylistContent += variant.name + '/index.m3u8\\n';
    });

    fs.writeFileSync(outputDir + '/master.m3u8', masterPlaylistContent);
    console.log('Master playlist created for ' + videoId);

  } catch (error) {
    console.error('Job failed for ' + videoId + ':', error);
    throw error;
  }

}, { connection });

console.log('Worker is listening for jobs...');
`;

fs.writeFileSync('src/worker.ts', content);
