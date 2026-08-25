import { notFound } from "next/navigation";
import { MobilePayPreview } from "./preview-client";

export default function MobilePayPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MobilePayPreview />;
}

