import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary/95 shadow-sm shadow-primary/15 hover:bg-primary/95 active:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive/90 shadow-sm shadow-destructive/15 hover:bg-destructive/90 active:bg-destructive/80",
        outline:
          "border border-border/80 bg-background text-foreground shadow-sm shadow-black/5 hover:border-primary/70 hover:bg-primary/5 hover:text-foreground",
        secondary:
          "border border-secondary-border bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90 active:bg-secondary/80",
        ghost:
          "border border-transparent bg-transparent text-foreground/80 hover:bg-muted/50 hover:text-foreground",
        link: "rounded-none border-none bg-transparent p-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-10 px-4 py-2.5",
        sm: "min-h-8 rounded-lg px-3 text-xs",
        lg: "min-h-11 rounded-xl px-7",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, ...props },
    ref,
  ) => {
    const childArray = React.Children.toArray(props.children);
    const isValidSlotChild =
      asChild &&
      childArray.length === 1 &&
      React.isValidElement(childArray[0]) &&
      childArray[0].type !== React.Fragment;

    const Comp = isValidSlotChild ? Slot : "button";

    if (asChild && !isValidSlotChild) {
      if (import.meta.env.DEV) {
        console.warn(
          "Button with asChild expects a single non-fragment React element child.",
          props.children,
        );
      }
    }

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          loading ? "opacity-80 pointer-events-none" : "",
        )}
        ref={ref}
        aria-busy={loading}
        disabled={loading || (props as any).disabled}
        {...props}
      >
        {!asChild && loading && (
          <span
            className="inline-flex h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        )}
        {props.children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
