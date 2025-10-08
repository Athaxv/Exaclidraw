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
} | {
    type: "pencil";
    startX: number;
    startY: number;
    endX: number;
    endY: number;
} | {
    type: "diamond";
    centerX: number;
    centerY: number;
    width: number;
    height: number;
}

export async function initDraw(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
    const ctx = canvas.getContext("2d");
    const existingShapes: Shape[] = await getExistingShapes(roomId);

    // console.log(existingShapes)

    if (!ctx) {
        throw new Error("Failed to get 2D context from canvas.");
    }

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === "chat") {
            const parsedChat = JSON.parse(message.message);
            existingShapes.push(parsedChat.shape)
            clearCanvas(canvas, existingShapes, ctx);
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

        //@ts-ignore
        const selectedShape = window.selectedShape;
        let shape: Shape | null = null;
        if (selectedShape === "rect") {
            shape = {
                type: "rect",
                x: startX,
                y: startY,
                height,
                width
            };
        } else if (selectedShape === "circle") {
            const radius = Math.abs(Math.max(width, height) / 2);
            shape = {
                type: "circle",
                centerX: startX + radius,
                centerY: startY + radius,
                radius: radius
            };
        }
        else if (selectedShape === "pencil") {
            shape = {
                type: "pencil",
                startX: startX,
                startY: startY,
                endX: e.clientX,
                endY: e.clientY
            }
        }
        else if (selectedShape === "diamond") {
            shape = {
                type: "diamond",
                centerX: (startX + e.clientX) / 2,
                centerY: (startY + e.clientY) / 2,
                width: width,
                height: height
            }
        }

        console.log("shape", shape);
        if (!shape) {
            return;
        }

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
            //@ts-ignore
            const selectedShape = window.selectedShape;
            if (selectedShape === "rect") {
                ctx.strokeRect(startX, startY, width, height);
            }
            else if (selectedShape === "circle") {
                const radius = Math.max(width, height) / 2;
                const centerX = startX + radius;
                const centerY = startY + radius;
                ctx.beginPath();
                ctx.arc(centerX, centerY, Math.abs(radius), 0, Math.PI * 2);
                ctx.stroke();
                ctx.closePath();
            }
            else if (selectedShape === "pencil") {
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(e.clientX, e.clientY);
                ctx.stroke();
                ctx.closePath();
            }
            else if (selectedShape === "diamond") {
                const centerX = (startX + e.clientX) / 2;
                const centerY = (startY + e.clientY) / 2;
                const width = Math.abs(e.clientX - startX);
                const height = Math.abs(e.clientY - startY);

                const halfWidth = width / 2;
                const halfHeight = height / 2;

                // Four corners of the diamond
                const top = { x: centerX, y: centerY - halfHeight };
                const right = { x: centerX + halfWidth, y: centerY };
                const bottom = { x: centerX, y: centerY + halfHeight };
                const left = { x: centerX - halfWidth, y: centerY };

                ctx.beginPath();
                ctx.moveTo(top.x, top.y);
                ctx.lineTo(right.x, right.y);
                ctx.lineTo(bottom.x, bottom.y);
                ctx.lineTo(left.x, left.y);
                ctx.closePath();
                ctx.stroke();
            }
        }
    })
}

function clearCanvas(canvas: HTMLCanvasElement, existingShapes: Shape[], ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "rgba(0, 0, 0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    existingShapes.map((shape) => {
        if (shape.type === "rect") {
            ctx.strokeStyle = "rgba(255, 255, 255)";
            ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        }
        else if (shape.type === "circle") {
            ctx.beginPath();
            ctx.arc(shape.centerX, shape.centerY, shape.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.closePath();
        }
        else if (shape.type === "pencil") {
            ctx.strokeStyle = "rgba(255, 255, 255)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(shape.startX, shape.startY);
            ctx.lineTo(shape.endX, shape.endY);
            ctx.stroke();
            ctx.closePath();
        }
        else if (shape.type === "diamond"){
            ctx.strokeStyle = "rgba(255, 255, 255)";
    ctx.lineWidth = 2;

    const halfWidth = shape.width / 2;
    const halfHeight = shape.height / 2;

    // Four corners of the diamond
    const top = { x: shape.centerX, y: shape.centerY - halfHeight };
    const right = { x: shape.centerX + halfWidth, y: shape.centerY };
    const bottom = { x: shape.centerX, y: shape.centerY + halfHeight };
    const left = { x: shape.centerX - halfWidth, y: shape.centerY };

    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.lineTo(left.x, left.y);
    ctx.closePath();
    ctx.stroke();
        }
    })
}

async function getExistingShapes(roomId: string) {
    const res = await axios.get(`${HTTP_BACKEND}/chat/${roomId}`)
    const messages = res.data.messages;

    const shapes = messages.map((x: { message: string }) => {
        const msgData = JSON.parse(x.message)
        return msgData.shape;
    })

    return shapes;
}