import { useState, useRef, useEffect, useMemo, type ChangeEvent, type ClipboardEvent, type DragEvent } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";
import { Search, ShieldCheck, ImagePlus, X, History, Clock, ChevronRight, Trash2 } from "lucide-react";
import { ResultCard } from "./components/ResultCard";
import { verifyContent, VerificationResult } from "./services/geminiService";

export interface HistoryItem {
  id: string;
  timestamp: number;
  queryText: string;
  hasImage: boolean;
  result: VerificationResult;
}

const CustomCursor = () => {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 150);
      cursorY.set(e.clientY - 150);
    };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [cursorX, cursorY]);

  return (
    <motion.div
      className="fixed top-0 left-0 w-[300px] h-[300px] rounded-full pointer-events-none z-50 mix-blend-screen"
      style={{
        x: cursorX,
        y: cursorY,
        background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0) 70%)",
      }}
    />
  );
};

const TypewriterText = () => {
  const words = useMemo(() => ["Unseen", "Truth", "Facts", "Source", "Narrative", "Claim"], []);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[currentWordIndex];
    let typingSpeed = isDeleting ? 50 : 120;

    if (!isDeleting && currentText === word) {
      typingSpeed = 2000; // Pause before deleting
      const timeout = setTimeout(() => setIsDeleting(true), typingSpeed);
      return () => clearTimeout(timeout);
    } else if (isDeleting && currentText === "") {
      setIsDeleting(false);
      setCurrentWordIndex((prev) => (prev + 1) % words.length);
      return;
    }

    const timeout = setTimeout(() => {
      setCurrentText((prev) =>
        isDeleting
          ? word.substring(0, prev.length - 1)
          : word.substring(0, prev.length + 1)
      );
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentWordIndex, words]);

  return (
    <span className="inline-block text-emerald-400">
      {currentText}
      <span className="animate-pulse text-emerald-500/50">|</span>
    </span>
  );
};

const FloatingParticles = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // random horizontal position
      size: Math.random() * 6 + 3, // 3px to 9px
      duration: Math.random() * 20 + 15, // 15s to 35s
      delay: Math.random() * 15, // 0s to 15s delay
      opacity: Math.random() * 0.4 + 0.1, // 0.1 to 0.5
      drift: Math.random() * 40 - 20, // horizontal drift
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-emerald-500 pointer-events-auto cursor-crosshair"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            bottom: "-5%", // start slightly below the screen
          }}
          animate={{
            y: ["0vh", "-110vh"],
            x: [0, p.drift],
          }}
          whileHover={{
            scale: 2.5,
            opacity: 1,
            boxShadow: "0px 0px 12px 4px rgba(16, 185, 129, 0.8)",
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

export default function App() {
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem("truthlens_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }

    setError(null);
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleImagePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    let pastedFile: File | null = null;

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        pastedFile = item.getAsFile();
        break;
      }
    }

    if (!pastedFile) return;

    e.preventDefault();
    processImageFile(pastedFile);
  };

  const handleImageDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleImageDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleImageDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    let droppedFile: File | null = null;

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        droppedFile = file;
        break;
      }
    }

    if (droppedFile) {
      processImageFile(droppedFile);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleVerify = async () => {
    if (!text.trim() && !selectedImage) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let imageData;
      if (selectedImage && imagePreview) {
        const base64Data = imagePreview.split(",")[1];
        imageData = {
          data: base64Data,
          mimeType: selectedImage.type,
        };
      }

      const verificationResult = await verifyContent(text, imageData);
      setResult(verificationResult);

      // Save to history
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        queryText: text,
        hasImage: !!selectedImage,
        result: verificationResult,
      };

      setHistory((prev) => {
        const updated = [newItem, ...prev].slice(0, 20); // Keep last 20 items
        localStorage.setItem("truthlens_history", JSON.stringify(updated));
        return updated;
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setText(item.queryText);
    clearImage(); // We don't store the full image in history to save localstorage space
    setResult(item.result);
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearAllHistory = () => {
    setHistory([]);
    localStorage.removeItem("truthlens_history");
    setShowClearConfirm(false);
  };

  return (
    <div onPaste={handleImagePaste} className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      <CustomCursor />
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Option 3: Floating Data Particles */}
        <FloatingParticles />
        
        {/* Subtle base glow to anchor the particles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900 via-[#0a0a0a] to-[#0a0a0a] blur-3xl"></div>
        
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Top Navigation */}
      <nav className="relative z-20 container mx-auto px-4 py-6 flex justify-end">
        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors bg-zinc-900/50 border border-zinc-800 px-4 py-2 rounded-full backdrop-blur-sm"
        >
          <History className="w-4 h-4" />
          <span className="text-sm font-medium">History</span>
        </button>
      </nav>

      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-bold">Recent Scans</h2>
                </div>
                <div className="flex items-center space-x-2">
                  {history.length > 0 && (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors"
                      title="Clear All History"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {showClearConfirm && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-4"
                  >
                    <p className="text-sm text-rose-200 mb-3">Are you sure you want to clear all history? This cannot be undone.</p>
                    <div className="flex space-x-2">
                      <button 
                        onClick={clearAllHistory}
                        className="flex-1 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                      >
                        Yes, Clear All
                      </button>
                      <button 
                        onClick={() => setShowClearConfirm(false)}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium py-2 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}

                {history.length === 0 ? (
                  <div className="text-center text-zinc-500 mt-10">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No verification history yet.</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => loadHistoryItem(item)}
                      className="w-full text-left p-4 rounded-xl bg-zinc-800/30 border border-zinc-800 hover:bg-zinc-800/80 hover:border-emerald-500/30 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                          item.result.verdict === 'Real' ? 'bg-emerald-500/20 text-emerald-400' :
                          item.result.verdict === 'Fake' ? 'bg-rose-500/20 text-rose-400' :
                          item.result.verdict === 'Misleading' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-zinc-700 text-zinc-300'
                        }`}>
                          {item.result.verdict}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300 line-clamp-2 mb-2">
                        {item.queryText || (item.hasImage ? "[Image Analysis]" : "No text provided")}
                      </p>
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>AI Prob: {item.result.aiProbability}%</span>
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="relative z-10 container mx-auto px-4 pb-24 pt-8 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center space-y-6 mb-16"
        >
          <div className="inline-flex items-center justify-center space-x-3 bg-zinc-900/50 border border-zinc-800 rounded-full px-5 py-2 backdrop-blur-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-mono text-sm tracking-widest uppercase text-zinc-300">
              TruthLens AI
            </span>
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500">Verify the </span>
            <TypewriterText />
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed">
            Real-time AI-powered fake news detection. Paste any article, claim, or
            upload a screenshot to instantly verify its authenticity.
          </p>
        </motion.div>

        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-3xl mx-auto relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-emerald-500/0 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-zinc-900/80 border border-zinc-800 rounded-3xl p-2 backdrop-blur-xl shadow-2xl flex flex-col">
            
            {/* Image Preview Area */}
            <AnimatePresence>
              {imagePreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-6 pt-6 pb-2"
                >
                  <div className="relative inline-block">
                    <img 
                      src={imagePreview} 
                      alt="Upload preview" 
                      className="h-32 w-auto object-cover rounded-xl border border-zinc-700/50 shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 bg-zinc-800 hover:bg-rose-500 text-white rounded-full p-1 transition-colors shadow-lg border border-zinc-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={imagePreview ? "Add optional context or leave blank..." : "Paste news text, a viral claim, or an article snippet here..."}
              className="w-full h-40 sm:h-48 bg-transparent text-zinc-200 placeholder-zinc-400 resize-none p-6 focus:outline-none text-lg font-light leading-relaxed"
              spellCheck={false}
            />
            
            <div className="flex items-center gap-3 p-4 border-t border-zinc-800/50 overflow-x-auto">
              <div className="text-xs font-mono text-zinc-400 items-center space-x-2 hidden sm:flex shrink-0 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-500/50 animate-pulse"></span>
                <span>Live Search & Vision Active</span>
              </div>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onPaste={handleImagePaste}
                onDragOver={handleImageDragOver}
                onDragLeave={handleImageDragLeave}
                onDrop={handleImageDrop}
                tabIndex={0}
                role="button"
                title="Click, paste, or drag and drop an image"
                className={`w-52 sm:w-56 flex items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shrink-0 ${
                  isDragOver
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                    : "border-zinc-700/80 bg-zinc-800/30 text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-300"
                }`}
              >
                <ImagePlus className="w-5 h-5" />
                <span className="truncate font-medium">
                  {isDragOver ? "Drop image to upload" : "Attach File"}
                </span>
              </div>

              <button
                onClick={handleVerify}
                disabled={isLoading || (!text.trim() && !selectedImage)}
                className="ml-auto flex items-center justify-center space-x-2 bg-zinc-100 hover:bg-white text-zinc-900 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shrink-0"
              >
                <span>{isLoading ? "Analyzing..." : "Verify Now"}</span>
                {!isLoading && <Search className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center text-sm font-mono"
          >
            {error}
          </motion.div>
        )}

        {/* Results Section */}
        <ResultCard result={result} isLoading={isLoading} />
      </main>
    </div>
  );
}
