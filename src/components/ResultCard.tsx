import { motion } from "motion/react";
import { AlertCircle, CheckCircle2, HelpCircle, ShieldAlert, Share2, Copy, Check, ExternalLink } from "lucide-react";
import { VerificationResult } from "../services/geminiService";
import { useState } from "react";

interface ResultCardProps {
  result: VerificationResult | null;
  isLoading: boolean;
}

export function ResultCard({ result, isLoading }: ResultCardProps) {
  const [copied, setCopied] = useState(false);

  if (isLoading) return null; // Loading is now handled in App.tsx
  if (!result) return null;

  const handleShare = async () => {
    const shareText = `TruthLens AI Verification 🔍\n\nVerdict: ${result.verdict}\nAI Probability: ${result.aiProbability}%\n\nSummary: ${effectiveSummary}\n\nVerify your news at: ${window.location.origin}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TruthLens Verification',
          text: shareText,
        });
      } catch (err) {
        console.log("Share canceled or failed", err);
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case "Real":
        return {
          color: "text-emerald-400",
          bg: "bg-emerald-400/10",
          border: "border-emerald-400/20",
          icon: <CheckCircle2 className="w-12 h-12 text-emerald-400" />,
          shadow: "shadow-[0_0_30px_rgba(52,211,153,0.15)]"
        };
      case "Fake":
        return {
          color: "text-rose-500",
          bg: "bg-rose-500/10",
          border: "border-rose-500/20",
          icon: <ShieldAlert className="w-12 h-12 text-rose-500" />,
          shadow: "shadow-[0_0_30px_rgba(244,63,94,0.15)]"
        };
      case "Misleading":
        return {
          color: "text-amber-400",
          bg: "bg-amber-400/10",
          border: "border-amber-400/20",
          icon: <AlertCircle className="w-12 h-12 text-amber-400" />,
          shadow: "shadow-[0_0_30px_rgba(251,191,36,0.15)]"
        };
      default:
        return {
          color: "text-zinc-400",
          bg: "bg-zinc-800/50",
          border: "border-zinc-700",
          icon: <HelpCircle className="w-12 h-12 text-zinc-400" />,
          shadow: "shadow-none"
        };
    }
  };

  const style = getVerdictStyle(result.verdict);

  const effectiveSummary =
    result.summary && result.summary.trim() && result.summary !== "No summary provided."
      ? result.summary
      : `Verification completed with ${result.sources?.length ?? 0} live source(s). Open the source links for supporting context.`;

  const effectiveAnalysis =
    result.detailedAnalysis.length > 0
      ? result.detailedAnalysis
      : [
          "The model did not return a structured forensic breakdown for this run.",
          result.sources.length > 0
            ? `Live sources were found (${result.sources.length}). Review them for the evidence trail.`
            : "No live sources were attached for this run.",
          "For more precise analysis, retry with a specific claim and any relevant image/text context.",
        ];

  const sourceHostLabel = (source: { title: string; url: string }) => {
    try {
      const host = new URL(source.url).hostname.replace("www.", "");
      if (host.includes("vertexaisearch.cloud.goog") && source.title) {
        return source.title;
      }
      return host;
    } catch {
      return source.title || "source";
    }
  };
  
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (result.aiProbability / 100) * circumference;
  const probColor = result.aiProbability > 70 ? "text-rose-500" : result.aiProbability > 30 ? "text-amber-400" : "text-emerald-400";
  const probStroke = result.aiProbability > 70 ? "stroke-rose-500" : result.aiProbability > 30 ? "stroke-amber-400" : "stroke-emerald-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-12 gap-4"
    >
      {/* Verdict Box (Bento: 8 cols) */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className={`col-span-1 md:col-span-8 p-8 rounded-3xl border ${style.border} ${style.bg} ${style.shadow} relative overflow-hidden flex flex-col justify-between min-h-[200px] hover:brightness-110 transition-all duration-300`}
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-sm font-mono text-zinc-400 uppercase tracking-widest">
              Final Verdict
            </h3>
            <p className="text-sm text-zinc-500">Based on live search & AI analysis</p>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-700/50 transition-colors text-sm text-zinc-300 hover:text-white backdrop-blur-md z-10"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? "Copied!" : "Share"}</span>
          </button>
        </div>

        <div className="flex items-end space-x-6 mt-8">
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
          >
            {style.icon}
          </motion.div>
          <motion.h2 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.4 }}
            className={`text-6xl sm:text-7xl font-black tracking-tighter uppercase ${style.color}`}
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
          >
            {result.verdict}
          </motion.h2>
        </div>
        
        {/* Background watermark */}
        <div className={`absolute -right-10 -bottom-10 opacity-5 pointer-events-none ${style.color}`}>
          {style.icon}
        </div>
      </motion.div>

      {/* AI Probability Box (Bento: 4 cols) */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="col-span-1 md:col-span-4 p-8 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex flex-col items-center justify-center relative shadow-xl hover:brightness-110 transition-all duration-300"
      >
        <h3 className="text-sm font-mono text-zinc-400 uppercase tracking-widest mb-6 text-center">
          AI Generated
        </h3>
        
        <div className="relative flex items-center justify-center">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-zinc-800"
            />
            <motion.circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              className={`${probStroke} drop-shadow-lg`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${probColor}`}>
              {result.aiProbability}%
            </span>
          </div>
        </div>
      </motion.div>

      {/* Summary Box (Bento: 12 cols) */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        whileHover={{ scale: 1.01 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="col-span-1 md:col-span-12 p-8 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-xl hover:brightness-110 transition-all duration-300"
      >
        <h4 className="text-sm font-mono text-zinc-500 mb-4 uppercase tracking-widest flex items-center">
          <span className="w-2 h-2 rounded-full bg-zinc-500 mr-3"></span>
          Executive Summary
        </h4>
        <p className="text-xl sm:text-2xl text-zinc-200 leading-relaxed font-light">
          {effectiveSummary}
        </p>
      </motion.div>

      {/* Detailed Analysis Box (Bento: 8 cols) */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        whileHover={{ scale: 1.015 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="col-span-1 md:col-span-8 p-8 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-xl hover:brightness-110 transition-all duration-300"
      >
        <h4 className="text-sm font-mono text-zinc-500 mb-6 uppercase tracking-widest flex items-center">
          <span className="w-2 h-2 rounded-full bg-zinc-500 mr-3"></span>
          Forensic Analysis
        </h4>
        <ul className="space-y-4">
          {effectiveAnalysis.map((point, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.15 }}
              className="flex items-start space-x-4 text-zinc-300 text-base leading-relaxed p-4 rounded-2xl bg-zinc-800/30 border border-zinc-800/50"
            >
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500/50 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span>{point}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Sources Box (Bento: 4 cols) */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="col-span-1 md:col-span-4 p-8 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-xl flex flex-col hover:brightness-110 transition-all duration-300"
      >
        <h4 className="text-sm font-mono text-zinc-500 mb-6 uppercase tracking-widest flex items-center">
          <span className="w-2 h-2 rounded-full bg-zinc-500 mr-3"></span>
          Live Sources
        </h4>
        
        {result.sources && result.sources.length > 0 ? (
          <div className="flex flex-col gap-3 flex-1">
            {result.sources.map((source, index) => (
              <motion.a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="group flex flex-col p-4 rounded-2xl bg-zinc-800/30 border border-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs text-zinc-500 font-mono truncate pr-4">
                    {sourceHostLabel(source)}
                  </p>
                  <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-emerald-400 transition-colors shrink-0" />
                </div>
                <p className="text-sm text-zinc-300 line-clamp-2 group-hover:text-emerald-400 transition-colors font-medium">
                  {source.title}
                </p>
              </motion.a>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800 rounded-2xl">
            <HelpCircle className="w-8 h-8 text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-500">No credible sources found to verify these claims.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
