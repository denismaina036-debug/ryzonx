import { cn } from "@/lib/utils";
import {
  pmFieldHintClass,
  pmFieldLabelClass,
  pmRequiredMarkClass,
} from "@/features/pool-manager/constants/ui";

export function PmFormField({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div>
        <label className={pmFieldLabelClass}>
          {label}
          {required && <span className={pmRequiredMarkClass}> *</span>}
        </label>
        {hint && <p className={pmFieldHintClass}>{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function PmFormGuide({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-[var(--pm-accent-ring)] bg-[var(--pm-accent-muted)] px-5 py-4">
      <p className="text-sm font-semibold text-[var(--id-text)]">{title}</p>
      <ul className="mt-2.5 list-inside list-disc space-y-1.5 text-xs leading-relaxed text-[var(--id-text-secondary)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
