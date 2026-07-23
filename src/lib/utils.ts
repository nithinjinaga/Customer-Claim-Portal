// Minimal classnames helper (shadcn convention). Kept dependency-free — the only
// consumer is the 3d-globe component; swap in clsx + tailwind-merge if a real
// shadcn setup is added later.
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
