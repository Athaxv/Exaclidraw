import { HTTP_BACKEND } from "@/config";
import axios from "axios";

export type DemoDrawOptions = {
    textFont?: string; // e.g. "16px sans-serif"
    textColor?: string; // CSS color
    textPlaceholder?: string; // input placeholder
    textInputBorder?: string; // CSS border for inline input
};

const defaultDemoDrawOptions: Required<DemoDrawOptions> = {
    textFont: "40px Virgil, sans-serif",
    textColor: "rgba(255, 255, 255, 1)",
    textPlaceholder: "",
    textInputBorder: "rgba(0, 0, 0)"
};

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
} | {
    type: "arrow";
    startX: number;
    startY: number;
    endX: number;
    endY: number;
} | {
    type: "text";
    x: number;
    y: number;
    text: string;
} | {
    type: "eraser";
}

// Hit detection functions for each shape type
function isPointInRect(x: number, y: number, shape: { x: number, y: number, width: number, height: number }): boolean {
    return x >= shape.x && x <= shape.x + shape.width && 
           y >= shape.y && y <= shape.y + shape.height;
}

function isPointInCircle(x: number, y: number, shape: { centerX: number, centerY: number, radius: number }): boolean {
    const distance = Math.sqrt((x - shape.centerX) ** 2 + (y - shape.centerY) ** 2);
    return distance <= shape.radius;
}

function isPointInDiamond(x: number, y: number, shape: { centerX: number, centerY: number, width: number, height: number }): boolean {
    const halfWidth = Math.abs(shape.width) / 2;
    const halfHeight = Math.abs(shape.height) / 2;
    const dx = Math.abs(x - shape.centerX);
    const dy = Math.abs(y - shape.centerY);
    return (dx / halfWidth) + (dy / halfHeight) <= 1;
}

function isPointInLine(x: number, y: number, shape: { startX: number, startY: number, endX: number, endY: number }, tolerance: number = 5): boolean {
    const A = x - shape.startX;
    const B = y - shape.startY;
    const C = shape.endX - shape.startX;
    const D = shape.endY - shape.startY;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) {
        param = dot / lenSq;
    }

    let xx, yy;
    if (param < 0) {
        xx = shape.startX;
        yy = shape.startY;
    } else if (param > 1) {
        xx = shape.endX;
        yy = shape.endY;
    } else {
        xx = shape.startX + param * C;
        yy = shape.startY + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
}

function isPointInText(x: number, y: number, shape: { x: number, y: number, text: string }, ctx: CanvasRenderingContext2D): boolean {
    const metrics = ctx.measureText(shape.text);
    const textWidth = metrics.width;
    const textHeight = parseInt(ctx.font) || 16; // Approximate height
    return x >= shape.x && x <= shape.x + textWidth && 
           y >= shape.y && y <= shape.y + textHeight;
}

function findShapeAtPoint(x: number, y: number, shapes: Shape[], ctx: CanvasRenderingContext2D): Shape | null {
    // Check shapes in reverse order (top to bottom)
    for (let i = shapes.length - 1; i >= 0; i--) {
        const shape = shapes[i];
        
        switch (shape.type) {
            case "rect":
                if (isPointInRect(x, y, shape)) return shape;
                break;
            case "circle":
                if (isPointInCircle(x, y, shape)) return shape;
                break;
            case "diamond":
                if (isPointInDiamond(x, y, shape)) return shape;
                break;
            case "pencil":
            case "arrow":
                if (isPointInLine(x, y, shape)) return shape;
                break;
            case "text":
                if (isPointInText(x, y, shape, ctx)) return shape;
                break;
        }
    }
    return null;
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
            
            if (parsedChat.action === "erase" && parsedChat.shapeIndex !== undefined) {
                // Handle eraser action from other clients
                if (parsedChat.shapeIndex >= 0 && parsedChat.shapeIndex < existingShapes.length) {
                    existingShapes.splice(parsedChat.shapeIndex, 1);
                    clearCanvas(canvas, existingShapes, ctx);
                }
            } else if (parsedChat.shape) {
                // Handle new shape creation
                existingShapes.push(parsedChat.shape);
                clearCanvas(canvas, existingShapes, ctx);
            }
        }
    }

    clearCanvas(canvas, existingShapes, ctx);

    let clicked = false;
    let startX = 0;
    let startY = 0;
    canvas.addEventListener("mousedown", (e) => {
        //@ts-expect-error - selectedShape is set on window object
        const selectedShape = window.selectedShape;
        
        if (selectedShape === "eraser") {
            // Handle eraser tool - find and remove shape at click point
            const clickedShape = findShapeAtPoint(e.clientX, e.clientY, existingShapes, ctx);
            if (clickedShape) {
                const shapeIndex = existingShapes.indexOf(clickedShape);
                if (shapeIndex > -1) {
                    existingShapes.splice(shapeIndex, 1);
                    clearCanvas(canvas, existingShapes, ctx);
                    
                    // Send eraser action to other clients
                    socket.send(JSON.stringify({
                        type: "chat",
                        message: JSON.stringify({
                            action: "erase",
                            shapeIndex: shapeIndex
                        }),
                        roomId
                    }));
                }
            }
            return;
        }
        
        clicked = true;
        startX = e.clientX;
        startY = e.clientY;
    })
    canvas.addEventListener("mouseup", (e) => {
        clicked = false;
        const width = e.clientX - startX;
        const height = e.clientY - startY;

        //@ts-expect-error - selectedShape is set on window object
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
        else if (selectedShape === "arrow") {
            shape = {
                type: "arrow",
                startX: startX,
                startY: startY,
                endX: e.clientX,
                endY: e.clientY
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
            ctx.strokeStyle = "rgba(0, 0, 0, 1)";
            //@ts-expect-error - selectedShape is set on window object
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
            else if (selectedShape === "arrow") {
                // Draw the main arrow line
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(e.clientX, e.clientY);
                ctx.stroke();
                
                // Calculate arrowhead
                const angle = Math.atan2(e.clientY - startY, e.clientX - startX);
                const arrowLength = 15;
                const arrowAngle = Math.PI / 6; // 30 degrees
                
                // Arrowhead lines
                const arrowX1 = e.clientX - arrowLength * Math.cos(angle - arrowAngle);
                const arrowY1 = e.clientY - arrowLength * Math.sin(angle - arrowAngle);
                const arrowX2 = e.clientX - arrowLength * Math.cos(angle + arrowAngle);
                const arrowY2 = e.clientY - arrowLength * Math.sin(angle + arrowAngle);
                
                ctx.beginPath();
                ctx.moveTo(e.clientX, e.clientY);
                ctx.lineTo(arrowX1, arrowY1);
                ctx.moveTo(e.clientX, e.clientY);
                ctx.lineTo(arrowX2, arrowY2);
                ctx.stroke();
            }
        }
    })
}

export async function initDemoDraw(canvas: HTMLCanvasElement, options?: DemoDrawOptions) {
    const ctx = canvas.getContext("2d");
    const DemoexistingShapes: Shape[] = [];
    const opts = { ...defaultDemoDrawOptions, ...(options || {}) };

    if (!ctx) {
        throw new Error("Failed to get 2D context from canvas.");
    }
    DemoClearCanvas(canvas, DemoexistingShapes, ctx, opts);

    let clicked = false;
    let startX = 0;
    let startY = 0;
    let isTyping = false;
    let typingBuffer = "";
    let typingX = 0;
    let typingY = 0;
    canvas.addEventListener("mousedown", (e) => {
        //@ts-expect-error - selectedShape is set on window object
        const selectedShape = window.selectedShape;
        
        if (selectedShape === "eraser") {
            // Handle eraser tool - find and remove shape at click point
            const clickedShape = findShapeAtPoint(e.clientX, e.clientY, DemoexistingShapes, ctx);
            if (clickedShape) {
                const shapeIndex = DemoexistingShapes.indexOf(clickedShape);
                if (shapeIndex > -1) {
                    DemoexistingShapes.splice(shapeIndex, 1);
                    DemoClearCanvas(canvas, DemoexistingShapes, ctx, opts);
                }
            }
            return;
        }
        
        if (selectedShape === "text") {
            // Enter text-typing mode at the clicked position
            isTyping = true;
            typingBuffer = "";
            typingX = e.clientX;
            typingY = e.clientY;
            DemoClearCanvas(canvas, DemoexistingShapes, ctx, opts);
            ctx.fillStyle = opts.textColor;
            ctx.font = opts.textFont;
            ctx.textBaseline = "top";
            return; // don't start drag while typing
        }
        clicked = true;
        startX = e.clientX;
        startY = e.clientY;
    })
    canvas.addEventListener("mouseup", (e) => {
        clicked = false;
        const width = e.clientX - startX;
        const height = e.clientY - startY;

        //@ts-expect-error - selectedShape is set on window object
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
        else if (selectedShape === "arrow") {
            shape = {
                type: "arrow",
                startX: startX,
                startY: startY,
                endX: e.clientX,
                endY: e.clientY
            }
        }

        console.log("shape", shape);
        if (!shape) {
            return;
        }

        DemoexistingShapes.push(shape);
        // Redraw with the newly added shape
        DemoClearCanvas(canvas, DemoexistingShapes, ctx, opts);
    })

    // Draw preview while dragging without losing previous shapes
    canvas.addEventListener("mousemove", (e) => {
        if (clicked) {
            const width = e.clientX - startX;
            const height = e.clientY - startY;
            DemoClearCanvas(canvas, DemoexistingShapes, ctx, opts);
            ctx.strokeStyle = "rgba(0, 0, 0, 1)";
            //@ts-expect-error - selectedShape is set on window object
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
                const w = Math.abs(e.clientX - startX);
                const h = Math.abs(e.clientY - startY);

                const halfWidth = w / 2;
                const halfHeight = h / 2;

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
            else if (selectedShape === "arrow") {
                // Draw the main arrow line
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(e.clientX, e.clientY);
                ctx.stroke();
                
                // Calculate arrowhead
                const angle = Math.atan2(e.clientY - startY, e.clientX - startX);
                const arrowLength = 15;
                const arrowAngle = Math.PI / 6; // 30 degrees
                
                // Arrowhead lines
                const arrowX1 = e.clientX - arrowLength * Math.cos(angle - arrowAngle);
                const arrowY1 = e.clientY - arrowLength * Math.sin(angle - arrowAngle);
                const arrowX2 = e.clientX - arrowLength * Math.cos(angle + arrowAngle);
                const arrowY2 = e.clientY - arrowLength * Math.sin(angle + arrowAngle);
                
                ctx.beginPath();
                ctx.moveTo(e.clientX, e.clientY);
                ctx.lineTo(arrowX1, arrowY1);
                ctx.moveTo(e.clientX, e.clientY);
                ctx.lineTo(arrowX2, arrowY2);
                ctx.stroke();
            }
        }
    })

    // Keyboard-driven text entry when in typing mode
    window.addEventListener("keydown", (ke) => {
        if (!isTyping) return;
        if (ke.key === "Enter") {
            ke.preventDefault();
            const val = typingBuffer.trim();
            if (val.length > 0) {
                DemoexistingShapes.push({ type: "text", x: typingX, y: typingY, text: val });
                DemoClearCanvas(canvas, DemoexistingShapes, ctx, opts);
            }
            typingBuffer = "";
            isTyping = false;
            return;
        }
        if (ke.key === "Escape") {
            ke.preventDefault();
            typingBuffer = "";
            isTyping = false;
            DemoClearCanvas(canvas, DemoexistingShapes, ctx, opts);
            return;
        }
        if (ke.key === "Backspace") {
            ke.preventDefault();
            typingBuffer = typingBuffer.slice(0, -1);
        } else if (ke.key.length === 1) {
            // Append printable character
            typingBuffer += ke.key;
        } else {
            return;
        }
        // Preview current typing without committing
        DemoClearCanvas(canvas, DemoexistingShapes, ctx, opts);
        ctx.fillStyle = opts.textColor;
        ctx.font = opts.textFont; // always reset font to avoid shrinking
        ctx.textBaseline = "top";
        if (typingBuffer.length > 0) {
            ctx.fillText(typingBuffer, typingX, typingY);
        }
    })
}

function DemoClearCanvas(
    canvas: HTMLCanvasElement,
    DemoexistingShapes: Shape[],
    ctx: CanvasRenderingContext2D,
    opts?: Required<DemoDrawOptions>
) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "rgba(255, 255, 255)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    DemoexistingShapes.map((shape) => {
        if (shape.type === "rect") {
            ctx.strokeStyle = "rgba(0, 0, 0)";
            ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        }
        else if (shape.type === "circle") {
            ctx.beginPath();
            ctx.arc(shape.centerX, shape.centerY, shape.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.closePath();
        }
        else if (shape.type === "pencil") {
            ctx.strokeStyle = "rgba(0, 0, 0)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(shape.startX, shape.startY);
            ctx.lineTo(shape.endX, shape.endY);
            ctx.stroke();
            ctx.closePath();
        }
        else if (shape.type === "diamond") {
            ctx.strokeStyle = "rgba(0, 0, 0)";
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
        else if (shape.type === "arrow") {
            ctx.strokeStyle = "rgba(0, 0, 0)";
            ctx.lineWidth = 2;
            
            // Draw the main arrow line
            ctx.beginPath();
            ctx.moveTo(shape.startX, shape.startY);
            ctx.lineTo(shape.endX, shape.endY);
            ctx.stroke();
            
            // Calculate arrowhead
            const angle = Math.atan2(shape.endY - shape.startY, shape.endX - shape.startX);
            const arrowLength = 15;
            const arrowAngle = Math.PI / 6; // 30 degrees
            
            // Arrowhead lines
            const arrowX1 = shape.endX - arrowLength * Math.cos(angle - arrowAngle);
            const arrowY1 = shape.endY - arrowLength * Math.sin(angle - arrowAngle);
            const arrowX2 = shape.endX - arrowLength * Math.cos(angle + arrowAngle);
            const arrowY2 = shape.endY - arrowLength * Math.sin(angle + arrowAngle);
            
            ctx.beginPath();
            ctx.moveTo(shape.endX, shape.endY);
            ctx.lineTo(arrowX1, arrowY1);
            ctx.moveTo(shape.endX, shape.endY);
            ctx.lineTo(arrowX2, arrowY2);
            ctx.stroke();
        }
        else if (shape.type === "text") {
            ctx.fillStyle = opts?.textColor || "rgba(0, 0, 0, 1)";
            ctx.font = opts?.textFont || "16px sans-serif";
            ctx.textBaseline = "top";
            ctx.fillText(shape.text, shape.x, shape.y);
        }
    })
}

function clearCanvas(canvas: HTMLCanvasElement, existingShapes: Shape[], ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "rgba(255, 255, 255)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    existingShapes.map((shape) => {
        if (shape.type === "rect") {
            ctx.strokeStyle = "rgba(0, 0, 0)";
            ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        }
        else if (shape.type === "circle") {
            ctx.strokeStyle = "rgba(0, 0, 0)";
            ctx.beginPath();
            ctx.arc(shape.centerX, shape.centerY, shape.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.closePath();
        }
        else if (shape.type === "pencil") {
            ctx.strokeStyle = "rgba(0, 0, 0)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(shape.startX, shape.startY);
            ctx.lineTo(shape.endX, shape.endY);
            ctx.stroke();
            ctx.closePath();
        }
        else if (shape.type === "diamond") {
            ctx.strokeStyle = "rgba(0, 0, 0)";
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
        else if (shape.type === "arrow") {
            ctx.strokeStyle = "rgba(0, 0, 0)";
            ctx.lineWidth = 2;
            
            // Draw the main arrow line
            ctx.beginPath();
            ctx.moveTo(shape.startX, shape.startY);
            ctx.lineTo(shape.endX, shape.endY);
            ctx.stroke();
            
            // Calculate arrowhead
            const angle = Math.atan2(shape.endY - shape.startY, shape.endX - shape.startX);
            const arrowLength = 15;
            const arrowAngle = Math.PI / 6; // 30 degrees
            
            // Arrowhead lines
            const arrowX1 = shape.endX - arrowLength * Math.cos(angle - arrowAngle);
            const arrowY1 = shape.endY - arrowLength * Math.sin(angle - arrowAngle);
            const arrowX2 = shape.endX - arrowLength * Math.cos(angle + arrowAngle);
            const arrowY2 = shape.endY - arrowLength * Math.sin(angle + arrowAngle);
            
            ctx.beginPath();
            ctx.moveTo(shape.endX, shape.endY);
            ctx.lineTo(arrowX1, arrowY1);
            ctx.moveTo(shape.endX, shape.endY);
            ctx.lineTo(arrowX2, arrowY2);
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