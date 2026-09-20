// Utils
import { cn } from "@/shared/utils/cn";

// React
import { cloneElement, useState } from "react";

// Hooks
import useModal from "@/shared/hooks/useModal";
import useMediaQuery from "@/shared/hooks/useMediaQuery";

// Ui components
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from "@/shared/components/shadcn/dialog";
import { Drawer, DrawerContent } from "@/shared/components/shadcn/drawer";

const ModalWrapper = ({
  children,
  name = "",
  className = "",
  description = "",
  title = "Modal sarlavhasi",
}) => {
  const { closeModal, isOpen, data } = useModal(name);
  const [isLoading, setIsLoading] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 480px)");
  const hanldeCloseModal = (data) => !isLoading && closeModal(name, data);

  const body = cloneElement(children, {
    isLoading,
    setIsLoading,
    close: hanldeCloseModal,
    ...(data || {}),
  });

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={hanldeCloseModal}>
        <DialogContent className={cn("max-w-md", className)}>
          {/* Header */}
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          {/* Body */}
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={hanldeCloseModal}>
      <DrawerContent className={cn("px-5 pb-5", className)}>
        {/* Header */}
        <DialogHeader className="bg-white pb-3.5">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* Body */}
        <div className="w-full max-h-[calc(100vh-154px)] overflow-y-auto hidden-scroll">
          {body}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ModalWrapper;
