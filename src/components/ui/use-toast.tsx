"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Toast, ToastProps, ToastActionElement } from "@/components/ui/toast";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";

type ToasterToast = ToastProps & {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ToastActionElement;
};

const ToastContext = createContext<{
  toast: (props: Omit<ToasterToast, "id">) => void;
  dismiss: (toastId: string) => void;
  toasts: ToasterToast[]; // Expose toasts array
}>({
  toast: () => {},
  dismiss: () => {},
  toasts: [],
});

export const useToast = () => {
  const context = useContext(ToastContext);

  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
};

export function ToastWrapper({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToasterToast[]>([]);

  const toast = (props: Omit<ToasterToast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prevToasts) => [...prevToasts, { id, ...props }]);
  };

  const dismiss = (toastId: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== toastId));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setToasts((prevToasts) => prevToasts.slice(1));
    }, 5000);

    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      <ToastProvider>
        {children}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  );
}