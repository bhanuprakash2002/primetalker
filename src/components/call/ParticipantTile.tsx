// src/components/call/ParticipantTile.tsx
import React, { useRef, useEffect } from "react";
import MicLevel from "./MicLevel";
import { Mic, MicOff, Globe, User } from "lucide-react";

// Language display names
const languageNames: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
  it: "Italian", ru: "Russian", zh: "Chinese", ja: "Japanese", ko: "Korean",
  ar: "Arabic", hi: "Hindi", te: "Telugu", ta: "Tamil", bn: "Bengali",
  gu: "Gujarati", kn: "Kannada", ml: "Malayalam", mr: "Marathi", pa: "Punjabi",
  vi: "Vietnamese", th: "Thai", id: "Indonesian", ms: "Malay", fil: "Filipino",
  tr: "Turkish", nl: "Dutch", pl: "Polish", sv: "Swedish", da: "Danish",
  no: "Norwegian", fi: "Finnish", el: "Greek", cs: "Czech", ro: "Romanian",
  hu: "Hungarian", uk: "Ukrainian", he: "Hebrew", fa: "Persian", af: "Afrikaans",
};

// Language flag emojis (approximate)
const languageFlags: Record<string, string> = {
  en: "🇺🇸", es: "🇪🇸", fr: "🇫🇷", de: "🇩🇪", pt: "🇧🇷", it: "🇮🇹", ru: "🇷🇺",
  zh: "🇨🇳", ja: "🇯🇵", ko: "🇰🇷", ar: "🇸🇦", hi: "🇮🇳", te: "🇮🇳", ta: "🇮🇳",
  bn: "🇮🇳", gu: "🇮🇳", kn: "🇮🇳", ml: "🇮🇳", mr: "🇮🇳", pa: "🇮🇳",
  vi: "🇻🇳", th: "🇹🇭", id: "🇮🇩", tr: "🇹🇷", nl: "🇳🇱", pl: "🇵🇱",
};

export default function ParticipantTile({
  name,
  isLocal = false,
  muted = false,
  level = 0,
  language,
  videoStream,
  isVideoOn = true,
}: {
  name: string;
  isLocal?: boolean;
  muted?: boolean;
  level?: number;
  language?: string;
  videoStream?: MediaStream | null;
  isVideoOn?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const langCode = language?.split("-")[0] || "en";
  const langDisplay = languageNames[langCode] || language || "Unknown";
  const langFlag = languageFlags[langCode] || "🌐";

  // Generate avatar initials
  const initials = name.split(" ").map(s => s[0]?.toUpperCase()).slice(0, 2).join("") || "?";

  // Determine if speaking based on audio level
  const isSpeaking = !muted && level > 15;

  // Debug: log when videoStream changes
  useEffect(() => {
    console.log(`🎬 ParticipantTile [${name}]: videoStream=${videoStream ? 'HAS_STREAM' : 'NULL'}, isVideoOn=${isVideoOn}, isLocal=${isLocal}`);
    if (videoStream) {
      console.log(`🎬 ParticipantTile [${name}]: tracks=`, videoStream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
    }
  }, [videoStream, isVideoOn, name, isLocal]);

  // Attach video stream to video element
  // Only use useEffect to avoid race conditions between ref and effect
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !videoStream || !isVideoOn) return;

    // Only set srcObject if it's different to avoid "interrupted by new load" error
    if (videoElement.srcObject !== videoStream) {
      console.log(`🎬 ParticipantTile [${name}]: Setting srcObject on video element`);
      videoElement.srcObject = videoStream;
    }

    // Only call play if video is paused
    if (videoElement.paused) {
      videoElement.play().catch((err) => {
        // Ignore AbortError - it's usually harmless and means another play was triggered
        if (err.name !== 'AbortError') {
          console.warn(`🎬 ParticipantTile [${name}]: Video play failed:`, err);
        }
      });
    }
  }, [videoStream, isVideoOn, name]);

  const showVideo = videoStream && isVideoOn;

  // Debug: log showVideo decision
  useEffect(() => {
    console.log(`🎬 ParticipantTile [${name}]: showVideo=${showVideo}`);
  }, [showVideo, name]);

  return (
    <div
      className={`
        relative rounded-2xl overflow-hidden 
        bg-gradient-to-br from-slate-800/90 to-slate-900/90
        border-2 transition-all duration-300
        ${isSpeaking ? "border-green-500 shadow-lg shadow-green-500/20" : "border-slate-700/50"}
      `}
    >
      {/* Video or Avatar content */}
      <div className="aspect-video flex flex-col items-center justify-center p-6 min-h-[200px] relative">
        {/* Always render video element to ensure ref is available */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${showVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        />

        {/* Avatar fallback - shown when video is off */}
        {!showVideo && (
          <>
            <div
              className={`
                w-24 h-24 rounded-full flex items-center justify-center 
                text-3xl font-bold text-white mb-4
                transition-all duration-300
                ${isLocal
                  ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                  : "bg-gradient-to-br from-purple-500 to-pink-600"
                }
                ${isSpeaking ? "ring-4 ring-green-500/50 scale-105" : ""}
              `}
            >
              {initials}
            </div>

            <h3 className="text-white text-xl font-semibold mb-1">
              {name}
              {isLocal && <span className="text-blue-400 text-sm ml-2">(You)</span>}
            </h3>

            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-lg">{langFlag}</span>
              <span className="text-sm">{langDisplay}</span>
            </div>
          </>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          {/* Mic status */}
          <div className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
            ${muted
              ? "bg-red-500/20 text-red-400"
              : isSpeaking
                ? "bg-green-500/20 text-green-400"
                : "bg-slate-700/50 text-slate-400"
            }
          `}>
            {muted ? (
              <>
                <MicOff size={16} />
                <span>Muted</span>
              </>
            ) : (
              <>
                <Mic size={16} className={isSpeaking ? "animate-pulse" : ""} />
                <span>{isSpeaking ? "Speaking" : "Ready"}</span>
              </>
            )}
          </div>

          {/* Audio level indicator */}
          <MicLevel level={level} />
        </div>
      </div>

      {/* Speaking indicator ring animation */}
      {isSpeaking && (
        <div className="absolute inset-0 rounded-2xl border-2 border-green-500 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
