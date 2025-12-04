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
    textColor: "rgba(0, 0, 0, 1)",
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
} | {
    type: "free";
    points: { x: number; y: number }[];
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

export function initDraw(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket, theme: string = 'light') {
    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error("Failed to get 2D context from canvas.");
    }

    const renderCtx = ctx as CanvasRenderingContext2D;
    const existingShapes: Shape[] = [];
    let isDisposed = false;

    const hydrateShapes = async () => {
        try {
            const shapes = await getExistingShapes(roomId);
            if (isDisposed) return;
            existingShapes.splice(0, existingShapes.length, ...shapes);
            clearCanvas(canvas, existingShapes, ctx, theme);
        } catch (error) {
            console.error("Failed to fetch existing shapes:", error);
        }
    };

    hydrateShapes();

    const sendMessage = (payload: unknown) => {
        if (socket.readyState !== WebSocket.OPEN) {
            console.warn("WebSocket is not open. Dropping draw payload.");
            return;
        }
        socket.send(JSON.stringify(payload));
    };

    const handleShapeMessage = (event: MessageEvent) => {
        if (isDisposed) {
            return;
        }

        try {
            const message = JSON.parse(event.data);

            if (message.type === "chat") {
                const parsedChat = JSON.parse(message.message);
                
                if (parsedChat.action === "erase" && parsedChat.shapeIndex !== undefined) {
                    // Handle eraser action from other clients
                    if (parsedChat.shapeIndex >= 0 && parsedChat.shapeIndex < existingShapes.length) {
                        existingShapes.splice(parsedChat.shapeIndex, 1);
                        clearCanvas(canvas, existingShapes, ctx, theme);
                    }
                } else if (parsedChat.shape) {
                    // Handle new shape creation
                    existingShapes.push(parsedChat.shape);
                    clearCanvas(canvas, existingShapes, ctx, theme);
                }
            }
        } catch (error) {
            console.error("Failed to process incoming draw message:", error);
        }
    };

    socket.addEventListener("message", handleShapeMessage);

    clearCanvas(canvas, existingShapes, ctx, theme);

    let clicked = false;
    let startX = 0;
    let startY = 0;
    let freeDrawPoints: { x: number; y: number }[] = [];
    let isTyping = false;
    let typingBuffer = "";
    let typingX = 0;
    let typingY = 0;
    let caretVisible = true;
    let caretTimer: number | null = null;

    function drawCaret(ctx: CanvasRenderingContext2D, x: number, y: number) {
        const fontPx = parseInt(ctx.font) || 16;
        ctx.save();
        ctx.strokeStyle = "rgb(147, 51, 234)";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + fontPx);
        ctx.stroke();
        ctx.restore();
    }

    function renderAll() {
        clearCanvas(canvas, existingShapes, renderCtx, theme);
        // Draw current typing preview and caret if applicable
        if (isTyping) {
            const textColor = theme === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 1)";
            renderCtx.fillStyle = textColor;
            renderCtx.font = "40px Virgil, sans-serif";
            renderCtx.textBaseline = "top";
            let caretX = typingX;
            if (typingBuffer.length > 0) {
                renderCtx.fillText(typingBuffer, typingX, typingY);
                const w = renderCtx.measureText(typingBuffer).width;
                caretX = typingX + w;
            }
            if (caretVisible) {
                drawCaret(renderCtx, caretX, typingY);
            }
        }
    }

    function startCaretBlink() {
        if (caretTimer) window.clearInterval(caretTimer);
        caretVisible = true;
        caretTimer = window.setInterval(() => {
            caretVisible = !caretVisible;
            renderAll();
        }, 500);
    }

    function stopCaretBlink() {
        if (caretTimer) {
            window.clearInterval(caretTimer);
            caretTimer = null;
        }
        caretVisible = false;
    }
    canvas.addEventListener("mousedown", (e) => {
        //@ts-expect-error - selectedShape is set on window object
        const selectedShape = window.selectedShape;
        if (selectedShape !== "text" && isTyping) {
            // If switching tools while typing, cancel caret
            isTyping = false;
            typingBuffer = "";
            stopCaretBlink();
            renderAll();
        }
        
        if (selectedShape === "eraser") {
            // Handle eraser tool - find and remove shape at click point
            const clickedShape = findShapeAtPoint(e.clientX, e.clientY, existingShapes, ctx);
            if (clickedShape) {
                const shapeIndex = existingShapes.indexOf(clickedShape);
                if (shapeIndex > -1) {
                    existingShapes.splice(shapeIndex, 1);
                    clearCanvas(canvas, existingShapes, ctx, theme);
                    
                    // Send eraser action to other clients
                    sendMessage({
                        type: "chat",
                        message: JSON.stringify({
                            action: "erase",
                            shapeIndex: shapeIndex
                        }),
                        roomId
                    });
                }
            }
            return;
        }
        
        if (selectedShape === "free") {
            // Start free drawing
            freeDrawPoints = [{ x: e.clientX, y: e.clientY }];
            clicked = true;
            return;
        }
        
        if (selectedShape === "text") {
            // Enter text-typing mode at the clicked position
            isTyping = true;
            typingBuffer = "";
            const rect = canvas.getBoundingClientRect();
            typingX = e.clientX - rect.left;
            typingY = e.clientY - rect.top;
            renderAll();
            // Start blinking after initial render
            startCaretBlink();
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
        else if (selectedShape === "free") {
            shape = {
                type: "free",
                points: freeDrawPoints
            }
        }

        console.log("shape", shape);
        if (!shape) {
            return;
        }

        existingShapes.push(shape);

        sendMessage({
            type: "chat",
            message: JSON.stringify({
                shape
            }),
            roomId
        });
    })
    canvas.addEventListener("mousemove", (e) => {
        if (clicked && !isTyping) {
            const width = e.clientX - startX;
            const height = e.clientY - startY;
            clearCanvas(canvas, existingShapes, ctx, theme);
            const strokeColor = theme === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 1)";
            ctx.strokeStyle = strokeColor;
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
            else if (selectedShape === "free") {
                // Add point to free drawing path
                freeDrawPoints.push({ x: e.clientX, y: e.clientY });
                
                // Draw the current free drawing path
                if (freeDrawPoints.length > 1) {
                    ctx.strokeStyle = "rgba(0, 0, 0, 1)";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(freeDrawPoints[0].x, freeDrawPoints[0].y);
                    for (let i = 1; i < freeDrawPoints.length; i++) {
                        ctx.lineTo(freeDrawPoints[i].x, freeDrawPoints[i].y);
                    }
                    ctx.stroke();
                }
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
                const textShape: Shape = { type: "text", x: typingX, y: typingY, text: val };
                existingShapes.push(textShape);
                sendMessage({
                    type: "chat",
                    message: JSON.stringify({ shape: textShape }),
                    roomId
                });
                clearCanvas(canvas, existingShapes, ctx, theme);
            }
            typingBuffer = "";
            isTyping = false;
            stopCaretBlink();
            renderAll();
            return;
        }
        if (ke.key === "Escape") {
            ke.preventDefault();
            typingBuffer = "";
            isTyping = false;
            stopCaretBlink();
            renderAll();
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
        renderAll();
    });

    return () => {
        isDisposed = true;
        socket.removeEventListener("message", handleShapeMessage);
    };
}

export function initDemoDraw(canvas: HTMLCanvasElement, options?: DemoDrawOptions, theme: string = 'light') {
    const ctx = canvas.getContext("2d");
    const DemoexistingShapes: Shape[] = [];
    const opts = { ...defaultDemoDrawOptions, ...(options || {}) };

    if (!ctx) {
        throw new Error("Failed to get 2D context from canvas.");
    }
    const demoCtx = ctx as CanvasRenderingContext2D;
    DemoClearCanvas(canvas, DemoexistingShapes, ctx, opts, theme);

    let clicked = false;
    let startX = 0;
    let startY = 0;
    let isTyping = false;
    let typingBuffer = "";
    let typingX = 0;
    let typingY = 0;
    let caretVisible = true;
    let caretTimer: number | null = null;

    function drawCaret(ctx: CanvasRenderingContext2D, x: number, y: number) {
        const fontPx = parseInt(ctx.font) || 16;
        ctx.save();
        ctx.strokeStyle = "rgb(147, 51, 234)";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + fontPx);
        ctx.stroke();
        ctx.restore();
    }

    function renderAll() {
        DemoClearCanvas(canvas, DemoexistingShapes, demoCtx, opts, theme);
        if (isTyping) {
            const textColor = theme === 'dark' ? "rgba(255, 255, 255, 0.9)" : (opts.textColor || "rgba(0, 0, 0, 1)");
            demoCtx.fillStyle = textColor;
            demoCtx.font = opts.textFont;
            demoCtx.textBaseline = "top";
            let caretX = typingX;
            if (typingBuffer.length > 0) {
                demoCtx.fillText(typingBuffer, typingX, typingY);
                const w = demoCtx.measureText(typingBuffer).width;
                caretX = typingX + w;
            }
            if (caretVisible) {
                drawCaret(demoCtx, caretX, typingY);
            }
        }
    }

    function startCaretBlink() {
        if (caretTimer) window.clearInterval(caretTimer);
        caretVisible = true;
        caretTimer = window.setInterval(() => {
            caretVisible = !caretVisible;
            renderAll();
        }, 500);
    }

    function stopCaretBlink() {
        if (caretTimer) {
            window.clearInterval(caretTimer);
            caretTimer = null;
        }
        caretVisible = false;
    }
    let freeDrawPoints: { x: number; y: number }[] = [];

    const handleMouseDown = (e: MouseEvent) => {
        //@ts-expect-error - selectedShape is set on window object
        const selectedShape = window.selectedShape;
        if (selectedShape !== "text" && isTyping) {
            isTyping = false;
            typingBuffer = "";
            stopCaretBlink();
            renderAll();
        }
        
        if (selectedShape === "eraser") {
            // Handle eraser tool - find and remove shape at click point
            const clickedShape = findShapeAtPoint(e.clientX, e.clientY, DemoexistingShapes, ctx);
            if (clickedShape) {
                const shapeIndex = DemoexistingShapes.indexOf(clickedShape);
                if (shapeIndex > -1) {
                    DemoexistingShapes.splice(shapeIndex, 1);
                    DemoClearCanvas(canvas, DemoexistingShapes, ctx, opts, theme);
                }
            }
            return;
        }
        
        if (selectedShape === "text") {
            // Enter text-typing mode at the clicked position
            isTyping = true;
            typingBuffer = "";
            const rect = canvas.getBoundingClientRect();
            typingX = e.clientX - rect.left;
            typingY = e.clientY - rect.top;
            renderAll();
            startCaretBlink();
            return; // don't start drag while typing
        }
        
        if (selectedShape === "free") {
            // Start free drawing
            freeDrawPoints = [{ x: e.clientX, y: e.clientY }];
            clicked = true;
            return;
        }

        clicked = true;
        startX = e.clientX;
        startY = e.clientY;
    };

    const handleMouseUp = (e: MouseEvent) => {
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
        else if (selectedShape === "free") {
            shape = {
                type: "free",
                points: freeDrawPoints
            }
        }

        console.log("shape", shape);
        if (!shape) {
            return;
        }

        DemoexistingShapes.push(shape);
        // Redraw with the newly added shape
        DemoClearCanvas(canvas, DemoexistingShapes, ctx, opts, theme);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (clicked && !isTyping) {
            const width = e.clientX - startX;
            const height = e.clientY - startY;
            DemoClearCanvas(canvas, DemoexistingShapes, ctx, opts, theme);
            const strokeColor = theme === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 1)";
            ctx.strokeStyle = strokeColor;
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
            else if (selectedShape === "free") {
                // Add point to free drawing path
                freeDrawPoints.push({ x: e.clientX, y: e.clientY });
                
                // Draw the current free drawing path
                if (freeDrawPoints.length > 1) {
                    ctx.strokeStyle = "rgba(0, 0, 0, 1)";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(freeDrawPoints[0].x, freeDrawPoints[0].y);
                    for (let i = 1; i < freeDrawPoints.length; i++) {
                        ctx.lineTo(freeDrawPoints[i].x, freeDrawPoints[i].y);
                    }
                    ctx.stroke();
                }
            }
        }
    };

    const handleKeyDown = (ke: KeyboardEvent) => {
        if (!isTyping) return;
        if (ke.key === "Enter") {
            ke.preventDefault();
            const val = typingBuffer.trim();
            if (val.length > 0) {
                DemoexistingShapes.push({ type: "text", x: typingX, y: typingY, text: val });
                DemoClearCanvas(canvas, DemoexistingShapes, ctx, opts, theme);
            }
            typingBuffer = "";
            isTyping = false;
            stopCaretBlink();
            renderAll();
            return;
        }
        if (ke.key === "Escape") {
            ke.preventDefault();
            typingBuffer = "";
            isTyping = false;
            stopCaretBlink();
            renderAll();
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
        renderAll();
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
        stopCaretBlink();
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mouseup", handleMouseUp);
        canvas.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("keydown", handleKeyDown);
    };
}

function DemoClearCanvas(
    canvas: HTMLCanvasElement,
    DemoexistingShapes: Shape[],
    ctx: CanvasRenderingContext2D,
    opts?: Required<DemoDrawOptions>,
    theme: string = 'light'
) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = theme === 'dark' ? "rgba(0, 0, 0)" : "rgba(255, 255, 255)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const strokeColor = theme === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 1)";
    const textColor = theme === 'dark' ? "rgba(255, 255, 255, 0.9)" : (opts?.textColor || "rgba(0, 0, 0, 1)");

    DemoexistingShapes.filter(shape => shape && shape.type).map((shape) => {
        if (shape.type === "rect") {
            ctx.strokeStyle = strokeColor;
            ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        }
        else if (shape.type === "circle") {
            ctx.strokeStyle = strokeColor;
            ctx.beginPath();
            ctx.arc(shape.centerX, shape.centerY, shape.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.closePath();
        }
        else if (shape.type === "pencil") {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(shape.startX, shape.startY);
            ctx.lineTo(shape.endX, shape.endY);
            ctx.stroke();
            ctx.closePath();
        }
        else if (shape.type === "diamond") {
            ctx.strokeStyle = strokeColor;
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
            ctx.strokeStyle = strokeColor;
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
            ctx.fillStyle = textColor;
            ctx.font = opts?.textFont || "16px sans-serif";
            ctx.textBaseline = "top";
            ctx.fillText(shape.text, shape.x, shape.y);
        }
        else if (shape.type === "free") {
            if (shape.points.length > 1) {
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(shape.points[0].x, shape.points[0].y);
                for (let i = 1; i < shape.points.length; i++) {
                    ctx.lineTo(shape.points[i].x, shape.points[i].y);
                }
                ctx.stroke();
            }
        }
    })
}

function clearCanvas(canvas: HTMLCanvasElement, existingShapes: Shape[], ctx: CanvasRenderingContext2D, theme: string = 'light') {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = theme === 'dark' ? "rgba(0, 0, 0)" : "rgba(255, 255, 255)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const strokeColor = theme === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 1)";
    const textColor = theme === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 1)";

    existingShapes.filter(shape => shape && shape.type).map((shape) => {
        if (shape.type === "rect") {
            ctx.strokeStyle = strokeColor;
            ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        }
        else if (shape.type === "circle") {
            ctx.strokeStyle = strokeColor;
            ctx.beginPath();
            ctx.arc(shape.centerX, shape.centerY, shape.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.closePath();
        }
        else if (shape.type === "pencil") {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(shape.startX, shape.startY);
            ctx.lineTo(shape.endX, shape.endY);
            ctx.stroke();
            ctx.closePath();
        }
        else if (shape.type === "diamond") {
            ctx.strokeStyle = strokeColor;
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
            ctx.strokeStyle = strokeColor;
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
            ctx.fillStyle = textColor;
            ctx.font = "40px Virgil, sans-serif";
            ctx.textBaseline = "top";
            ctx.fillText(shape.text, shape.x, shape.y);
        }
        else if (shape.type === "free") {
            if (shape.points.length > 1) {
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(shape.points[0].x, shape.points[0].y);
                for (let i = 1; i < shape.points.length; i++) {
                    ctx.lineTo(shape.points[i].x, shape.points[i].y);
                }
                ctx.stroke();
            }
        }
    })
}

async function getExistingShapes(roomId: string) {
    const res = await axios.get(`${HTTP_BACKEND}/chat/${roomId}`)
    const messages = res.data.messages;

    const shapes = messages.map((x: { message: string }) => {
        const msgData = JSON.parse(x.message)
        return msgData.shape;
    }).filter((shape: unknown): shape is Shape => {
        return shape !== null && typeof shape === 'object' && 'type' in shape;
    }); // Filter out undefined shapes

    return shapes;
}