import { type ReactNode } from "react";

/**
 * Shared line-icon set (Lucide-style geometry, hand-drawn — no dependency).
 * Replaces emoji-as-icons across the portal. Size + color via className.
 */
function S({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type IconProps = { className?: string };

export const IconMapPin = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M12 21s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12Z" />
    <circle cx="12" cy="9" r="2.5" />
  </S>
);

export const IconGrid = ({ className }: IconProps) => (
  <S className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </S>
);

export const IconAlert = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 10v4" />
    <path d="M12 17.5h.01" />
  </S>
);

export const IconWrench = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M15.5 6.5a3.5 3.5 0 0 0-4.7 4.7l-5.9 5.9a1.6 1.6 0 0 0 2.3 2.3l5.9-5.9a3.5 3.5 0 0 0 4.7-4.7L15.6 10l-1.9-.4L13.3 8l2.2-1.5Z" />
  </S>
);

export const IconTruck = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M3 6h11v9H3Z" />
    <path d="M14 9h3.5l3.5 3.5V15h-7Z" />
    <circle cx="7.5" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </S>
);

export const IconCamera = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7H7l1.2-1.8A1 1 0 0 1 9 4.7h6a1 1 0 0 1 .8.5L17 7h2.5A1.5 1.5 0 0 1 21 8.5V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
    <circle cx="12" cy="13" r="3" />
  </S>
);

export const IconChecklist = ({ className }: IconProps) => (
  <S className={className}>
    <path d="m3 6 1.6 1.6L8 4.5" />
    <path d="M11 6h9" />
    <path d="m3 13 1.6 1.6L8 11.5" />
    <path d="M11 13h9" />
    <path d="M4 20h16" />
  </S>
);

export const IconCheck = ({ className }: IconProps) => (
  <S className={className}>
    <path d="m5 12 4.5 4.5L19 7" />
  </S>
);

export const IconCheckCircle = ({ className }: IconProps) => (
  <S className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.4 2.4 4.6-4.8" />
  </S>
);

export const IconImage = ({ className }: IconProps) => (
  <S className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="9.5" r="1.6" />
    <path d="m4 18 4.5-4.5a1.5 1.5 0 0 1 2 0L15 18" />
    <path d="m13 16 1.8-1.8a1.5 1.5 0 0 1 2 0L20 16.5" />
  </S>
);

export const IconVideo = ({ className }: IconProps) => (
  <S className={className}>
    <rect x="3" y="6" width="12" height="12" rx="2" />
    <path d="m15 10 6-3v10l-6-3" />
  </S>
);

export const IconFile = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M7 3h7l5 5v13H7Z" />
    <path d="M14 3v5h5" />
  </S>
);

export const IconUploadCloud = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M7 18a4 4 0 0 1-.7-7.9 5.5 5.5 0 0 1 10.6-1.1A3.6 3.6 0 0 1 17 18h-1" />
    <path d="M12 13v7" />
    <path d="m9 16 3-3 3 3" />
  </S>
);

export const IconTrash = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M4 7h16" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" />
    <path d="M10 11v6M14 11v6" />
  </S>
);

export const IconDownload = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M12 4v10" />
    <path d="m8 11 4 4 4-4" />
    <path d="M5 19h14" />
  </S>
);

export const IconArrowRight = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M5 12h13" />
    <path d="m12 6 6 6-6 6" />
  </S>
);

export const IconArrowLeft = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M19 12H6" />
    <path d="m12 6-6 6 6 6" />
  </S>
);

export const IconSend = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M4 12 20 5l-7 15-2.5-6.5L4 12Z" />
  </S>
);

export const IconUser = ({ className }: IconProps) => (
  <S className={className}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </S>
);

export const IconBolt = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" />
  </S>
);
