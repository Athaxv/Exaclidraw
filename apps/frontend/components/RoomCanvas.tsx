"use client";

import { initDraw } from "@/draw";
import { useEffect, useRef, useState } from "react";
import { Dockbar } from "./Dockbar";
import { WS_URL } from "@/config";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { HomeIcon, SettingsIcon, PaletteIcon, ShareIcon, SunIcon, MoonIcon, Moon, Sun, FolderIcon, UserIcon, LogInIcon, LogOutIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Shape = "rect" | "diamond" | "circle" | "pencil" | "arrow" | "free" | "text" | "eraser";

interface Room {
    id: number;
    slug: string;
    adminId: string;
    createdAt?: Date;
}

interface UserData {
    userId: string;
}

export default function RoomCanvas({ roomId }: { roomId: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedShape, setSelectedShape] = useState<Shape>("rect");
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    
    // Authentication and rooms state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [userRooms, setUserRooms] = useState<Room[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);

    useEffect(() => {
        //@ts-expect-error - selectedShape is set on window object
        window.selectedShape = selectedShape
    }, [selectedShape])

    useEffect(() => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d")
            
            if (!ctx) {
                return;
            }

            // Set canvas size to fill the container
            const resizeCanvas = () => {
                const container = canvas.parentElement;
                if (container) {
                    canvas.width = container.clientWidth;
                    canvas.height = container.clientHeight;
                }
            };

            // Initial resize
            resizeCanvas();
            
            // Resize on window resize
            window.addEventListener('resize', resizeCanvas);
            
            // Initialize drawing with socket
            if (socket) {
                initDraw(canvas, roomId, socket);
            }
            
            return () => {
                window.removeEventListener('resize', resizeCanvas);
            };
        }
    }, [canvasRef, roomId, socket])

    // WebSocket connection
    useEffect(() => {
        const token = localStorage.getItem('auth_token') || '';
        if (!token) {
            console.error('No auth token found');
            return;
        }

        const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

        ws.onopen = () => {
            console.log('WebSocket connected');
            setSocket(ws);
            const joinRoomData = JSON.stringify({
                type: "join_room",
                roomId
            });
            console.log('Joining room:', joinRoomData);
            ws.send(joinRoomData);
        }

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            toast.error("Connection failed", {
                description: "Unable to connect to the server. Please check if the WebSocket server is running.",
                duration: 5000,
            });
        }

        ws.onclose = (event) => {
            console.log('WebSocket connection closed:', event.code, event.reason);
            setSocket(null);
            if (event.code !== 1000) { // Not a normal closure
                toast.error("Connection lost", {
                    description: "Reconnecting...",
                    duration: 3000,
                });
            }
        }

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        }
    }, [roomId])

    // Authentication check function
    const checkAuth = async () => {
        try {
            const token = localStorage.getItem('auth_token') || '';
            if (!token) return false;
            const res = await fetch('http://localhost:5000/me', { 
                headers: { Authorization: token }
            });
            if (res.ok) {
                const data = await res.json();
                setUserData(data);
                setIsAuthenticated(true);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    };

    // Fetch user rooms function
    const fetchUserRooms = async () => {
        try {
            setLoadingRooms(true);
            const token = localStorage.getItem('auth_token') || '';
            const res = await fetch('http://localhost:5000/rooms', {
                headers: { Authorization: token }
            });
            if (res.ok) {
                const data = await res.json();
                setUserRooms(data.message || []); // Backend returns { message: rooms }
            }
        } catch (error) {
            console.error('Failed to fetch rooms:', error);
        } finally {
            setLoadingRooms(false);
        }
    };

    // Initial auth check and room fetch
    useEffect(() => {
        checkAuth().then(authed => {
            if (authed) {
                fetchUserRooms();
            }
        });
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        setIsAuthenticated(false);
        setUserData(null);
        setUserRooms([]);
        toast.success("Logged out successfully!");
        router.push('/signin');
    };

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success("Room URL copied to clipboard!", {
                description: "Share this link with others to collaborate",
                duration: 3000,
            });
        } catch (err) {
            console.error('Failed to copy URL:', err);
            toast.error("Failed to copy URL", {
                description: "Please try copying the URL manually",
                duration: 3000,
            });
        }
    };

    if (!socket) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Connecting to the server...</p>
                    <p className="text-sm text-muted-foreground mt-2">Make sure the WebSocket server is running on port 8080</p>
                </div>
        </div>
        );
    }

    return (
        <SidebarProvider defaultOpen={false}>
            <div className="flex w-full h-screen bg-background">
                <Sidebar>
                    {isAuthenticated ? (
                        // Authenticated sidebar content
                        <>
                            <SidebarHeader>
                                <div className="flex items-center gap-2 px-2 py-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                        <UserIcon className="h-4 w-4" />
                                    </div>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">Welcome back!</span>
                                        <span className="truncate text-xs text-muted-foreground">User ID: {userData?.userId?.slice(0, 8)}...</span>
                                    </div>
                                </div>
                            </SidebarHeader>
                            <SidebarContent>
                                <SidebarGroup>
                                    <SidebarGroupLabel>Tools</SidebarGroupLabel>
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton>
                                                    <HomeIcon className="h-4 w-4" />
                                                    <span>Home</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton>
                                                    <PaletteIcon className="h-4 w-4" />
                                                    <span>Colors</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton>
                                                    <SettingsIcon className="h-4 w-4" />
                                                    <span>Settings</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>
                                
                                <SidebarGroup>
                                    <SidebarGroupLabel>Your Rooms</SidebarGroupLabel>
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            {loadingRooms ? (
                                                <SidebarMenuItem>
                                                    <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                                        Loading rooms...
                                                    </div>
                                                </SidebarMenuItem>
                                            ) : userRooms.length === 0 ? (
                                                <SidebarMenuItem>
                                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                        No rooms yet
                                                    </div>
                                                </SidebarMenuItem>
                                            ) : (
                                                userRooms.map((room) => (
                                                    <SidebarMenuItem key={room.id}>
                                                        <SidebarMenuButton 
                                                            onClick={() => router.push(`/canvas/${room.id}`)}
                                                            className="w-full justify-start"
                                                        >
                                                            <FolderIcon className="h-4 w-4" />
                                                            <div className="flex flex-col items-start">
                                                                <span className="text-sm font-medium">{room.slug}</span>
                                                                <span className="text-xs text-muted-foreground">ID: {room.id}</span>
                                                            </div>
                                                        </SidebarMenuButton>
                                                    </SidebarMenuItem>
                                                ))
                                            )}
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>

                                <SidebarGroup>
                                    <SidebarGroupLabel>Actions</SidebarGroupLabel>
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton onClick={handleShare}>
                                                    <ShareIcon className="h-4 w-4" />
                                                    <span>Share</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>
                            </SidebarContent>
                            <SidebarFooter>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                                            {theme === "dark" ? (
                                                <SunIcon className="h-4 w-4" />
                                            ) : (
                                                <MoonIcon className="h-4 w-4" />
                                            )}
                                            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton onClick={handleLogout}>
                                            <LogOutIcon className="h-4 w-4" />
                                            <span>Logout</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarFooter>
                        </>
                    ) : (
                        // Unauthenticated sidebar content
                        <>
                            <SidebarHeader>
                                <div className="flex items-center gap-2 px-2 py-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                        <PaletteIcon className="h-4 w-4" />
                                    </div>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">Welcome!</span>
                                        <span className="truncate text-xs text-muted-foreground">Sign in to access your rooms</span>
                                    </div>
                                </div>
                            </SidebarHeader>
                            <SidebarContent>
                                <SidebarGroup>
                                    <SidebarGroupLabel>Get Started</SidebarGroupLabel>
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton onClick={() => router.push('/signin')}>
                                                    <LogInIcon className="h-4 w-4" />
                                                    <span>Sign In</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton onClick={() => router.push('/signup')}>
                                                    <UserIcon className="h-4 w-4" />
                                                    <span>Sign Up</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>
                                
                                <SidebarGroup>
                                    <SidebarGroupLabel>Actions</SidebarGroupLabel>
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton onClick={handleShare}>
                                                    <ShareIcon className="h-4 w-4" />
                                                    <span>Share</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>
                            </SidebarContent>
                            <SidebarFooter>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                                            {theme === "dark" ? (
                                                <SunIcon className="h-4 w-4" />
                                            ) : (
                                                <MoonIcon className="h-4 w-4" />
                                            )}
                                            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarFooter>
                        </>
                    )}
                </Sidebar>
                <SidebarInset>
                    <div className={`relative h-screen w-full ${theme === 'dark' ? 'dark' : ''}`}>
                        {/* Floating controls overlay */}
                        <div className="absolute top-0 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
                            <div className="flex items-center gap-2 pointer-events-auto">
                                <div className="p-2 pt-2">
                                    <SidebarTrigger />
                                </div>
                            </div>
                            <div className="flex-1 flex justify-center pointer-events-auto">
                                <Dockbar 
                                    selectedShape={selectedShape} 
                                    setSelectedShape={setSelectedShape}
                                />
                            </div>
                            <div className="flex items-center gap-2 pointer-events-auto">
                                <div className="p-2 pt-2">
                                    <button
                                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                        className="flex items-center gap-2 px-3 py-2 rounded-md bg-card/90 backdrop-blur-sm hover:bg-card transition-colors drop-shadow-lg"
                                        title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                                    >
                                        {theme === "dark" ? (
                                            <Sun className="h-4 w-4" />
                                        ) : (
                                            <Moon className="h-4 w-4" />
                                        )}
                                        <span className="text-sm font-medium">
                                            {theme === "dark" ? "Light" : "Dark"}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Full screen canvas */}
                        <canvas
                            ref={canvasRef}
                            className="w-full h-full border-0"
                            style={{ 
                                backgroundColor: theme === 'dark' ? '#1f2937' : 'white',
                                cursor: 'crosshair'
                            }}
                        ></canvas>

                        {/* Zoom controls - Bottom left */}
                        <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-30 flex items-center gap-1 sm:gap-2 bg-card/90 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 drop-shadow-lg">
                            <button className="px-1.5 sm:px-2 py-0.5 sm:py-1 hover:bg-muted rounded text-xs sm:text-sm">−</button>
                            <span className="text-xs sm:text-sm font-medium px-1 sm:px-2">100%</span>
                            <button className="px-1.5 sm:px-2 py-0.5 sm:py-1 hover:bg-muted rounded text-xs sm:text-sm">+</button>
                        </div>

                        {/* Share button - Bottom right */}
                        <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 z-30">
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 px-3 py-2 bg-card/90 backdrop-blur-sm hover:bg-card transition-colors drop-shadow-lg rounded-lg"
                                title="Share room URL"
                            >
                                <ShareIcon className="h-4 w-4" />
                                <span className="text-sm font-medium">Share</span>
                            </button>
                        </div>
                    </div>
                </SidebarInset>
    </div>
        </SidebarProvider>
    );
}