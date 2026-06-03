"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Loader2, Send, PlayCircle, Users, Menu, X, Sparkles, 
  History, Video, ArrowRight, Trash2, Activity, PlusCircle, Bot,
  Link2, Zap, Quote, Mic, Volume2, VolumeX
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ──────────────────────────────────────────────
// TypeScript Interfaces
// ──────────────────────────────────────────────
interface VideoMetadata {
  title: string;
  views: number;
  likes: number;
  comments: number;
  creator: string;
  follower_count: number;
  hashtags: string[];
  upload_date: string;
  duration: number;
  platform: string;
  thumbnail: string;
  engagement_rate: number;
}

interface VectorChunk {
  id: string;
  text: string;
  metadata: {
    video_id: string;
    chunk_id: number;
    title: string;
    url: string;
  };
}

interface SourceChunk {
  video: string;
  chunk_id: number;
  text: string;
}

interface ChatMessage {
  role: string;
  content: string;
  chunks?: SourceChunk[];
}

interface AnalysisHistoryEntry {
  id: number;
  titleA: string;
  titleB: string;
  urlA: string;
  urlB: string;
  date: string;
}

// ──────────────────────────────────────────────
// Components
// ──────────────────────────────────────────────
const VideoCard = ({ platformLabel, data, icon }: { platformLabel: string, data: VideoMetadata | null, icon: React.ReactNode }) => {
  const formatDuration = (seconds: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    if (dateStr.length === 8) {
      return `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
    }
    return dateStr;
  };
  const formatNumber = (num: number) => {
    if (!num) return "N/A";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const [imgError, setImgError] = useState(false);
  const fallbackImg = data?.platform === 'instagram' 
    ? 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop' 
    : 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=1000&auto=format&fit=crop';
  
  const displayThumb = imgError || !data?.thumbnail ? fallbackImg : data.thumbnail;

  return (
    <article className="bg-surface-container-low border border-outline-variant rounded-lg p-6 flex flex-col gap-4 hover:bg-surface-container transition-colors h-full">
      <div className="flex justify-between items-center">
        <span className="font-label-caps text-[11px] text-on-surface-variant flex items-center gap-2 font-semibold">
          {icon} {platformLabel.toUpperCase()} METADATA
        </span>
        <span className="font-label-caps text-[11px] text-on-surface-variant flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${data?.platform === 'instagram' ? 'bg-[#e1306c]' : 'bg-[#ff0000]'}`}></span>
          {(data?.platform || platformLabel).toUpperCase()}
        </span>
      </div>
      <div className="w-full h-48 rounded bg-surface-container-high relative overflow-hidden group">
        <img 
          src={displayThumb} 
          alt="Thumbnail" 
          onError={() => setImgError(true)}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300" 
        />
        {data?.duration ? (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-mono px-2 py-0.5 rounded">{formatDuration(data.duration)}</span>
        ) : null}
        <div className="absolute inset-0 border border-outline-variant/30 rounded pointer-events-none"></div>
      </div>
      <div>
        <h3 className="font-headline-md text-lg font-semibold text-on-surface mb-1 truncate">{data?.title || `Video ${platformLabel}`}</h3>
        <p className="font-body-md text-xs text-on-surface-variant flex items-center gap-2">
          <span>{data?.creator || "Unknown Creator"}</span>
          <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
          <span>{formatDate(data?.upload_date ?? "")}</span>
        </p>
      </div>
      <div className="mt-2">
        <div className="flex justify-between items-end mb-2">
          <span className="font-label-caps text-[11px] text-on-surface-variant font-semibold">ENGAGEMENT RATE</span>
          <span className={`font-data-display text-2xl font-bold leading-none ${platformLabel === 'YouTube' ? 'text-primary' : 'text-secondary'}`}>
            {data?.engagement_rate ? `${data.engagement_rate.toFixed(1)}%` : "N/A"}
          </span>
        </div>
        <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${platformLabel === 'YouTube' ? 'bg-[#6366f1]' : 'bg-secondary'}`} style={{ width: `${Math.min((data?.engagement_rate || 0) * 5, 100)}%` }}></div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 font-label-caps text-[10px] text-on-surface-variant font-semibold">
          <span>VIEWS: {formatNumber(data?.views ?? 0)}</span>
          <span>LIKES: {formatNumber(data?.likes ?? 0)}</span>
          <span>COMMENTS: {formatNumber(data?.comments ?? 0)}</span>
          <span>FOLLOWERS: {formatNumber(data?.follower_count ?? 0)}</span>
        </div>
        {data?.hashtags && data.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-outline-variant/30">
            {data.hashtags.slice(0, 8).map((tag: string, i: number) => (
              <span key={i} className="text-[10px] bg-surface-container px-2 py-0.5 rounded text-on-surface-variant border border-outline-variant/50">#{tag}</span>
            ))}
            {data.hashtags.length > 8 && (
              <span className="text-[10px] text-on-surface-variant/50">+{data.hashtags.length - 8} more</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

const VectorIndex = ({ chunks }: { chunks: VectorChunk[] }) => {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  
  const filteredChunks = chunks.filter(c => {
    if (filter === "A" && c.metadata?.video_id !== "A") return false;
    if (filter === "B" && c.metadata?.video_id !== "B") return false;
    if (search && !c.text?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mt-6 flex flex-col h-[500px] border border-outline-variant bg-surface-container-low rounded-xl overflow-hidden shrink-0">
      <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container/50">
        <h3 className="font-headline-md font-bold text-on-surface text-base">KNOWLEDGE BASE</h3>
        <span className="flex items-center gap-1.5 font-label-caps text-[10px] text-teal-400 bg-teal-400/10 px-2 py-1 rounded border border-teal-400/20">
          <Activity size={12} className="animate-pulse" /> ACTIVE
        </span>
      </div>
      <div className="p-4 border-b border-outline-variant flex flex-col gap-4">
        <input 
          type="text" 
          placeholder="Search transcript chunks..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface-container border border-outline-variant text-on-surface text-sm rounded-lg px-4 py-2 focus:border-primary focus:outline-none placeholder:text-on-surface-variant/50"
        />
        <div className="flex gap-2">
          <button onClick={() => setFilter("ALL")} className={`text-[10px] font-label-caps px-3 py-1.5 rounded transition-colors ${filter === "ALL" ? "bg-primary text-white" : "bg-surface-container hover:bg-surface-bright text-on-surface-variant"}`}>ALL CHUNKS</button>
          <button onClick={() => setFilter("A")} className={`text-[10px] font-label-caps px-3 py-1.5 rounded transition-colors ${filter === "A" ? "bg-primary text-white" : "bg-surface-container hover:bg-surface-bright text-on-surface-variant"}`}>VIDEO A</button>
          <button onClick={() => setFilter("B")} className={`text-[10px] font-label-caps px-3 py-1.5 rounded transition-colors ${filter === "B" ? "bg-primary text-white" : "bg-surface-container hover:bg-surface-bright text-on-surface-variant"}`}>VIDEO B</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3 bg-background">
        {filteredChunks.map((chunk, i) => {
          let timestamp = "";
          let text = chunk.text || "";
          const timeMatch = text.match(/\[(\d+:\d{2}(?:\s*-\s*\d+:\d{2})?)\]/);
          if (timeMatch) {
            timestamp = ` (${timeMatch[1]})`;
            text = text.replace(timeMatch[0], "").trim();
          }
          text = text.replace(/^Transcript:\s*/, "").trim();

          return (
            <div key={i} className="bg-surface-container border border-outline-variant rounded p-3 text-xs text-on-surface flex flex-col gap-1.5 hover:bg-surface-bright transition-colors shrink-0">
              <div className="flex justify-between items-center font-semibold">
                <span className="text-teal-400">VIDEO {chunk.metadata?.video_id}{timestamp}</span>
                <span className="font-mono text-[10px] text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded border border-outline-variant/50">ID: {chunk.metadata?.video_id?.toLowerCase()}-{chunk.metadata?.chunk_id}</span>
              </div>
              <p className="leading-relaxed text-on-surface-variant text-[11px] font-mono">"{text}"</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const getPlatformName = (url: string) => {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) return 'Instagram';
    if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) return 'TikTok';
    return 'YouTube';
  } catch {
    return 'YouTube';
  }
};

export default function VideoMetricsDashboard() {
  const [urlA, setUrlA] = useState("");
  const [urlB, setUrlB] = useState("");
  const [loading, setLoading] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [metadata, setMetadata] = useState<{ A: VideoMetadata; B: VideoMetadata } | null>(null);
  const [allChunks, setAllChunks] = useState<VectorChunk[]>([]);
  
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<AnalysisHistoryEntry[]>([]);

  const [isListening, setIsListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => { setIsListening(true); toast.info("Listening..."); };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (speechEvent: any) => {
      const transcript = Array.from(speechEvent.results)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((result: any) => result[0].transcript)
        .join('');
      setChatInput(transcript);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (speechError: any) => { console.error("Speech recognition error:", speechError); setIsListening(false); };
    recognition.onend = () => { setIsListening(false); };
    recognition.start();
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem("VideoMetrics_history");
    if (savedHistory) {
      try { setHistoryData(JSON.parse(savedHistory)); } catch (parseError) { console.warn("Failed to parse saved history:", parseError); }
    }
  }, []);

  const saveHistory = (metadataA: VideoMetadata, metadataB: VideoMetadata, videoUrlA: string, videoUrlB: string) => {
    const newEntry: AnalysisHistoryEntry = {
      id: Date.now(),
      titleA: metadataA?.title || "Video A",
      titleB: metadataB?.title || "Video B",
      urlA: videoUrlA,
      urlB: videoUrlB,
      date: new Date().toLocaleDateString()
    };
    const updatedHistory = [newEntry, ...historyData].slice(0, 10);
    setHistoryData(updatedHistory);
    localStorage.setItem("VideoMetrics_history", JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistoryData([]);
    localStorage.removeItem("VideoMetrics_history");
    toast.success("History cleared");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlA || !urlB) {
      toast.error("Please provide both video URLs.");
      return;
    }
    
    setLoading(true);
    toast.promise(
      fetch(`${API_BASE_URL}/api/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url_a: urlA, url_b: urlB })
      }).then(async (processResponse) => {
        const processResult = await processResponse.json();
        if (processResult.status === "success") {
          setMetadata(processResult.metadata);
          setProcessed(true);
          saveHistory(processResult.metadata.A, processResult.metadata.B, urlA, urlB);
          
          try {
            const chunksResponse = await fetch(`${API_BASE_URL}/api/chunks`);
            if (chunksResponse.ok) {
              const chunksPayload = await chunksResponse.json();
              setAllChunks(chunksPayload.chunks);
            }
          } catch (chunkFetchError) {
            console.error("Failed to fetch vector chunks:", chunkFetchError);
          }
          
          const videoTitleA = processResult.metadata.A.title || 'Video A';
          const videoTitleB = processResult.metadata.B.title || 'Video B';
          setMessages([{ role: "assistant", content: `I've analyzed your latest two videos: "${videoTitleA}" and "${videoTitleB}". They are ready for comparison! What specific aspects would you like to dive into?` }]);
          return processResult;
        } else {
          throw new Error(processResult.detail || "Unknown error");
        }
      }).finally(() => {
        setLoading(false);
      }),
      {
        loading: 'Processing videos and building knowledge base...',
        success: 'Analysis ready!',
        error: (err) => `Error: ${err.message}`
      }
    );
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const newMessages = [...messages, { role: "user", content: chatInput }];
    setMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatInput })
      });

      if (!response.ok) throw new Error("Failed to connect to AI");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = "";
      let currentChunks: SourceChunk[] = [];
      
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      let buffer = "";
      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        
        for (const sseChunk of lines) {
          if (sseChunk.startsWith("data: ")) {
            const ssePayload = sseChunk.substring(6);
            if (ssePayload.trim() === "[DONE]") {
              buffer = "";
              if (voiceMode) {
                speakText(assistantMsg);
              }
              break;
            }
            try {
              const parsedEvent = JSON.parse(ssePayload);
              if (parsedEvent.chunks) {
                currentChunks = parsedEvent.chunks;
                setMessages([...newMessages, { role: "assistant", content: assistantMsg, chunks: currentChunks }]);
              } else if (parsedEvent.text) {
                assistantMsg += parsedEvent.text;
                setMessages([...newMessages, { role: "assistant", content: assistantMsg, chunks: currentChunks }]);
              } else if (parsedEvent.error) {
                toast.error(parsedEvent.error);
              }
            } catch (sseParseError) {
              console.error("SSE parse error:", sseParseError, ssePayload);
            }
          }
        }
      }
    } catch (chatError) {
      const errorMessage = chatError instanceof Error ? chatError.message : "Something went wrong while chatting.";
      toast.error(errorMessage);
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    }
    
    setChatLoading(false);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden antialiased bg-background text-on-background lg:h-screen lg:overflow-hidden font-body-md">
      {/* TopNavBar customized for URL Inputs */}
      <header className="bg-background border-b border-outline-variant flex flex-col lg:flex-row justify-between items-center w-full px-4 lg:px-10 h-auto lg:h-16 shrink-0 z-20 py-4 lg:py-0">
        <div className="flex items-center gap-6 w-full lg:w-auto">
          <div className="flex items-center justify-between w-full lg:w-auto">
            <a href="/" className="font-headline-md text-xl lg:text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
              <h1>VideoMetrics AI</h1>
            </a>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden text-on-surface-variant">
              <Menu />
            </button>
          </div>
          {processed && (
            <button onClick={() => setProcessed(false)} className="hidden lg:flex bg-surface-container-high border border-outline-variant hover:bg-surface-bright text-on-surface text-sm px-4 py-2 rounded transition-colors items-center gap-2 font-semibold">
              <PlusCircle size={16} /> New Analysis
            </button>
          )}
        </div>
        
        <div className="items-center gap-4 hidden lg:flex">
          <button onClick={() => setHistoryOpen(true)} className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 text-sm font-semibold">
            <History size={20} /> History
          </button>
        </div>
      </header>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden flex flex-col gap-3 px-4 py-4 border-b border-outline-variant bg-surface-container-low shrink-0 z-10">
          {processed && (
            <button onClick={() => { setProcessed(false); setMobileMenuOpen(false); }} className="bg-surface-container-high border border-outline-variant text-on-surface text-sm py-2 rounded flex items-center justify-center gap-2 w-full">
              <PlusCircle size={16} /> New Analysis
            </button>
          )}
          <button onClick={() => { setHistoryOpen(true); setMobileMenuOpen(false); }} className="bg-surface-container-high border border-outline-variant text-on-surface text-sm py-2 rounded flex items-center justify-center gap-2 w-full">
            <History size={16} /> History
          </button>
        </div>
      )}

      <AnimatePresence>
        {historyOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80" onClick={() => setHistoryOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-surface-container-low relative z-10 w-full max-w-lg rounded-2xl border border-outline-variant p-6 flex flex-col max-h-[80vh] overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline-md text-xl font-semibold text-on-surface flex items-center gap-2">
                  <History size={20} className="text-primary" /> Recent Analyses
                </h3>
                <div className="flex items-center gap-3">
                  {historyData.length > 0 && (
                    <button onClick={clearHistory} className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 transition-colors bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/20">
                      <Trash2 size={14} /> Clear
                    </button>
                  )}
                  <button onClick={() => setHistoryOpen(false)} className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded hover:bg-surface-container">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
                {historyData.length === 0 ? (
                  <div className="text-center py-10 text-on-surface-variant">No history found yet. Compare some videos!</div>
                ) : (
                  historyData.map((entry: AnalysisHistoryEntry) => (
                    <button key={entry.id} onClick={() => { setUrlA(entry.urlA); setUrlB(entry.urlB); setHistoryOpen(false); setProcessed(false); }} className="text-left p-4 rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-bright transition-colors group relative overflow-hidden shrink-0">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-on-surface-variant font-label-caps">{entry.date}</span>
                        <ArrowRight size={14} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-sm text-on-surface font-medium truncate mb-1" title={entry.titleA}>A: {entry.titleA}</div>
                      <div className="text-sm text-on-surface font-medium truncate" title={entry.titleB}>B: {entry.titleB}</div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      {!processed ? (
        <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl mx-auto flex flex-col items-center pb-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl lg:text-4xl font-bold font-headline-md mb-4 tracking-tight text-on-surface">Compare Any Two Videos</h2>
              <p className="text-on-surface-variant text-base lg:text-lg">Uncover engagement secrets and viral hooks instantly.</p>
            </div>
            
            <form onSubmit={handleProcess} className="w-full bg-surface-container-low border border-outline-variant p-6 lg:p-8 rounded-2xl flex flex-col gap-6 shadow-2xl relative overflow-hidden">
              {/* Subtle background glow for the form to keep it premium but flat */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -z-10 rounded-full" />
              
              <div className="space-y-2 relative z-10">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block ml-1">Video A (YouTube/Reels URL)</label>
                <div className="relative">
                  <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
                  <input type="url" required value={urlA} onChange={(e) => setUrlA(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-12 pr-4 py-4 text-on-surface focus:outline-none transition-all placeholder:text-on-surface-variant/50" />
                </div>
              </div>

              <div className="space-y-2 relative z-10">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block ml-1">Video B (YouTube/Reels URL)</label>
                <div className="relative">
                  <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
                  <input type="url" required value={urlB} onChange={(e) => setUrlB(e.target.value)} placeholder="https://instagram.com/reel/..." className="w-full bg-surface-container border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary rounded-xl pl-12 pr-4 py-4 text-on-surface focus:outline-none transition-all placeholder:text-on-surface-variant/50" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-[#6366f1] text-white hover:bg-opacity-90 font-semibold rounded-xl px-4 py-4 mt-4 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-lg relative z-10">
                {loading ? (
                  <><Loader2 className="animate-spin" size={24} /> <span>Analyzing Content...</span></>
                ) : (
                  <>Start Analysis <ArrowRight size={20} /></>
                )}
              </button>
            </form>
          </motion.div>
        </main>
      ) : (
        <main className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden relative z-0">
          {/* Left Panel: Data (66%) */}
          <section className="w-full lg:w-2/3 h-auto lg:h-full flex flex-col p-4 lg:p-6 gap-6 overflow-y-visible lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-outline-variant bg-surface custom-scrollbar shrink-0">
            <h2 className="font-headline-md text-xl text-on-surface mb-2 font-semibold">Video Comparison</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
              <VideoCard 
                platformLabel={getPlatformName(urlA)} 
                data={metadata?.A ?? null} 
                icon={getPlatformName(urlA) === "Instagram" ? <Video className="text-[#e1306c]" size={16} /> : getPlatformName(urlA) === "TikTok" ? <PlayCircle className="text-[#00f2fe]" size={16} /> : <PlayCircle className="text-[#ff0000]" size={16} />} 
              />
              <VideoCard 
                platformLabel={getPlatformName(urlB)} 
                data={metadata?.B ?? null} 
                icon={getPlatformName(urlB) === "Instagram" ? <Video className="text-[#e1306c]" size={16} /> : getPlatformName(urlB) === "TikTok" ? <PlayCircle className="text-[#00f2fe]" size={16} /> : <PlayCircle className="text-[#ff0000]" size={16} />} 
              />
            </div>
            
            {/* Semantic Vector Index Panel */}
            {allChunks.length > 0 && <VectorIndex chunks={allChunks} />}
            
          </section>

          {/* Right Panel: Chat (33%) */}
          <section className="w-full lg:w-1/3 h-[500px] lg:h-full flex flex-col bg-background relative shrink-0">
          <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/50 backdrop-blur-sm z-10 shrink-0">
            <div>
              <h2 className="font-headline-md text-lg text-on-surface font-semibold">Insight Assistant</h2>
              <p className="font-body-md text-xs text-on-surface-variant">Ask questions about the analyzed content.</p>
            </div>
            <span className="font-label-caps text-[10px] text-teal-400 bg-teal-400/10 px-2 py-1 rounded border border-teal-400/20 flex items-center gap-1.5"><Zap size={10} /> RAG POWERED</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col gap-6 custom-scrollbar">
            {messages.length === 0 && !processed && (
              <div className="text-center text-on-surface-variant mt-20 flex flex-col items-center">
                <Bot size={48} className="mb-4 opacity-50" />
                <p className="text-sm">Waiting for data processing to begin...</p>
              </div>
            )}
            
            {messages.map((message, messageIndex) => (
              <div key={messageIndex} className={`flex gap-4 max-w-[85%] ${message.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 ${message.role === 'user' ? 'bg-surface-container-high border-outline-variant overflow-hidden' : 'bg-primary/10 border-primary/20'}`}>
                  {message.role === 'user' ? <Users size={16} className="text-on-surface" /> : <Bot size={16} className="text-primary" />}
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <div className={`p-4 rounded-lg font-body-md text-sm ${
                    message.role === 'user' 
                      ? 'bg-[#27272a] border border-[#3f3f46] rounded-tr-none text-white' 
                      : 'bg-surface-container-low border border-outline-variant rounded-tl-none text-on-surface'
                  }`}>
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {message.content.split(/(\[Video\s+[A-Za-z0-9,\s:-]+\])/i).map((part, partIndex) => {
                        if (part.match(/^\[Video\s+[A-Za-z0-9,\s:-]+\]$/i)) {
                          return <span key={partIndex} className="inline-flex items-center mx-1 px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.15)] text-[11px] font-mono font-semibold">{part}</span>;
                        }
                        return <span key={partIndex}>{part}</span>;
                      })}
                    </div>
                    
                    {message.chunks && message.chunks.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-outline-variant/30">
                        {message.chunks.map((sourceChunk, chunkIndex) => {
                          let timestamp = "";
                          const timeMatch = (sourceChunk.text || "").match(/\[(\d+:\d{2}(?:\s*-\s*\d+:\d{2})?)\]/);
                          if (timeMatch) timestamp = ` (${timeMatch[1]})`;
                          
                          return (
                            <span key={chunkIndex} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full font-label-caps text-[10px] text-cyan-400 cursor-pointer hover:bg-cyan-500/20 transition-colors shadow-[0_0_8px_rgba(34,211,238,0.1)]" title={sourceChunk.text}>
                              <Quote size={10} />
                              Source: Video {sourceChunk.video}{timestamp}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {chatLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-4 max-w-[85%] self-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                  <Loader2 size={16} className="text-primary animate-spin" />
                </div>
                <div className="bg-surface-container-low border border-outline-variant p-4 rounded-lg rounded-tl-none flex items-center gap-2 h-[52px]">
                  <div className="w-1.5 h-1.5 bg-on-surface-variant rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-on-surface-variant rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                  <div className="w-1.5 h-1.5 bg-on-surface-variant rounded-full animate-bounce" style={{animationDelay: '0.4s'}} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 lg:p-6 border-t border-outline-variant bg-surface-container-low mt-auto sticky bottom-0 lg:static z-20 shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar w-full whitespace-nowrap">
              {(() => {
                const engagementA = metadata?.A?.engagement_rate || 0;
                const engagementB = metadata?.B?.engagement_rate || 0;
                const higher = engagementA >= engagementB ? "A" : "B";
                const lower = engagementA >= engagementB ? "B" : "A";
                return [
                  `Why did Video ${higher} get more engagement than Video ${lower}?`,
                  "What's the engagement rate of each?",
                  "Compare the hooks in the first 5 seconds.",
                  `Who's the creator of Video ${lower} and what's their follower count?`,
                  `Suggest improvements for ${lower} based on what worked in ${higher}.`
                ];
              })().map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setChatInput(suggestion)}
                  className="bg-surface-container-high px-4 py-2.5 rounded-full font-body-sm text-[13px] text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors border border-outline-variant flex-shrink-0 font-medium shadow-sm hover:shadow-md"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <form onSubmit={handleChat} className="relative flex items-center gap-2">
              <button 
                type="button" 
                onClick={toggleListening}
                className={`p-3 rounded-full flex shrink-0 items-center justify-center transition-colors shadow-sm ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-primary hover:bg-surface-bright'}`}
              >
                <Mic size={18} />
              </button>
              <div className="relative flex-1">
                <input 
                  type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={chatLoading}
                  className="w-full bg-background border border-outline-variant text-on-surface text-sm rounded-lg pl-4 pr-12 py-3 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-on-surface-variant/50 transition-colors shadow-sm shadow-black/20" 
                  placeholder={isListening ? "Listening..." : "Ask about trends, engagement, or content strategy..."} 
                />
                <button type="submit" disabled={chatLoading || (!chatInput.trim() && !isListening)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/10 rounded transition-colors flex items-center justify-center disabled:opacity-50">
                  <Send size={18} />
                </button>
              </div>
            </form>
            <div className="flex justify-between items-center mt-2 px-1">
              <button 
                type="button" 
                onClick={() => {
                  setVoiceMode(!voiceMode);
                  if (voiceMode) window.speechSynthesis?.cancel();
                }} 
                className={`font-label-caps text-[10px] flex items-center gap-1.5 transition-colors ${voiceMode ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
              >
                {voiceMode ? <Volume2 size={12} /> : <VolumeX size={12} />}
                {voiceMode ? 'VOICE RESPONSES: ON' : 'VOICE RESPONSES: OFF'}
              </button>
              <div className="flex gap-4">
                <p className="font-label-caps text-[10px] text-on-surface-variant/70">AI may produce inaccurate information.</p>
                <button type="button" onClick={() => setMessages([])} className="font-label-caps text-[10px] text-on-surface-variant hover:text-primary transition-colors">Clear Chat</button>
              </div>
            </div>
          </div>
        </section>
      </main>
      )}
    </div>
  );
}
