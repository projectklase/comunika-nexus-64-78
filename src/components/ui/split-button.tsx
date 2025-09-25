
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SplitButtonProps {
  children: React.ReactNode;
  onMainAction: () => void;
  menuItems: Array<{
    label: string;
    onClick: () => void;
    separator?: boolean;
  }>;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function SplitButton({
  children,
  onMainAction,
  menuItems,
  className,
  variant = "default",
  size = "default",
}: SplitButtonProps) {
  return (
    <div className={cn("flex", className)}>
      <Button
        onClick={onMainAction}
        variant={variant}
        size={size}
        className="rounded-r-none border-r-0"
      >
        {children}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className="rounded-l-none px-2"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-card">
          {menuItems.map((item, index) => (
            <React.Fragment key={index}>
              {item.separator && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={item.onClick}>
                {item.label}
              </DropdownMenuItem>
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
