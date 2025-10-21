"use client";
import { initDemoDraw,  } from "@/draw";
import { useEffect, useRef, useState } from "react";
import { Dockbar } from "@/components/Dockbar";
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
import { HomeIcon, SettingsIcon, PaletteIcon, ShareIcon, SunIcon, MoonIcon, Pencil, Moon, Sun, FolderIcon, UserIcon, LogInIcon, LogOutIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

export function DemoCanvas(){
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [ selectedShape, setSelectedShape ] = useState<Shape>("rect");
    const [ showWelcome, setShowWelcome ] = useState(true);
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    
    // Authentication and rooms state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [userRooms, setUserRooms] = useState<Room[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);

    // Collaboration dialog state
    const [showCollabDialog, setShowCollabDialog] = useState(false);
    const [collabMode, setCollabMode] = useState<"create" | "join">("create");
    const [username, setUsername] = useState("");
    const [roomId, setRoomId] = useState("");
    const [roomSlug, setRoomSlug] = useState("");

    // Auth check via backend /me endpoint
    const checkAuth = async (): Promise<boolean> => {
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

    useEffect(() => {
        //@ts-expect-error - selectedShape is set on window object
        window.selectedShape = selectedShape
    }, [selectedShape])

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

    useEffect(() => {
        if (canvasRef.current){
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d")
            
            if (!ctx){
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
            
            initDemoDraw(canvas);
            
            return () => {
                window.removeEventListener('resize', resizeCanvas);
            };
        }
    }, [canvasRef])

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
                                                <SidebarMenuButton onClick={() => {
                                                    navigator.clipboard.writeText(window.location.href);
                                                    toast.success("Demo URL copied to clipboard!");
                                                }}>
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
                                                <SidebarMenuButton onClick={() => {
                                                    navigator.clipboard.writeText(window.location.href);
                                                    toast.success("Demo URL copied to clipboard!");
                                                }}>
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
             setSelectedShape={(shape) => {
               setSelectedShape(shape);
               setShowWelcome(false);
             }}
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

       {/* Welcome Screen Overlay */}
       {showWelcome && (
         <div className="absolute inset-0 z-20 bg-background">
           {/* Sidebar button - Left side */}
           <div className="absolute top-1 left-2 sm:left-4 z-30 pointer-events-auto">
             <div className="p-2 pt-2">
             <SidebarTrigger />
             </div>
           </div>
           
           {/* Theme toggle button - Right side */}
           <div className="absolute p-2 pt-2 top-1 right-2 sm:right-4 z-30 pointer-events-auto">
             <button
               onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
               className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md bg-card/90 backdrop-blur-sm hover:bg-card transition-colors drop-shadow-lg"
               title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
             >
               {theme === "dark" ? (
                 <Sun className="h-3 w-3 sm:h-4 sm:w-4" />
               ) : (
                 <Moon className="h-3 w-3 sm:h-4 sm:w-4" />
               )}
               <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                 {theme === "dark" ? "Light" : "Dark"}
               </span>
             </button>
           </div>
           
           {/* Center dockbar */}
           <div className="absolute top-1 left-1/2 transform -translate-x-1/2 z-30 flex flex-col items-center pointer-events-auto">
             <Dockbar 
               selectedShape={selectedShape} 
               setSelectedShape={(shape) => {
                 setSelectedShape(shape);
                 setShowWelcome(false);
               }}
             />
             {/* Text below dockbar with arrow - only show when showWelcome is true */}
             {showWelcome && (
               <div className="mt-2 sm:mt-4 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                 <svg className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="1.5">
                   <path d="M 10 40 Q 10 10 20 10" />
                   <path d="M 20 10 L 15 15 M 20 10 L 25 15" />
                 </svg>
                 <span className="hidden sm:inline mt-5">Select a tool and start drawing!</span>
                 <span className="sm:hidden mt-5">Select a tool!</span>
               </div>
             )}
           </div>
           
           {/* Center content */}
           <div className="flex items-center justify-center h-full pt-16 sm:pt-20">
             <div className="text-center max-w-xs sm:max-w-md px-4 sm:px-6">
               {/* Annotations */}
               <div className="absolute top-10 sm:top-10 left-2 sm:left-8 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                 <div className="flex items-start gap-1 sm:gap-2">
                   <svg className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="1.5">
                     <path d="M 10 40 Q 10 10 20 10" />
                     <path d="M 20 10 L 15 15 M 20 10 L 25 15" />
                   </svg>
                   <span className="hidden sm:inline">Export, preferences, languages, ...</span>
                   <span className="sm:hidden">Export, preferences...</span>
                 </div>
               </div>

               <div className="absolute top-24 sm:top-32 right-2 sm:right-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                 <div className="flex items-start gap-1 sm:gap-2">
                   <svg className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="1.5">
                     <path d="M 40 10 Q 40 40 30 40" />
                     <path d="M 30 40 L 35 35 M 30 40 L 25 35" />
                   </svg>
                   <div>
                     <div className="hidden sm:block">Set you theme &</div>
                     <div className="sm:hidden">Set theme &</div>
                     <div>start drawing!</div>
                   </div>
                 </div>
               </div>

               {/* Logo and Title */}
               <div className="mb-4 sm:mb-6">
                 <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                   <Pencil className="w-8 h-8 sm:w-10 sm:h-10 text-black dark:text-white" strokeWidth={2} />
                   <h1 className="text-4xl sm:text-6xl font-bold text-black dark:text-white">
                     ExcaliDraw
                   </h1>
                 </div>
                 <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-6 sm:mb-10">
                   All your data is saved locally in your browser
                 </p>
               </div>

               {/* Buttons */}
               <div className="space-y-2 sm:space-y-3">
                <button
                  onClick={async () => {
                    const authed = await checkAuth();
                    if (!authed) {
                      router.push('/signin');
                      return;
                    }
                    setShowCollabDialog(true);
                  }}
                   className="w-full flex items-center justify-start gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 group"
                 >
                   <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                     <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                     <circle cx="9" cy="7" r="4" />
                     <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                     <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                   </svg>
                   <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">Live collaboration</span>
                 </button>
                 
                <button
                  onClick={() => router.push('/signup')}
                   className="w-full flex items-center justify-start gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 group"
                 >
                   <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                     <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                     <circle cx="9" cy="7" r="4" />
                     <line x1="19" y1="8" x2="19" y2="14" />
                     <line x1="22" y1="11" x2="16" y2="11" />
                   </svg>
                   <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">Sign up</span>
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
      
      {/* Full screen canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full border-0"
        style={{ 
          backgroundColor: theme === 'dark' ? '#1f2937' : 'white',
          cursor: 'crosshair'
        }}
      ></canvas>

      {/* Zoom controls - Always visible */}
      <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-30 flex items-center gap-1 sm:gap-2 bg-card/90 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 drop-shadow-lg">
        <button className="px-1.5 sm:px-2 py-0.5 sm:py-1 hover:bg-muted rounded text-xs sm:text-sm">−</button>
        <span className="text-xs sm:text-sm font-medium px-1 sm:px-2">100%</span>
        <button className="px-1.5 sm:px-2 py-0.5 sm:py-1 hover:bg-muted rounded text-xs sm:text-sm">+</button>
      </div>

      {/* Live Collaboration Dialog */}
      <Dialog open={showCollabDialog} onOpenChange={setShowCollabDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Live Collaboration</DialogTitle>
            <DialogDescription>
              Start a new collaborative session or join an existing one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <button
                onClick={() => setCollabMode("create")}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                  collabMode === "create"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                Create Room
              </button>
              <button
                onClick={() => setCollabMode("join")}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                  collabMode === "join"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                Join Room
              </button>
            </div>

            {collabMode === "create" && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="username" className="text-sm font-medium text-foreground">Your Name</label>
                  <Input id="username" placeholder="Enter your name" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1" />
                </div>
                <button
                  onClick={async () => {
                    const authed = await checkAuth();
                    if (!authed) { router.push('/signin'); return; }
                    if (username.trim()) {
                      try {
                        const token = localStorage.getItem('auth_token') || '';
                        const resp = await fetch('/room', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: token },
                          body: JSON.stringify({ username })
                        });
                        const data = await resp.json();
                        
                        if (resp.ok && data?.message?.id) {
                          const roomId = data.message.id;
                          toast.success("Room created successfully!", {
                            description: `Redirecting to your new room...`,
                            duration: 2000,
                          });
                          setShowCollabDialog(false); // Close dialog
                          router.push(`/canvas/${roomId}`);
                        } else {
                          toast.error("Failed to create room", {
                            description: data?.message || "Please try again",
                            duration: 3000,
                          });
                        }
                      } catch (error) {
                        toast.error("Failed to create room", {
                          description: "Network error. Please try again.",
                          duration: 3000,
                        });
                      }
                    }
                  }}
                  disabled={!username.trim()}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create Room
                </button>
              </div>
            )}

            {collabMode === "join" && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="roomurl" className="text-sm font-medium text-foreground">Room URL</label>
                  <Input 
                    id="roomurl" 
                    placeholder="Paste room URL (e.g., https://yoursite.com/canvas/123)" 
                    value={roomSlug}  // Reuse roomSlug state for URL
                    onChange={(e) => setRoomSlug(e.target.value)} 
                    className="mt-1" 
                  />
                </div>
                <button
                  onClick={async () => {
                    const authed = await checkAuth();
                    if (!authed) { 
                      router.push('/signin'); 
                      return; 
                    }
                    
                    if (roomSlug.trim()) {
                      try {
                        // Extract roomId from URL
                        const urlMatch = roomSlug.match(/\/canvas\/(\d+)/);
                        if (!urlMatch) {
                          toast.error("Invalid room URL", {
                            description: "Please enter a valid room URL",
                            duration: 3000,
                          });
                          return;
                        }
                        
                        const roomId = urlMatch[1];
                        toast.success("Joining room...", {
                          duration: 2000,
                        });
                        setShowCollabDialog(false);
                        router.push(`/canvas/${roomId}`);
                      } catch (error) {
                        toast.error("Failed to join room", {
                          description: "Please check the URL and try again",
                          duration: 3000,
                        });
                      }
                    }
                  }}
                  disabled={!roomSlug.trim()}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Join Room
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
                </SidebarInset>
            </div>
        </SidebarProvider>
    )
}