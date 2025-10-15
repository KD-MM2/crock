'use client';

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { DropEvent, DropzoneOptions, FileRejection } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';
import { UploadIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type DropzoneContextType = {
  src?: File[];
  accept?: DropzoneOptions['accept'];
  maxSize?: DropzoneOptions['maxSize'];
  minSize?: DropzoneOptions['minSize'];
  maxFiles?: DropzoneOptions['maxFiles'];
};

const renderBytes = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)}${units[unitIndex]}`;
};

const DropzoneContext = createContext<DropzoneContextType | undefined>(undefined);

export type DropzoneProps = Omit<DropzoneOptions, 'onDrop'> & {
  src?: File[];
  className?: string;
  onDrop?: (acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent) => void;
  children?: ReactNode;
};

export const Dropzone = ({
  accept,
  maxFiles = 1,
  maxSize,
  minSize,
  onDrop,
  onError,
  disabled,
  src,
  className,
  children,
  ...props
}: DropzoneProps) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxFiles,
    maxSize,
    minSize,
    onError,
    disabled,
    // Disable default file input since we'll use Electron's native dialog
    noClick: true,
    noKeyboard: true,
    // Only allow drop, not file input
    noDrag: false,
    onDrop: (acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent) => {
      if (fileRejections.length > 0) {
        const message = fileRejections[0]?.errors[0]?.message;
        onError?.(new Error(message));
        return;
      }

      onDrop?.(acceptedFiles, fileRejections, event);
    },
    ...props
  });

  return (
    <DropzoneContext.Provider key={JSON.stringify(src)} value={{ src, accept, maxSize, minSize, maxFiles }}>
      <div
        {...getRootProps({
          className: cn(
            'relative flex h-auto w-full cursor-pointer flex-col overflow-hidden rounded-lg border-2 border-dashed border-border/60 bg-muted/20 p-8 text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isDragActive && 'border-primary/70 bg-primary/5 text-primary',
            disabled && 'cursor-not-allowed opacity-70',
            className
          ),
          role: 'button',
          tabIndex: 0,
          'data-state': isDragActive ? 'active' : 'idle',
          'data-disabled': disabled ? '' : undefined
        })}
        aria-disabled={disabled}
      >
        <input {...getInputProps()} disabled={disabled} />
        {children}
      </div>
    </DropzoneContext.Provider>
  );
};

const useDropzoneContext = () => {
  const context = useContext(DropzoneContext);

  if (!context) {
    throw new Error('useDropzoneContext must be used within a Dropzone');
  }

  return context;
};

export type DropzoneContentProps = {
  children?: ReactNode;
  className?: string;
};

const maxLabelItems = 3;

export const DropzoneContent = ({ children, className }: DropzoneContentProps) => {
  const { src } = useDropzoneContext();

  if (!src) {
    return null;
  }

  if (children) {
    return <>{children}</>;
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <UploadIcon size={16} />
      </div>
      <p className="my-2 w-full truncate text-sm font-medium">
        {src.length > maxLabelItems
          ? `${src
              .slice(0, maxLabelItems)
              .map((file) => file.name)
              .join(', ')} và ${src.length - maxLabelItems} file khác`
          : src.map((file) => file.name).join(', ')}
      </p>
      <p className="w-full text-wrap text-xs text-muted-foreground">Kéo thả hoặc click để thay đổi</p>
    </div>
  );
};

export type DropzoneEmptyStateProps = {
  children?: ReactNode;
  className?: string;
};

export const DropzoneEmptyState = ({ children, className }: DropzoneEmptyStateProps) => {
  const { src, accept, maxSize, minSize, maxFiles } = useDropzoneContext();

  if (src) {
    return null;
  }

  if (children) {
    return <>{children}</>;
  }

  let caption = '';

  if (accept) {
    caption += 'Chấp nhận ';
    caption += Object.keys(accept).join(', ');
  }

  if (minSize && maxSize) {
    caption += ` trong khoảng ${renderBytes(minSize)} đến ${renderBytes(maxSize)}`;
  } else if (minSize) {
    caption += ` ít nhất ${renderBytes(minSize)}`;
  } else if (maxSize) {
    caption += ` nhỏ hơn ${renderBytes(maxSize)}`;
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <UploadIcon size={16} />
      </div>
      <p className="my-2 w-full truncate text-sm font-medium">Tải lên {maxFiles === 1 ? '1 tệp' : 'các tệp'}</p>
      <p className="w-full text-wrap text-xs text-muted-foreground">Kéo thả hoặc click để tải lên</p>
      {caption && <p className="text-wrap text-xs text-muted-foreground">{caption}.</p>}
    </div>
  );
};
