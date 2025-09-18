import { initDraw } from "@/draw";
import { useEffect, useRef } from "react";

export function Canvas({ roomId, socket }: { roomId: string, socket: WebSocket }){
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current){
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d")
            console.log(canvas)

            if (!ctx){
                return;
            }
            initDraw(canvas, roomId, socket);
        }
    }, [canvasRef, roomId])

    return <div className="w-full h-full">
        <canvas height="730" ref={canvasRef}  width="1500"></canvas>
    </div>
}