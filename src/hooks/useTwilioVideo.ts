// src/hooks/useTwilioVideo.ts
// Twilio Video Hook - Manages video room connection (audio translation is separate)

import { useRef, useState, useEffect, useCallback } from "react";
import Video, {
    Room,
    LocalVideoTrack,
    RemoteVideoTrack,
    LocalParticipant,
    RemoteParticipant,
    RemoteTrackPublication,
} from "twilio-video";
import { BASE_URL } from "@/lib/utils";

interface UseTwilioVideoProps {
    roomId: string;
    identity: string;
    onRemoteParticipantConnected?: (participant: RemoteParticipant) => void;
    onRemoteParticipantDisconnected?: (participant: RemoteParticipant) => void;
}

export function useTwilioVideo({
    roomId,
    identity,
    onRemoteParticipantConnected,
    onRemoteParticipantDisconnected,
}: UseTwilioVideoProps) {
    // State
    const [isConnected, setIsConnected] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
    const [remoteVideoTrack, setRemoteVideoTrack] = useState<RemoteVideoTrack | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Refs
    const roomRef = useRef<Room | null>(null);
    const localTrackRef = useRef<LocalVideoTrack | null>(null);

    // Fetch video token from backend
    const fetchToken = useCallback(async () => {
        try {
            const response = await fetch(`${BASE_URL}/api/video-token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identity, roomName: roomId }),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch video token");
            }

            const data = await response.json();
            return data.token;
        } catch (err) {
            console.error("Error fetching video token:", err);
            throw err;
        }
    }, [roomId, identity]);

    // Handle remote participant track subscriptions
    const handleTrackSubscribed = useCallback((track: RemoteVideoTrack | any) => {
        if (track.kind === "video") {
            console.log("📹 Remote video track subscribed");
            setRemoteVideoTrack(track as RemoteVideoTrack);
        }
    }, []);

    const handleTrackUnsubscribed = useCallback((track: RemoteVideoTrack | any) => {
        if (track.kind === "video") {
            console.log("📹 Remote video track unsubscribed");
            setRemoteVideoTrack(null);
        }
    }, []);

    // Setup remote participant listeners
    const setupParticipant = useCallback((participant: RemoteParticipant) => {
        console.log("👤 Remote participant connected:", participant.identity);

        // Handle existing tracks
        participant.tracks.forEach((publication: RemoteTrackPublication) => {
            if (publication.isSubscribed && publication.track) {
                handleTrackSubscribed(publication.track);
            }
        });

        // Handle new tracks
        participant.on("trackSubscribed", handleTrackSubscribed);
        participant.on("trackUnsubscribed", handleTrackUnsubscribed);

        onRemoteParticipantConnected?.(participant);
    }, [handleTrackSubscribed, handleTrackUnsubscribed, onRemoteParticipantConnected]);

    // Connect to Twilio Video room
    const connect = useCallback(async () => {
        if (roomRef.current) {
            console.log("Already connected to video room");
            return;
        }

        try {
            setError(null);
            console.log("📹 Connecting to Twilio Video room:", roomId);

            // Get token
            const token = await fetchToken();

            // Create local video track
            const videoTrack = await Video.createLocalVideoTrack({
                width: 640,
                height: 480,
                frameRate: 24,
            });
            localTrackRef.current = videoTrack;
            setLocalVideoTrack(videoTrack);

            // Connect to room (video only - audio is handled by existing WebSocket)
            const room = await Video.connect(token, {
                name: roomId,
                tracks: [videoTrack], // Only video, no audio
                dominantSpeaker: true,
            });

            roomRef.current = room;
            setIsConnected(true);
            console.log("✅ Connected to Twilio Video room:", room.name);

            // Handle existing participants
            room.participants.forEach(setupParticipant);

            // Handle new participants
            room.on("participantConnected", setupParticipant);

            room.on("participantDisconnected", (participant: RemoteParticipant) => {
                console.log("👤 Remote participant disconnected:", participant.identity);
                setRemoteVideoTrack(null);
                onRemoteParticipantDisconnected?.(participant);
            });

            room.on("disconnected", () => {
                console.log("📹 Disconnected from video room");
                setIsConnected(false);
                setRemoteVideoTrack(null);
            });

        } catch (err: any) {
            console.error("Failed to connect to video room:", err);
            setError(err.message || "Failed to connect to video");
            setIsConnected(false);
        }
    }, [roomId, fetchToken, setupParticipant, onRemoteParticipantDisconnected]);

    // Disconnect from video room
    const disconnect = useCallback(() => {
        console.log("📹 Disconnecting from video room");

        // Stop local video track
        if (localTrackRef.current) {
            localTrackRef.current.stop();
            localTrackRef.current = null;
            setLocalVideoTrack(null);
        }

        // Disconnect from room
        if (roomRef.current) {
            roomRef.current.disconnect();
            roomRef.current = null;
        }

        setIsConnected(false);
        setRemoteVideoTrack(null);
    }, []);

    // Toggle video on/off
    const toggleVideo = useCallback(() => {
        if (localTrackRef.current) {
            if (isVideoOn) {
                localTrackRef.current.disable();
                console.log("📹 Video disabled");
            } else {
                localTrackRef.current.enable();
                console.log("📹 Video enabled");
            }
            setIsVideoOn(!isVideoOn);
        }
    }, [isVideoOn]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        // State
        isConnected,
        isVideoOn,
        localVideoTrack,
        remoteVideoTrack,
        error,

        // Actions
        connect,
        disconnect,
        toggleVideo,
    };
}
