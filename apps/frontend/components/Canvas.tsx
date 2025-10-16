import { initDraw } from "@/draw";
import { useEffect, useRef, useState } from "react";
import { Dockbar } from "./Dockbar";

type Shape = "rect" | "Ellipse" | "diamond" | "circle" | "pencil" | "arrow" | "free";

export function Canvas({ roomId, socket }: { roomId: string, socket: WebSocket }){
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [ selectedShape, setSelectedShape ] = useState<Shape>("rect");

    useEffect(() => {
        //@ts-ignore
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
    }, [canvasRef, roomId])

    return <div className="flex flex-col w-full h-full">
    <div className="flex-1 flex items-center justify-center relative w-full h-full">
      {/* Dockbar overlayed inside canvas area */}
      <div className="absolute top-4 z-10 px-4 py-2 flex">
        <Dockbar selectedShape={selectedShape} setSelectedShape={setSelectedShape}/>
      </div>
      <canvas
        height="730"
        ref={canvasRef}
        width="1500"
        className="w-full h-full"
      ></canvas>
    </div>
  </div>
}