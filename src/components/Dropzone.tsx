import { useRef, useCallback, type ReactNode, type DragEvent } from "react";

interface Props {
  onFiles: (files: File[]) => void;
  accept: string;
  multiple?: boolean;
  children: ReactNode;
  className?: string;
}

export function Dropzone({ onFiles, accept, multiple = true, children, className = "" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.classList.remove("ring-2", "ring-[color:var(--accent-red)]");
      const files = Array.from(e.dataTransfer.files);
      if (files.length) onFiles(files);
    },
    [onFiles]
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        e.currentTarget.classList.add("ring-2", "ring-[color:var(--accent-red)]");
      }}
      onDragLeave={(e) => e.currentTarget.classList.remove("ring-2", "ring-[color:var(--accent-red)]")}
      onDrop={handleDrop}
      className={`cursor-pointer transition ${className}`}
    >
      {children}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </div>
  );
}
