"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

interface UseWebRTCProps {
    channelId: string;
    userId: string | null;
    isMicMuted: boolean;
}

export function useWebRTC({ channelId, userId, isMicMuted }: UseWebRTCProps) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const signalingChannel = useRef<RealtimeChannel | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    // ICE Servers (STUN). Turn is needed for production behind strict NATs.
    const rtcConfig: RTCConfiguration = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" }
        ]
    };

    // 1. Initialize Local Stream
    useEffect(() => {
        if (!userId || !channelId) return;

        let mounted = true;

        const initMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: false
                });

                if (mounted) {
                    setLocalStream(stream);
                    localStreamRef.current = stream;

                    // Apply initial mute state
                    stream.getAudioTracks().forEach(track => {
                        track.enabled = !isMicMuted;
                    });
                }
            } catch (err) {
                console.error("Error accessing microphone:", err);
            }
        };

        initMedia();

        return () => {
            mounted = false;
            // Cleanup stream
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            // Close all PCs
            peerConnections.current.forEach(pc => pc.close());
            peerConnections.current.clear();
        };
    }, [channelId, userId]);

    // 2. Handle Mute Toggle
    useEffect(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !isMicMuted;
            });
        }
    }, [isMicMuted]);

    // 3. Signaling Logic
    useEffect(() => {
        if (!userId || !channelId || !localStream) return;

        const setupSignaling = async () => {
            const channel = supabase.channel(`room:${channelId}`, {
                config: {
                    broadcast: { self: false }
                }
            });

            channel
                .on("broadcast", { event: "signal" }, async ({ payload }) => {
                    const { type, data, fromUserId, toUserId } = payload;

                    // Only handle messages for me
                    if (toUserId && toUserId !== userId) return;

                    if (type === "offer") {
                        await handleOffer(fromUserId, data);
                    } else if (type === "answer") {
                        await handleAnswer(fromUserId, data);
                    } else if (type === "ice-candidate") {
                        await handleIceCandidate(fromUserId, data);
                    } else if (type === "hello") {
                        // Someone joined and said hello. Initiate connection if I am effectively the host (or just everyone connects Mesh)
                        // Simpler Mesh: New user sends Hello. Everyone else sends Offer to New User.
                        await initiateConnection(fromUserId);
                    }
                })
                .subscribe(async (status) => {
                    if (status === "SUBSCRIBED") {
                        // Announce presence so others can connect to me
                        await channel.send({
                            type: "broadcast",
                            event: "signal",
                            payload: { type: "hello", fromUserId: userId }
                        });
                        signalingChannel.current = channel;
                    }
                });

            return channel;
        };

        // Delay slightly to ensure stream is ready
        const timeout = setTimeout(async () => {
            signalingChannel.current = await setupSignaling();
        }, 100);

        return () => {
            clearTimeout(timeout);
            if (signalingChannel.current) {
                supabase.removeChannel(signalingChannel.current);
            }
        };
    }, [channelId, userId, localStream]);

    // Helpers
    const createPeerConnection = (targetUserId: string) => {
        if (peerConnections.current.has(targetUserId)) {
            return peerConnections.current.get(targetUserId)!;
        }

        const pc = new RTCPeerConnection(rtcConfig);

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && signalingChannel.current) {
                signalingChannel.current.send({
                    type: "broadcast",
                    event: "signal",
                    payload: {
                        type: "ice-candidate",
                        data: event.candidate,
                        fromUserId: userId,
                        toUserId: targetUserId
                    }
                });
            }
        };

        // Handle Remote Stream
        pc.ontrack = (event) => {
            const [remoteStream] = event.streams;
            setRemoteStreams(prev => {
                const newMap = new Map(prev);
                newMap.set(targetUserId, remoteStream);
                return newMap;
            });
        };

        // Handle Cleanup
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                setRemoteStreams(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(targetUserId);
                    return newMap;
                });
                peerConnections.current.delete(targetUserId);
            }
        };

        peerConnections.current.set(targetUserId, pc);
        return pc;
    };

    const initiateConnection = async (targetUserId: string) => {
        const pc = createPeerConnection(targetUserId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (signalingChannel.current) {
            await signalingChannel.current.send({
                type: "broadcast",
                event: "signal",
                payload: {
                    type: "offer",
                    data: offer,
                    fromUserId: userId,
                    toUserId: targetUserId
                }
            });
        }
    };

    const handleOffer = async (fromUserId: string, offer: RTCSessionDescriptionInit) => {
        const pc = createPeerConnection(fromUserId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (signalingChannel.current) {
            await signalingChannel.current.send({
                type: "broadcast",
                event: "signal",
                payload: {
                    type: "answer",
                    data: answer,
                    fromUserId: userId,
                    toUserId: fromUserId
                }
            });
        }
    };

    const handleAnswer = async (fromUserId: string, answer: RTCSessionDescriptionInit) => {
        const pc = peerConnections.current.get(fromUserId);
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    };

    const handleIceCandidate = async (fromUserId: string, candidate: RTCIceCandidateInit) => {
        const pc = peerConnections.current.get(fromUserId);
        if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    };

    return { localStream, remoteStreams };
}
