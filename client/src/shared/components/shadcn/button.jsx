// React
import * as React from "react";

// Utils
import { cn } from "@/shared/utils/cn";

// Components
import { Slot } from "@radix-ui/react-slot";

// CVA
import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "flex items-center justify-center gap-3 whitespace-nowrap rounded-[2px] text-sm font-medium ring-offset-background transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 disabled:select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-white focus-visible:-outline-offset-4 focus-visible:outline focus-visible:!outline-2",
        danger:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:outline-white focus-visible:-outline-offset-4 focus-visible:outline focus-visible:!outline-2",
        outline:
          "border border-input bg-white hover:bg-accent hover:text-accent-foreground focus-visible:outline-offset-0",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "size-10",
        default: "h-10 px-4 py-2",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
