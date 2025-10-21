import { initDraw } from "@/draw";
import { useEffect, useRef, useState } from "react";
import { Dockbar } from "./Dockbar";

type Shape = "rect" | "diamond" | "circle" | "pencil" | "arrow" | "free" | "text" | "eraser";

export function Canvas({ roomId, socket }: { roomId: string, socket: WebSocket }){
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [ selectedShape, setSelectedShape ] = useState<Shape>("rect");

    useEffect(() => {
        //@ts-expect-error - selectedShape is set on window object
        window.selectedShape = selectedShape
    }, [selectedShape])

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
    }, [canvasRef, roomId, socket])

    return <div className="flex flex-col w-full h-full bg-background">
    <div className="flex-1 flex items-center justify-center relative w-full h-full">
      {/* Dockbar overlayed inside canvas area */}
      <div className="absolute top-4 z-10 px-4 py-2 flex">
        <Dockbar selectedShape={selectedShape} setSelectedShape={setSelectedShape}/>
      </div>
      <canvas
        height="730"
        ref={canvasRef}
        width="1500"
        className="w-full h-full rounded-lg border border-border bg-background"
        style={{ backgroundColor: 'var(--background)' }}
      ></canvas>
    </div>
  </div>
}