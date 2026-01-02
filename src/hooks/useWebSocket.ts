// src/hooks/useWebSocket.ts
// WebSocket + WebRTC Audio/Video hook for live translation

import { useRef, useState, useEffect, useCallback } from "react";
import { BASE_URL } from "@/lib/utils";

interface TranscriptItem {
    id: string;
    originalText: string;
    translatedText: string;
    fromUser: string;
    fromLanguage: string;
    toLanguage: string;
    timestamp: number;
}

interface UseWebSocketProps {
    roomId: string;
    userType: "caller" | "receiver";
    myLanguage: string;
    myName: string;
    onPartnerJoined?: (name: string, language: string) => void;
    onPartnerLeft?: () => void;
}

export function useWebSocket({
    roomId,
    userType,
    myLanguage,
    myName,
    onPartnerJoined,
    onPartnerLeft,
}: UseWebSocketProps) {
    // Connection state
    const [status, setStatus] = useState<string>("Disconnected");
    const [isConnected, setIsConnected] = useState(false);
    const [isAudioOn, setIsAudioOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [localLevel, setLocalLevel] = useState(0);
    const [partnerLevel, setPartnerLevel] = useState(0);

    // Video streams
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    // Transcripts
    const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
    const [interimText, setInterimText] = useState<string>("");

    // Refs
    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const audioChunksRef = useRef<Int16Array[]>([]);
    const sendIntervalRef = useRef<number | null>(null);
    const meterRafRef = useRef<number | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);

    // Audio playback queue
    const audioQueueRef = useRef<string[]>([]);
    const isPlayingRef = useRef(false);
    const isAudioOnRef = useRef(true); // Track mute state for audio processor
    const partnerLevelTimeoutRef = useRef<number | null>(null);

    // WebRTC for peer-to-peer video
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const isVideoOnRef = useRef(true);
    const makingOfferRef = useRef(false);
    const ignoreOfferRef = useRef(false);
    const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
    const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

    // WebRTC ICE servers (STUN + TURN for better connectivity)
    // Using multiple STUN servers for reliability
    const rtcConfig: RTCConfiguration = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
            // Free TURN servers for NAT traversal (Metered)
            {
                urls: "turn:a.relay.metered.ca:80",
                username: "e8dd65def7205b163ab5bce8",
                credential: "uMW/7yGYItXwxPpo"
            },
            {
                urls: "turn:a.relay.metered.ca:80?transport=tcp",
                username: "e8dd65def7205b163ab5bce8",
                credential: "uMW/7yGYItXwxPpo"
            },
            {
                urls: "turn:a.relay.metered.ca:443",
                username: "e8dd65def7205b163ab5bce8",
                credential: "uMW/7yGYItXwxPpo"
            },
            {
                urls: "turn:a.relay.metered.ca:443?transport=tcp",
                username: "e8dd65def7205b163ab5bce8",
                credential: "uMW/7yGYItXwxPpo"
            }
        ],
        iceCandidatePoolSize: 10
    };

    // Sync isAudioOnRef with isAudioOn state
    useEffect(() => {
        isAudioOnRef.current = isAudioOn;
    }, [isAudioOn]);

    // Get WebSocket URL
    const getWSUrl = useCallback(() => {
        const url = new URL(BASE_URL);
        const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
        return `${wsProtocol}//${url.host}/audio-stream`;
    }, []);

    // Process audio queue
    const processAudioQueue = useCallback(async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
        isPlayingRef.current = true;

        const base64Audio = audioQueueRef.current.shift()!;

        try {
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const audioBlob = new Blob([bytes], { type: "audio/wav" });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.volume = 1.0;

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                isPlayingRef.current = false;
                processAudioQueue();
            };

            audio.onerror = () => {
                isPlayingRef.current = false;
                processAudioQueue();
            };

            await audio.play();
            console.log("🔊 Playing translated audio");
        } catch (err) {
            console.error("Error playing audio:", err);
            isPlayingRef.current = false;
            processAudioQueue();
        }
    }, []);

    // Create video offer
    const createVideoOffer = useCallback(async () => {
        const pc = peerConnectionRef.current;
        const ws = wsRef.current;
        if (!pc || !ws || ws.readyState !== WebSocket.OPEN) {
            console.log("📹 Cannot create offer - PC or WS not ready");
            return;
        }

        try {
            makingOfferRef.current = true;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ event: "video_offer", sdp: pc.localDescription }));
            console.log("📹 Video offer sent");
        } catch (e) {
            console.error("Error creating offer:", e);
        } finally {
            makingOfferRef.current = false;
        }
    }, []);

    // Handle incoming video offer
    const handleVideoOffer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
        const pc = peerConnectionRef.current;
        const ws = wsRef.current;

        // If peer connection isn't ready yet, queue the offer
        if (!pc) {
            console.log("📹 Queuing video offer (peer connection not ready)");
            pendingOfferRef.current = sdp;
            return;
        }

        if (!ws) return;

        try {
            // Check for glare (both sides trying to create offer at same time)
            const offerCollision = makingOfferRef.current || pc.signalingState !== "stable";

            // Receiver is always "polite" - they will roll back their offer if collision happens
            const isPolite = userType === "receiver";
            ignoreOfferRef.current = !isPolite && offerCollision;

            if (ignoreOfferRef.current) {
                console.log("📹 Ignoring offer (glare detected, we are impolite)");
                return;
            }

            // If we have a collision and we're polite, rollback
            if (offerCollision && isPolite) {
                await Promise.all([
                    pc.setLocalDescription({ type: "rollback" }),
                    pc.setRemoteDescription(new RTCSessionDescription(sdp))
                ]);
            } else {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ event: "video_answer", sdp: pc.localDescription }));
            console.log("📹 Video answer sent");

            // Process any queued ICE candidates
            while (pendingIceCandidatesRef.current.length > 0) {
                const candidate = pendingIceCandidatesRef.current.shift()!;
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log("📹 Added queued ICE candidate");
                } catch (e) {
                    console.error("Error adding queued ICE candidate:", e);
                }
            }
        } catch (e) {
            console.error("Error handling offer:", e);
        }
    }, [userType]);

    // Handle incoming video answer
    const handleVideoAnswer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
        const pc = peerConnectionRef.current;
        if (!pc) return;

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            console.log("📹 Video connection established");

            // Process any queued ICE candidates
            while (pendingIceCandidatesRef.current.length > 0) {
                const candidate = pendingIceCandidatesRef.current.shift()!;
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log("📹 Added queued ICE candidate");
                } catch (e) {
                    console.error("Error adding queued ICE candidate:", e);
                }
            }
        } catch (e) {
            console.error("Error handling answer:", e);
        }
    }, []);

    // Handle incoming messages
    const handleMessage = useCallback(
        async (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.event) {
                    case "user_joined":
                        console.log("👤 Partner joined:", data.name);
                        onPartnerJoined?.(data.name, data.language);
                        // Only CALLER creates video offer (receiver waits for offer)
                        // This avoids glare (both sides creating offers at same time)
                        if (userType === "caller" && peerConnectionRef.current) {
                            console.log("📹 I am caller - creating video offer");
                            // Small delay to ensure receiver's peer connection is ready
                            setTimeout(() => {
                                createVideoOffer();
                            }, 500);
                        } else {
                            console.log("📹 I am receiver - waiting for offer from caller");
                        }
                        break;

                    case "user_left":
                        console.log("👤 Partner left");
                        onPartnerLeft?.();
                        // Close peer connection when partner leaves
                        if (peerConnectionRef.current) {
                            peerConnectionRef.current.close();
                            peerConnectionRef.current = null;
                        }
                        setRemoteStream(null);
                        break;

                    case "transcript_interim":
                        setInterimText(data.text || "");
                        break;

                    case "translation":
                        setInterimText("");
                        const newTranscript: TranscriptItem = {
                            id: `${Date.now()}-${Math.random()}`,
                            originalText: data.originalText,
                            translatedText: data.translatedText,
                            fromUser: data.fromUser,
                            fromLanguage: data.fromLanguage,
                            toLanguage: data.toLanguage,
                            timestamp: Date.now(),
                        };
                        setTranscripts((prev) => [...prev, newTranscript]);
                        break;

                    case "audio_playback":
                        audioQueueRef.current.push(data.audio);
                        processAudioQueue();
                        // Partner is speaking (receiving their TTS audio)
                        setPartnerLevel(50);
                        if (partnerLevelTimeoutRef.current) clearTimeout(partnerLevelTimeoutRef.current);
                        partnerLevelTimeoutRef.current = window.setTimeout(() => setPartnerLevel(0), 2000);
                        break;

                    // WebRTC Video Signaling
                    case "video_offer":
                        console.log("📹 Received video offer");
                        await handleVideoOffer(data.sdp);
                        break;

                    case "video_answer":
                        console.log("📹 Received video answer");
                        await handleVideoAnswer(data.sdp);
                        break;

                    case "ice_candidate":
                        if (data.candidate && peerConnectionRef.current) {
                            const pc = peerConnectionRef.current;
                            // Queue ICE candidates if remote description not set yet
                            if (!pc.remoteDescription) {
                                console.log("📹 Queuing ICE candidate (no remote description yet)");
                                pendingIceCandidatesRef.current.push(data.candidate);
                            } else {
                                try {
                                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                                    console.log("📹 Added ICE candidate");
                                } catch (e) {
                                    console.error("Error adding ICE candidate:", e);
                                }
                            }
                        }
                        break;
                }
            } catch (e) {
                console.error("Error parsing message:", e);
            }
        },
        [onPartnerJoined, onPartnerLeft, processAudioQueue, userType, createVideoOffer, handleVideoOffer, handleVideoAnswer]
    );

    // (WebRTC video callbacks moved above handleMessage)

    // Start audio capture
    const startAudioCapture = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 48000,
                    channelCount: 1,
                },
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user"
                }
            });

            mediaStreamRef.current = stream;
            setLocalStream(stream); // Set local stream for video display

            // Setup WebRTC peer connection for video
            const pc = new RTCPeerConnection(rtcConfig);
            peerConnectionRef.current = pc;

            // Add video track to peer connection (for sending to partner)
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            // Handle incoming video tracks from partner
            pc.ontrack = (event) => {
                console.log("📹 Received remote track:", event.track.kind);
                console.log("📹 Track enabled:", event.track.enabled);
                console.log("📹 Track readyState:", event.track.readyState);
                console.log("📹 Streams count:", event.streams?.length);

                // Always create a new MediaStream to ensure React detects the change
                // This is critical for re-rendering the video element
                if (event.streams && event.streams[0]) {
                    console.log("📹 Setting remote stream from event.streams[0]");
                    // Clone the stream to force React state update
                    const stream = event.streams[0];
                    setRemoteStream(stream);

                    // Also listen for track end to clean up
                    event.track.onended = () => {
                        console.log("📹 Remote track ended:", event.track.kind);
                    };
                } else {
                    // Fallback: create a new MediaStream with the track
                    console.log("📹 No streams in event, creating new MediaStream");
                    setRemoteStream((prev) => {
                        // Create new stream with all existing tracks plus new one
                        const allTracks = prev ? [...prev.getTracks(), event.track] : [event.track];
                        const newStream = new MediaStream(allTracks);
                        console.log("📹 Created new stream with", allTracks.length, "tracks");
                        return newStream;
                    });
                }
            };

            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        event: "ice_candidate",
                        candidate: event.candidate
                    }));
                }
            };

            // Handle ICE connection state changes
            pc.oniceconnectionstatechange = () => {
                console.log("📹 ICE connection state:", pc.iceConnectionState);

                // Handle ICE failure - may need to restart
                if (pc.iceConnectionState === "failed") {
                    console.log("📹 ICE connection failed, attempting restart...");
                    pc.restartIce();
                }

                if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
                    console.log("📹 ✅ Peer connection established successfully!");
                }
            };

            // Handle connection state changes
            pc.onconnectionstatechange = () => {
                console.log("📹 Connection state:", pc.connectionState);
                if (pc.connectionState === "connected") {
                    console.log("📹 ✅ WebRTC fully connected!");
                }
            };

            // Handle ICE gathering state
            pc.onicegatheringstatechange = () => {
                console.log("📹 ICE gathering state:", pc.iceGatheringState);
            };

            // Handle negotiation needed - log only, we manually trigger offers when partner joins
            pc.onnegotiationneeded = () => {
                console.log("📹 Negotiation needed (will create offer when partner joins)");
            };

            // Process any pending video offer that was received before peer connection was ready
            if (pendingOfferRef.current) {
                console.log("📹 Processing pending video offer");
                const pendingOffer = pendingOfferRef.current;
                pendingOfferRef.current = null;

                // Process the pending offer
                (async () => {
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        if (wsRef.current?.readyState === WebSocket.OPEN) {
                            wsRef.current.send(JSON.stringify({ event: "video_answer", sdp: pc.localDescription }));
                            console.log("📹 Video answer sent (from pending offer)");
                        }

                        // Process any ICE candidates that were queued while waiting for peer connection
                        console.log("📹 Processing", pendingIceCandidatesRef.current.length, "queued ICE candidates");
                        while (pendingIceCandidatesRef.current.length > 0) {
                            const candidate = pendingIceCandidatesRef.current.shift()!;
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                                console.log("📹 Added queued ICE candidate (from pending offer processing)");
                            } catch (e) {
                                console.error("Error adding queued ICE candidate:", e);
                            }
                        }
                    } catch (e) {
                        console.error("Error processing pending offer:", e);
                    }
                })();
            }

            const audioContext = new AudioContext({ sampleRate: 48000 });
            audioContextRef.current = audioContext;

            // Create audio-only stream for processing (we only want audio for WebSocket)
            const audioStream = new MediaStream(stream.getAudioTracks());
            const source = audioContext.createMediaStreamSource(audioStream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;
            source.connect(analyser);

            // Audio level meter
            const buf = new Uint8Array(analyser.frequencyBinCount);
            const updateMeter = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(buf);
                let sum = 0;
                for (let k = 0; k < buf.length; k++) sum += buf[k];
                const avg = sum / buf.length;
                const lvl = Math.min(100, Math.round((avg / 255) * 100));
                setLocalLevel(lvl);
                meterRafRef.current = requestAnimationFrame(updateMeter);
            };
            meterRafRef.current = requestAnimationFrame(updateMeter);

            // Audio processor
            const processor = audioContext.createScriptProcessor(8192, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (!isAudioOnRef.current) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const int16Data = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }
                audioChunksRef.current.push(int16Data);
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            // Send audio every 200ms
            sendIntervalRef.current = window.setInterval(() => {
                const ws = wsRef.current;
                if (!ws || ws.readyState !== WebSocket.OPEN) return;

                // Don't send audio when muted - also clear accumulated chunks
                if (!isAudioOnRef.current) {
                    audioChunksRef.current = [];
                    return;
                }

                if (audioChunksRef.current.length === 0) return;

                const totalLength = audioChunksRef.current.reduce(
                    (sum, chunk) => sum + chunk.length,
                    0
                );
                const combined = new Int16Array(totalLength);
                let offset = 0;
                for (const chunk of audioChunksRef.current) {
                    combined.set(chunk, offset);
                    offset += chunk.length;
                }
                audioChunksRef.current = [];

                const bytes = new Uint8Array(combined.buffer);
                let binary = "";
                for (let i = 0; i < bytes.length; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64Audio = btoa(binary);

                ws.send(JSON.stringify({ event: "audio", audio: base64Audio }));
            }, 200);

            console.log("🎤 Audio capture started");
        } catch (err) {
            console.error("Error starting audio:", err);
            setStatus("Microphone Error");
        }
    }, [isAudioOn]);

    // Connect WebSocket
    const connect = useCallback(async () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        setStatus("Connecting...");

        const wsUrl = getWSUrl();
        console.log("🔗 Connecting to:", wsUrl);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("✅ WebSocket connected");
            setStatus("Connected");
            setIsConnected(true);

            // Send connection info
            ws.send(
                JSON.stringify({
                    event: "connected",
                    roomId,
                    userType,
                    myLanguage,
                    myName,
                })
            );

            // Start audio capture
            startAudioCapture();
        };

        ws.onmessage = handleMessage;

        ws.onclose = () => {
            console.log("❌ WebSocket closed");
            setStatus("Disconnected");
            setIsConnected(false);
        };

        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
            setStatus("Connection Error");
        };
    }, [roomId, userType, myLanguage, myName, getWSUrl, handleMessage, startAudioCapture]);

    // Disconnect
    const disconnect = useCallback(() => {
        // Stop audio
        if (sendIntervalRef.current) {
            clearInterval(sendIntervalRef.current);
            sendIntervalRef.current = null;
        }
        if (meterRafRef.current) {
            cancelAnimationFrame(meterRafRef.current);
            meterRafRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            mediaStreamRef.current = null;
        }
        analyserRef.current = null;

        // Close peer connection
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        // Clear pending WebRTC state
        pendingOfferRef.current = null;
        pendingIceCandidatesRef.current = [];
        makingOfferRef.current = false;
        ignoreOfferRef.current = false;

        setLocalStream(null);
        setRemoteStream(null);

        // Close WebSocket
        if (wsRef.current) {
            if (wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ event: "disconnect" }));
            }
            wsRef.current.close();
            wsRef.current = null;
        }

        setIsConnected(false);
        setStatus("Disconnected");
        setLocalLevel(0);
    }, []);

    // Toggle mute
    const toggleMute = useCallback(() => {
        setIsAudioOn((prev) => {
            const newValue = !prev;
            isAudioOnRef.current = newValue; // Update ref immediately

            // Also disable the actual audio track for hardware-level mute
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getAudioTracks().forEach(track => {
                    track.enabled = newValue;
                });
            }

            // Clear any accumulated chunks when muting
            if (!newValue) {
                audioChunksRef.current = [];
            }

            console.log(`🎤 Mute toggled: ${newValue ? 'UNMUTED' : 'MUTED'}`);
            return newValue;
        });
    }, []);

    // Toggle video
    const toggleVideo = useCallback(() => {
        setIsVideoOn((prev) => {
            const newValue = !prev;
            isVideoOnRef.current = newValue;

            // Enable/disable video tracks
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getVideoTracks().forEach(track => {
                    track.enabled = newValue;
                });
            }

            console.log(`📹 Video toggled: ${newValue ? 'ON' : 'OFF'}`);
            return newValue;
        });
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        // State
        status,
        isConnected,
        isAudioOn,
        isVideoOn,
        localLevel,
        partnerLevel,
        transcripts,
        interimText,
        localStream,
        remoteStream,

        // Actions
        connect,
        disconnect,
        toggleMute,
        toggleVideo,
        setIsAudioOn,
    };
}
