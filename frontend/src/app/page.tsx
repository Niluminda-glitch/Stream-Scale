"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { 
  UploadCloud, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Play, 
  Film 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
interface StatusResponse {
  state: string; // waiting, active, completed, failed
  progress?: number;
}

type StepStatus = 'idle' | 'loading' | 'completed' | 'error';

// --- Components ---

const StatusStep = ({ 
  icon: Icon, 
  label, 
  status, 
  delay = 0 
}: { 
  icon: any, 
  label: string, 
  status: StepStatus, 
  delay?: number 
}) => {
  return (
    <div className="flex flex-col items-center gap-2 relative z-10 w-24">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0.5 }}
        animate={{ 
          scale: status === 'loading' ? 1.1 : 1, 
          opacity: status === 'idle' ? 0.5 : 1,
          borderColor: status === 'completed' ? '#10B981' : status === 'loading' ? '#8B5CF6' : '#374151'
        }}
        transition={{ duration: 0.5 }}
        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-gray-900 shadow-xl ${
          status === 'loading' ? 'shadow-purple-500/50' : ''
        }`}
      >
        <Icon 
          size={20} 
          className={
            status === 'completed' ? 'text-green-500' : 
            status === 'loading' ? 'text-purple-400' : 
            'text-gray-500'
          } 
        />
      </motion.div>
      <span className={`text-xs font-medium uppercase tracking-wider ${
        status === 'completed' ? 'text-green-500' : 
        status === 'loading' ? 'text-purple-400' : 
        'text-gray-600'
      }`}>{label}</span>
    </div>
  );
};

// --- Main Page ---

export default function Home() {
  const [videoId, setVideoId] = useState("");
  const [status, setStatus] = useState<string>("idle"); 
  const [logs, setLogs] = useState<string[]>([]);
  const videoNode = useRef<HTMLVideoElement>(null);
  const player = useRef<any>(null);

  // Status mapping for the visual stepper
  const getStepStatus = (stepName: string): StepStatus => {
    if (status === 'error') return 'error';
    if (status === 'completed') return 'completed';
    
    // Upload Step
    if (stepName === 'upload') {
      if (status === 'uploading') return 'loading';
      if (['processing', 'completed'].includes(status)) return 'completed';
    }
    // Process Step
    if (stepName === 'process') {
      if (status === 'processing') return 'loading';
      if (status === 'completed') return 'completed';
    }
    // Ready Step
    if (stepName === 'ready') {
      if (status === 'completed') return 'completed';
    }
    return 'idle';
  };

  const addLog = (msg: string) => {
    setLogs((prev) => [`> ${msg}`, ...prev].slice(0, 50));
  };

  const handleUpload = async () => {
    if (!videoId) return;
    setStatus("uploading");
    setLogs([]);
    addLog(`Initializing request for: ${videoId}...`);
    
    try {
      await axios.post("http://localhost:3000/upload", { videoId });
      addLog("API Acknowledgement received.");
      addLog("Video queued for processing.");
      setStatus("processing");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      addLog(`ERR: ${err.message}`);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === "processing") {
      interval = setInterval(async () => {
        try {
          const res = await axios.get<StatusResponse>(`http://localhost:3000/status/${videoId}`);
          const jobState = res.data.state;

          if (jobState === "active") addLog("Worker: Currently transcoding (FFmpeg)...");
          if (jobState === "completed") {
            setStatus("completed");
            addLog("Worker: Process completed successfully.");
            addLog("Storage: Manifest uploaded to MinIO.");
            clearInterval(interval);
          } else if (jobState === "failed") {
            setStatus("error");
            addLog("Worker: Job failed.");
            clearInterval(interval);
          }
        } catch (err) {
          // ignore polling errors
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [status, videoId]);

  useEffect(() => {
    if (status === "completed" && videoNode.current) {
      const videoSrc = `http://localhost:9000/stream-bucket/videos/${videoId}/master.m3u8`;
      addLog(`Stream Ready: ${videoSrc}`);

      if (player.current) {
        player.current.dispose();
        player.current = null;
      }

      player.current = videojs(videoNode.current, {
        controls: true,
        autoplay: true,
        preload: "auto",
        fluid: true,
        sources: [{ src: videoSrc, type: "application/x-mpegURL" }]
      });

      return () => {
        if (player.current) player.current.dispose();
      };
    }
  }, [status, videoId]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans selection:bg-purple-500/30">
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative max-w-5xl mx-auto p-8 space-y-12">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/50">
              <Film className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                StreamScale
              </h1>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                Distributed Transcoding Engine
              </p>
            </div>
          </div>
          <div className="hidden md:flex gap-2">
            <div className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-full text-xs font-medium text-green-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Redis Online
            </div>
            <div className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-full text-xs font-medium text-blue-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              MinIO Storage
            </div>
          </div>
        </header>

        {/* Input & Stepper Section */}
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Controls */}
          <div className="col-span-1 bg-gray-900/50 backdrop-blur-xl border border-gray-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              <label className="text-sm font-medium text-gray-400 ml-1">Job ID</label>
              <input 
                type="text"
                placeholder="e.g. video-01"
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                disabled={status !== 'idle' && status !== 'error' && status !== 'completed'}
                className="mt-2 w-full bg-black/50 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-gray-700 font-mono"
              />
              <p className="text-xs text-gray-600 mt-2 px-1">
                This triggers a simulation of a raw video upload to S3 ingestion bucket.
              </p>
            </div>

            <button 
              onClick={handleUpload}
              disabled={!videoId || status === 'uploading' || status === 'processing'}
              className="mt-8 w-full group relative overflow-hidden bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center gap-2">
                {status === 'processing' || status === 'uploading' ? (
                  <>
                    <Activity className="animate-spin" size={18} /> Processing
                  </>
                ) : (
                  <>
                     Run Pipeline <Play size={16} className="fill-current" />
                  </>
                )}
              </div>
            </button>
          </div>

          {/* Visualization Area */}
          <div className="col-span-2 relative">
            
            {/* Connecting Line */}
            <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-gray-800 -translate-y-8 z-0">
               <motion.div 
                 className="h-full bg-gradient-to-r from-purple-500 to-blue-500" 
                 initial={{ width: 0 }}
                 animate={{ width: status === 'completed' ? '100%' : status === 'processing' ? '50%' : '0%' }}
                 transition={{ duration: 1 }}
               />
            </div>

            {/* Stepper Steps */}
            <div className="relative z-10 grid grid-cols-3 h-32 pt-6">
              <StatusStep 
                icon={UploadCloud} 
                label="Ingestion" 
                status={getStepStatus('upload')} 
              />
              <div className="flex justify-center">
                 <StatusStep 
                  icon={Activity} 
                  label="Transcoding" 
                  status={getStepStatus('process')} 
                />
              </div>
              <div className="flex justify-end">
                <StatusStep 
                  icon={CheckCircle2} 
                  label="Completed" 
                  status={getStepStatus('ready')} 
                />
              </div>
            </div>

            {/* Log Output - Terminal Style */}
            <div className="bg-black border border-gray-800 rounded-xl p-4 h-48 font-mono text-xs overflow-hidden shadow-inner flex flex-col">
              <div className="flex items-center gap-2 text-gray-500 border-b border-gray-800 pb-2 mb-2">
                <Terminal size={12} />
                <span>system.logs</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar">
                <AnimatePresence>
                  {logs.length === 0 && <span className="text-gray-800">Waiting for events...</span>}
                  {logs.map((log, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-gray-300"
                    >
                      {log}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

          </div>
        </div>

        {/* Player Section - Appears only when ready */}
        <AnimatePresence>
          {status === 'completed' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/5"
            >
              <div className="bg-gradient-to-r from-gray-900 to-black px-6 py-4 flex justify-between items-center border-b border-gray-800">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                   <span className="font-semibold text-sm">Live HLS Stream</span>
                </div>
                <div className="text-xs text-gray-500 font-mono">{videoId} • Adaptive Bitrate</div>
              </div>
              
              <div className="aspect-video bg-black relative">
                <div data-vjs-player>
                  <video ref={videoNode} className="video-js vjs-big-play-centered vjs-theme-sea" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}