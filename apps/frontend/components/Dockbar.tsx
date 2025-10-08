"use client";

import { CalendarIcon, HomeIcon, MailIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import React from "react";
import { SquareIcon, CircleIcon, DiamondIcon, ArrowRightIcon, LineChartIcon } from "lucide-react";

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
  diamond: (props: IconProps) => <DiamondIcon {...props} />,
  arrow: (props: IconProps) => <ArrowRightIcon {...props} />,
  line: (props: IconProps) => <LineChartIcon {...props} />,
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
    { icon: Icons.arrow, label: "circle" as Shape },
    { icon: Icons.line, label: "pencil" as Shape },
  ]
//   contact: {
//     social: {
//       GitHub: {
//         name: "GitHub",
//         url: "#",
//         icon: Icons.github,
//       },
//       LinkedIn: {
//         name: "LinkedIn",
//         url: "#",
//         icon: Icons.linkedin,
//       },
//       X: {
//         name: "X",
//         url: "#",
//         icon: Icons.x,
//       },
//       email: {
//         name: "Send Email",
//         url: "#",
//         icon: Icons.email,
//       },
//     },
//   },
};



// Define the Shape type based on your shape labels
type Shape = "rect" | "Ellipse" | "diamond" | "circle" | "pencil";

export function Dockbar({ selectedShape, setSelectedShape }: {
    selectedShape: Shape,
    setSelectedShape: (s: Shape) => void
}) {
  return (
    <div className="flex flex-col items-center justify-center">
      <TooltipProvider>
        <Dock direction="middle">
          {DATA.navbar.map((item) => (
            <DockIcon key={item.label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "size-12 rounded-full",
                    )}
                  >
                    <item.icon className="size-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            </DockIcon>
          ))}
          <Separator orientation="vertical" className="h-full" />
          {DATA.shapes.map((shape) => (
            <DockIcon key={shape.label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSelectedShape(shape.label)}
                    aria-label={shape.label}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "size-12 rounded-full",
                      selectedShape === shape.label && 'bg-neutral-800'
                    )}
                  >
                    <shape.icon className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{shape.label}</p>
                </TooltipContent>
              </Tooltip>
            </DockIcon>
          ))}
        </Dock>
      </TooltipProvider>
    </div>
  );
}
