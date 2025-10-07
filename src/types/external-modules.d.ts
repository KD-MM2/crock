declare module 'sonner' {
  import type { ComponentType, ReactNode } from 'react';

  export interface ToasterProps {
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    richColors?: boolean;
    closeButton?: boolean;
    duration?: number;
  }

  export const Toaster: ComponentType<ToasterProps>;

  interface ToastOptions {
    id?: string | number;
    description?: ReactNode;
    duration?: number;
  }

  interface ToastFn {
    (message: ReactNode, options?: ToastOptions): void;
    success(message: ReactNode, options?: ToastOptions): void;
    error(message: ReactNode, options?: ToastOptions): void;
    info(message: ReactNode, options?: ToastOptions): void;
    warning(message: ReactNode, options?: ToastOptions): void;
    dismiss(id?: string | number): void;
  }

  export const toast: ToastFn;
}

declare module 'qrcode.react' {
  import type { CSSProperties, ComponentType } from 'react';

  export interface QRCodeProps {
    value: string;
    size?: number;
    level?: 'L' | 'M' | 'Q' | 'H';
    includeMargin?: boolean;
    bgColor?: string;
    fgColor?: string;
    style?: CSSProperties;
  }

  export const QRCodeSVG: ComponentType<QRCodeProps>;
}
