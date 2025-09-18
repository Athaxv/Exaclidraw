import { HTTP_BACKEND } from "@/config";
import axios from "axios";

type Shape = {
    type: "rect",
    x: number,
    y: number,
    width: number,
    height: number
} | {
    type: "circle";
    centerX: number;
    centerY: number;
    radius: number
}

export async function initDraw(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
    const ctx = canvas.getContext("2d");
    const existingShapes: Shape[] = await getExistingShapes(roomId);

    console.log(existingShapes)

    if (!ctx) {
        throw new Error("Failed to get 2D context from canvas.");
    }

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === "chat"){
            const parsedChat = JSON.parse(message.message);
            existingShapes.push(parsedChat.shape)
            clearCanvas(canvas, existingShapes,ctx);
        }
    }

    clearCanvas(canvas, existingShapes, ctx);

    let clicked = false;
    let startX = 0;
    let startY = 0;
    canvas.addEventListener("mousedown", (e) => {
        clicked = true;
        startX = e.clientX;
        startY = e.clientY;
    })
    canvas.addEventListener("mouseup", (e) => {
        clicked = false;
        const width = e.clientX - startX;
        const height = e.clientY - startY;
        const shape: Shape = {
            type: "rect",
            x: startX,
            y: startY,
            height,
            width
        };
        existingShapes.push(shape);

        socket.send(JSON.stringify({
            type: "chat",
            message: JSON.stringify({
                shape
            }),
            roomId
        }))
    })
    canvas.addEventListener("mousemove", (e) => {
        if (clicked) {
            const width = e.clientX - startX;
            const height = e.clientY - startY;
            clearCanvas(canvas, existingShapes, ctx);
            ctx.strokeStyle = "rgba(255, 255, 255, 1)";
            ctx.strokeRect(startX, startY, width, height);
        }
    })
}

function clearCanvas(canvas: HTMLCanvasElement, existingShapes: Shape[], ctx: CanvasRenderingContext2D){
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "rgba(0, 0, 0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    existingShapes.map((shape) => {
        if (shape.type === "rect"){
            ctx.strokeStyle = "rgba(255, 255, 255)";
            ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        }
    })
}

async function getExistingShapes(roomId: string){
    const res = await axios.get(`${HTTP_BACKEND}/chat/${roomId}`)
    const messages = res.data.messages;

    const shapes = messages.map((x: {message: string}) => {
        const msgData = JSON.parse(x.message)
        return msgData.shape;
    })

    return shapes;
}