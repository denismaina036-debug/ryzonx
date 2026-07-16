"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/user-avatar";
import { PROFILE_ICON_MAX_BYTES } from "@/constants/storage";
import { cn } from "@/lib/utils";

interface ProfileAvatarUploadProps {
  name: string;
  avatarUrl: string | null;
  onUploaded?: (avatarUrl: string) => void;
  className?: string;
  sizeClassName?: string;
}

export function ProfileAvatarUpload({
  name,
  avatarUrl,
  onUploaded,
  className,
  sizeClassName = "h-20 w-20",
}: ProfileAvatarUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > PROFILE_ICON_MAX_BYTES) {
      toast.error("Photo must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/investor/profile/avatar", {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Upload failed");

      setPreviewUrl(body.avatarUrl as string);
      onUploaded?.(body.avatarUrl as string);
      toast.success("Profile photo updated");
      router.refresh();
    } catch (err) {
      setPreviewUrl(avatarUrl);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      URL.revokeObjectURL(localPreview);
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className={cn("flex flex-col items-start gap-3 sm:flex-row sm:items-center", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative shrink-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--id-accent-soft)]"
        aria-label="Upload profile photo"
      >
        <UserAvatar
          name={name}
          avatarUrl={previewUrl}
          className={cn(sizeClassName, "rounded-2xl")}
          fallbackClassName="text-lg"
        />
        <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <Camera className="h-5 w-5 text-white" strokeWidth={1.75} />
          )}
        </span>
      </button>

      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--id-text)]">Profile photo</p>
        <p className="mt-1 text-xs text-[var(--id-text-muted)]">
          JPG, PNG, WebP, or GIF. Max 5 MB.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-2 text-xs font-semibold text-[var(--id-accent-text)] hover:underline disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Change photo"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
