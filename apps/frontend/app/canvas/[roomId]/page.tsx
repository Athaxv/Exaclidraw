"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RoomCanvas from "@/components/RoomCanvas";

export default function CanvasPage({ params }:{
    params: Promise<{
        roomId: string
    }>
}){
    const [roomId, setRoomId] = useState<string>("");
    const [isChecking, setIsChecking] = useState(true);
    const router = useRouter();

    useEffect(() => {
        params.then((resolvedParams) => {
            setRoomId(resolvedParams.roomId);
        });
    }, [params]);

    // Authentication check
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('auth_token');
            
            if (!token) {
                console.log('No auth token found, redirecting to signin');
                router.push('/signin');
                return;
            }

            try {
                const res = await fetch('http://localhost:5000/me', {
                    headers: { Authorization: token }
                });

                if (!res.ok) {
                    console.log('Auth check failed, redirecting to signin');
                    router.push('/signin');
                    return;
                }

                setIsChecking(false);
            } catch (error) {
                console.error('Auth check error:', error);
                router.push('/signin');
            }
        };

        if (roomId) {
            checkAuth();
        }
    }, [roomId, router]);

    if (!roomId || isChecking) {
        return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <div>
            <RoomCanvas roomId={roomId}></RoomCanvas>
        </div>
    );
}