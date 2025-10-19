"use client";

import { HomeIcon, MailIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import React from "react";
import { SquareIcon, CircleIcon, DiamondIcon, ArrowRightIcon, LineChartIcon, MousePointerIcon, EraserIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Dock, DockIcon } from "./ui/dock";

export type IconProps = React.HTMLAttributes<SVGElement>;


// ...existing code...

const Icons = {
  // ...existing icons...
  rectangle: (props: IconProps) => <SquareIcon {...props} />,
  ellipse: (props: IconProps) => <CircleIcon {...props} />,
  circle: (props: IconProps) => <CircleIcon {...props} />,
  diamond: (props: IconProps) => <DiamondIcon {...props} />,
  arrow: (props: IconProps) => <ArrowRightIcon {...props} />,
  line: (props: IconProps) => <LineChartIcon {...props} />,
  free: (props: IconProps) => <MousePointerIcon {...props} />,
  text: (props: IconProps) => <MailIcon {...props} />,
  eraser: (props: IconProps) => <EraserIcon {...props} />,
  // ...existing code...
};

const DATA = {
  navbar: [
    { href: "#", icon: HomeIcon, label: "Home" },
    { href: "#", icon: PencilIcon, label: "Blog" },
  ],
  shapes: [
    { icon: Icons.rectangle, label: "rect" as Shape },
    { icon: Icons.ellipse, label: "Ellipse" as Shape },
    { icon: Icons.diamond, label: "diamond" as Shape },
    { icon: Icons.circle, label: "circle" as Shape },
    { icon: Icons.line, label: "pencil" as Shape },
    { icon: Icons.arrow, label: "arrow" as Shape },
    { icon: Icons.free, label: "free" as Shape },
    { icon: Icons.text, label: "text" as Shape },
    { icon: Icons.eraser, label: "eraser" as Shape },
  ]
};



// Define the Shape type based on your shape labels
type Shape = "rect" | "Ellipse" | "diamond" | "circle" | "pencil" | "arrow" | "free" | "text" | "eraser";

export function Dockbar({ selectedShape, setSelectedShape }: {
    selectedShape: Shape,
    setSelectedShape: (s: Shape) => void
}) {
  return (
    <div className="flex flex-col items-center justify-center">
      <TooltipProvider>
        <Dock direction="middle" className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl dark:bg-gray-900/95 dark:border-gray-700/50 dark:shadow-2xl">
          {DATA.navbar.map((item) => (
            <DockIcon key={item.label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "size-12 rounded-full transition-all duration-200",
                      "hover:bg-gray-100 hover:scale-105 dark:hover:bg-gray-800/60",
                      "active:scale-95 dark:active:bg-gray-700/60"
                    )}
                  >
                    <item.icon className="size-4 text-gray-600 dark:text-gray-300" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
                </TooltipContent>
              </Tooltip>
            </DockIcon>
          ))}
          <Separator orientation="vertical" className="h-full bg-gray-300 dark:bg-gray-600" />
          {DATA.shapes.map((shape) => (
            <DockIcon key={shape.label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSelectedShape(shape.label)}
                    aria-label={shape.label}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "size-12 rounded-full transition-all duration-200 relative",
                      "hover:bg-gray-100 hover:scale-105 dark:hover:bg-gray-800/60",
                      "active:scale-95 dark:active:bg-gray-700/60",
                      selectedShape === shape.label && [
                        "bg-black text-white shadow-lg",
                        "dark:bg-black dark:text-white",
                        "dark:shadow-blue-500/25 dark:shadow-lg",
                        "scale-105 ring-2 ring-purple-500/20 dark:ring-blue-400/30"
                      ]
                    )}
                  >
                    <shape.icon className={cn(
                      "size-4 transition-colors duration-200",
                      selectedShape === shape.label 
                        ? "text-white dark:text-white" 
                        : "text-gray-600 dark:text-gray-300"
                    )} />
                    {selectedShape === shape.label && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-black rounded-full dark:bg-white" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{shape.label}</p>
                </TooltipContent>
              </Tooltip>
            </DockIcon>
          ))}
        </Dock>
      </TooltipProvider>
    </div>
  );
}
