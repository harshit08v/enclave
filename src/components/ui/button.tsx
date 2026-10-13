import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-xs active:scale-[0.99]",
        secondary:
          "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-strong)] hover:bg-[var(--surface-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-xs active:scale-[0.99]",
        outline:
          "border border-[#C9DDD5] dark:border-[#254438] bg-[#FFFFFF] dark:bg-[#181A17] text-[#174A3A] dark:text-[#5E9B82] hover:bg-[#E7F0EC] dark:hover:bg-[#193128] hover:border-[#174A3A] active:scale-[0.99] font-bold shadow-xs",
        ghost:
          "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
        link: "text-[var(--accent)] underline-offset-4 hover:underline lowercase normal-case tracking-normal",
        destructive:
          "bg-rose-600 text-white hover:bg-rose-700 shadow-xs active:scale-[0.99]",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-md px-3.5 text-[11px]",
        lg: "h-12 rounded-lg px-7 text-xs tracking-widest",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
