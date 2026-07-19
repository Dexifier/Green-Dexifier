"use client";

// Responsive modal primitives: a centered Dialog on desktop, a bottom sheet
// (rounded top, drag handle, slide-up) on mobile. One API for both.
import { useDexifier } from "@/app/providers/DexifierProvider";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ComponentProps, ElementType, ReactNode } from "react";

type ModalParts = {
  Root: ElementType;
  Trigger: ElementType;
  Close: ElementType;
  Header: ElementType;
  Title: ElementType;
  isMobile: boolean;
};

export const useResponsiveModal = (): ModalParts => {
  const { isMobile } = useDexifier();
  return {
    Root: isMobile ? Sheet : Dialog,
    Trigger: isMobile ? SheetTrigger : DialogTrigger,
    Close: isMobile ? SheetClose : DialogClose,
    Header: isMobile ? SheetHeader : DialogHeader,
    Title: isMobile ? SheetTitle : DialogTitle,
    isMobile,
  };
};

type ResponsiveContentProps = ComponentProps<typeof DialogContent> & {
  children: ReactNode;
};

export const ResponsiveContent = ({
  className,
  children,
  ...props
}: ResponsiveContentProps) => {
  const { isMobile } = useDexifier();
  if (isMobile) {
    return (
      <SheetContent
        side="bottom"
        className={cn(
          "flex flex-col max-h-[88vh] rounded-t-3xl border-t border-primary/25 bg-[#041008]/95 backdrop-blur-2xl p-4 pb-8",
          className
        )}
        {...props}
      >
        {/* drag handle */}
        <div className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-white/20" />
        {children}
      </SheetContent>
    );
  }
  return (
    <DialogContent className={className} {...props}>
      {children}
    </DialogContent>
  );
};
