"use client";

import { HomeIcon, MailIcon } from "lucide-react";
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
    { href: "/canvas/demo", icon: HomeIcon, label: "Home" },
  ],
  shapes: [
    { icon: Icons.rectangle, label: "rect" as Shape },
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
type Shape = "rect" | "diamond" | "circle" | "pencil" | "arrow" | "free" | "text" | "eraser";

export function Dockbar({ selectedShape, setSelectedShape }: {
    selectedShape: Shape,
    setSelectedShape: (s: Shape) => void
}) {
  return (
    <div className="flex flex-col items-center justify-center">
      <TooltipProvider>
        <Dock direction="middle" className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-xl">
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
                      "hover:bg-muted hover:scale-105",
                      "active:scale-95"
                    )}
                  >
                    <item.icon className="size-4 text-muted-foreground" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-popover border-border">
                  <p className="text-sm font-medium text-popover-foreground">{item.label}</p>
                </TooltipContent>
              </Tooltip>
            </DockIcon>
          ))}
          <Separator orientation="vertical" className="h-full bg-border" />
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
                      "hover:bg-muted hover:scale-105",
                      "active:scale-95",
                      selectedShape === shape.label && [
                        "bg-primary text-primary-foreground shadow-lg",
                        "scale-105 ring-2 ring-primary/20"
                      ]
                    )}
                  >
                    <shape.icon className={cn(
                      "size-4 transition-colors duration-200",
                      selectedShape === shape.label 
                        ? "text-primary-foreground" 
                        : "text-muted-foreground"
                    )} />
                    {selectedShape === shape.label && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-popover border-border">
                  <p className="text-sm font-medium text-popover-foreground">{shape.label}</p>
                </TooltipContent>
              </Tooltip>
            </DockIcon>
          ))}
        </Dock>
      </TooltipProvider>
    </div>
  );
}
