"use client";

import { initDraw } from "@/draw";
import { useEffect, useRef } from "react";

export default function Canvas(){
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current){
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d")
            console.log(canvas)

            if (!ctx){
                return;
            }
            initDraw(canvas);
        }
    }, [canvasRef])
    return <div className="w-full h-full">
        {/* <h1>Hola, amigos</h1> */}
        <canvas height="730" ref={canvasRef}  width="1500">
        </canvas>
    </div>
}