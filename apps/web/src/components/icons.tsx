/** Inline SVG icons transcribed from the prototype (stroke geometry preserved). */
import * as React from "react";

type IconProps = { size?: number; strokeWidth?: number } & React.SVGProps<SVGSVGElement>;

function S({ size = 19, strokeWidth = 1.6, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      {...rest}
    >
      {children}
    </svg>
  );
}

export const ChatIcon = (p: IconProps) => (
  <S {...p}>
    <path
      d="M3 6.5A3.5 3.5 0 016.5 3h7A3.5 3.5 0 0117 6.5v4a3.5 3.5 0 01-3.5 3.5H8l-3.6 2.7c-.6.45-1.4-.02-1.4-.75V6.5z"
      strokeLinejoin="round"
    />
  </S>
);

export const StatusIcon = (p: IconProps) => (
  <S {...p}>
    <circle cx="10" cy="10" r="7.2" />
    <path d="M7 10.2l2.1 2.1L13.4 8" strokeLinecap="round" strokeLinejoin="round" />
  </S>
);

export const PhoneIcon = (p: IconProps) => (
  <S {...p}>
    <path
      d="M4 3.8h2.6l1.2 3.1-1.6 1.3a10.5 10.5 0 004.6 4.6l1.3-1.6 3.1 1.2v2.6c0 .7-.6 1.3-1.3 1.2C8 15.6 4.4 12 3.8 6.1c-.1-.7.5-1.3 1.2-1.3z"
      strokeLinejoin="round"
    />
  </S>
);

export const GroupsIcon = (p: IconProps) => (
  <S {...p}>
    <circle cx="7" cy="7.5" r="2.6" />
    <path d="M2.5 16c.5-2.6 2.3-4 4.5-4s4 1.4 4.5 4M13.5 8.4a2.4 2.4 0 100-4M14.5 12.3c1.7.4 2.8 1.6 3.1 3.7" strokeLinecap="round" />
  </S>
);

export const ContactsIcon = (p: IconProps) => (
  <S {...p}>
    <rect x="3.5" y="2.8" width="13" height="14.4" rx="2.5" />
    <circle cx="10" cy="8" r="2" />
    <path d="M6.8 14.4c.5-1.6 1.7-2.4 3.2-2.4s2.7.8 3.2 2.4" strokeLinecap="round" />
  </S>
);

export const FilesIcon = (p: IconProps) => (
  <S {...p}>
    <path d="M5 2.8h6.2L15.5 7v8.7a1.5 1.5 0 01-1.5 1.5H5a1.5 1.5 0 01-1.5-1.5V4.3A1.5 1.5 0 015 2.8z" strokeLinejoin="round" />
    <path d="M11 3v4.2h4.2" />
  </S>
);

export const StarIcon = (p: IconProps) => (
  <S {...p}>
    <path d="M10 2.8l2.2 4.5 4.9.7-3.6 3.5.9 4.9L10 14.1l-4.4 2.3.9-4.9L2.9 8l4.9-.7L10 2.8z" strokeLinejoin="round" />
  </S>
);

export const ArchiveIcon = (p: IconProps) => (
  <S {...p}>
    <rect x="3" y="3.5" width="14" height="4" rx="1.2" />
    <path d="M4.3 7.5v7.5a1.5 1.5 0 001.5 1.5h8.4a1.5 1.5 0 001.5-1.5V7.5M8.2 10.8h3.6" strokeLinecap="round" />
  </S>
);

export const BellIcon = (p: IconProps) => (
  <S {...p}>
    <path
      d="M10 3a4.6 4.6 0 00-4.6 4.6c0 3.4-1.1 4.6-1.9 5.4h13c-.8-.8-1.9-2-1.9-5.4A4.6 4.6 0 0010 3zM8.3 15.8a1.8 1.8 0 003.4 0"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </S>
);

export const AdminIcon = (p: IconProps) => (
  <S {...p}>
    <path d="M10 2.5l6.5 2.4v4.4c0 4.2-2.8 7-6.5 8.2-3.7-1.2-6.5-4-6.5-8.2V4.9L10 2.5z" strokeLinejoin="round" />
    <path d="M7.4 9.8l1.8 1.8 3.4-3.4" strokeLinecap="round" strokeLinejoin="round" />
  </S>
);

export const ProfileIcon = (p: IconProps) => (
  <S {...p}>
    <circle cx="10" cy="7" r="3" />
    <path d="M4 17c.7-3 3-4.6 6-4.6s5.3 1.6 6 4.6" strokeLinecap="round" />
  </S>
);

export const SearchIcon = (p: IconProps) => (
  <S size={p.size ?? 15} strokeWidth={p.strokeWidth ?? 1.7} {...p}>
    <circle cx="9" cy="9" r="5.5" />
    <path d="M13.2 13.2L17 17" strokeLinecap="round" />
  </S>
);

export const FilterIcon = (p: IconProps) => (
  <S size={p.size ?? 16} strokeWidth={p.strokeWidth ?? 1.7} strokeLinecap="round" {...p}>
    <path d="M3 6h14M6 10h8M8.5 14h3" />
  </S>
);

export const VideoIcon = (p: IconProps) => (
  <S size={p.size ?? 18} strokeWidth={p.strokeWidth ?? 1.7} {...p}>
    <rect x="2.5" y="5" width="10.5" height="10" rx="2.4" />
    <path d="M13 9.2l3.6-2.4c.4-.3 1 0 1 .6v5.2c0 .5-.6.8-1 .6L13 10.8" strokeLinejoin="round" />
  </S>
);

export const DotsVIcon = (p: IconProps) => (
  <svg width={p.size ?? 17} height={p.size ?? 17} viewBox="0 0 20 20" fill="currentColor" {...p}>
    <circle cx="10" cy="4.5" r="1.5" />
    <circle cx="10" cy="10" r="1.5" />
    <circle cx="10" cy="15.5" r="1.5" />
  </svg>
);

export const DotsHIcon = (p: IconProps) => (
  <svg width={p.size ?? 17} height={p.size ?? 17} viewBox="0 0 20 20" fill="currentColor" {...p}>
    <circle cx="4.5" cy="10" r="1.6" />
    <circle cx="10" cy="10" r="1.6" />
    <circle cx="15.5" cy="10" r="1.6" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <S size={p.size ?? 17} strokeWidth={p.strokeWidth ?? 1.8} strokeLinecap="round" {...p}>
    <path d="M5 5l10 10M15 5L5 15" />
  </S>
);

export const SendIcon = (p: IconProps) => (
  <svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 20 20" fill="#fff" {...p}>
    <path
      d="M2.5 10L17 3.2c.6-.3 1.2.3 1 .9L13.6 17c-.2.6-1 .7-1.4.1l-2.7-4.2L4 11.4c-.7-.1-.8-1-.2-1.3z"
      transform="rotate(8 10 10)"
    />
  </svg>
);

export const AttachIcon = (p: IconProps) => (
  <S size={p.size ?? 17} strokeLinecap="round" {...p}>
    <path d="M15.5 9.3l-5.8 5.8a3.8 3.8 0 01-5.4-5.4l6.4-6.4a2.5 2.5 0 013.6 3.6l-6.1 6a1.3 1.3 0 01-1.8-1.8l5.3-5.3" />
  </S>
);

export const EmojiIcon = (p: IconProps) => (
  <S size={p.size ?? 18} strokeWidth={p.strokeWidth ?? 1.5} {...p}>
    <circle cx="10" cy="10" r="7.3" />
    <path d="M7 11.5c.7 1 1.7 1.6 3 1.6s2.3-.6 3-1.6" strokeLinecap="round" />
    <circle cx="7.5" cy="8" r=".9" fill="currentColor" stroke="none" />
    <circle cx="12.5" cy="8" r=".9" fill="currentColor" stroke="none" />
  </S>
);

/** Single tick: the server accepted and persisted the message. Nothing more. */
export const SingleCheckIcon = () => (
  <svg
    width="14"
    height="10"
    viewBox="0 0 16 10"
    fill="none"
    stroke="var(--text3)"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 5.5L6 8.5 11.5 2" />
  </svg>
);

export const DoubleCheckIcon = ({ read }: { read: boolean }) => (
  <svg
    width="14"
    height="10"
    viewBox="0 0 16 10"
    fill="none"
    stroke={read ? "var(--p500)" : "var(--text3)"}
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 5.5L4 8.5 9.5 2M7 6.5L9 8.5 14.5 2" />
  </svg>
);

export const DownloadIcon = (p: IconProps) => (
  <S size={p.size ?? 17} strokeWidth={p.strokeWidth ?? 1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M10 3v9.5M6.5 9.5L10 13l3.5-3.5M4 16.5h12" />
  </S>
);

export const EditIcon = (p: IconProps) => (
  <S size={p.size ?? 14} {...p}>
    <path d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z" strokeLinejoin="round" />
  </S>
);

export const MoonIcon = (p: IconProps) => (
  <S size={p.size ?? 16} {...p}>
    <path d="M16.5 11.5A6.5 6.5 0 018.5 3.5a6.5 6.5 0 108 8z" strokeLinejoin="round" />
  </S>
);

/**
 * Settings cog. Distinct from SunIcon on purpose: the sidebar footer previously
 * drew a sun here (identical circle-and-rays geometry), so in dark mode the
 * Settings link and the theme toggle rendered as the same icon.
 */
export const GearIcon = (p: IconProps) => (
  <S size={p.size ?? 19} {...p}>
    <circle cx="10" cy="10" r="2.4" />
    <path
      d="M16.2 12.5a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5v.2a2 2 0 11-3.9 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1h-.2a2 2 0 110-3.9h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1A2 2 0 116 2.1l.1.1a1.6 1.6 0 001.8.3h.1a1.6 1.6 0 001-1.5v-.2a2 2 0 013.9 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8v.1a1.6 1.6 0 001.5 1h.2a2 2 0 010 3.9h-.1a1.6 1.6 0 00-1.5 1z"
      transform="scale(.86) translate(1.6 1.6)"
    />
  </S>
);

export const SunIcon = (p: IconProps) => (
  <S size={p.size ?? 16} strokeLinecap="round" {...p}>
    <circle cx="10" cy="10" r="2.4" />
    <path d="M10 3v1.6M10 15.4V17M17 10h-1.6M4.6 10H3M14.9 5.1l-1.1 1.1M6.2 13.8l-1.1 1.1M14.9 14.9l-1.1-1.1M6.2 6.2L5.1 5.1" />
  </S>
);

export const PinIcon = (p: IconProps) => (
  <svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 20 20" fill="var(--accent-text)" {...p}>
    <path d="M12.2 2.2l5.6 5.6-1.4 1.4-.7-.7-3.5 3.5.4 2.6-1.4 1.4-3.2-3.2L4 16.8 2.9 15.7 6.9 12 3.7 8.8l1.4-1.4 2.6.4 3.5-3.5-.7-.7 1.7-1.4z" />
  </svg>
);

export const PollBarsIcon = (p: IconProps) => (
  <svg width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 20 20" fill="#fff" {...p}>
    <rect x="3" y="10" width="3.4" height="7" rx="1" />
    <rect x="8.3" y="6" width="3.4" height="11" rx="1" />
    <rect x="13.6" y="3" width="3.4" height="14" rx="1" />
  </svg>
);

export const AddPersonIcon = (p: IconProps) => (
  <S size={p.size ?? 17} strokeWidth={p.strokeWidth ?? 1.7} strokeLinecap="round" {...p}>
    <circle cx="8" cy="7" r="2.6" />
    <path d="M3.5 15.5c.5-2.4 2.2-3.7 4.5-3.7s4 1.3 4.5 3.7M15 6v5M17.5 8.5h-5" />
  </S>
);

export const CameraIcon = (p: IconProps) => (
  <S size={p.size ?? 17} {...p}>
    <path
      d="M3.5 6.8A1.8 1.8 0 015.3 5h1.2l1-1.5h5l1 1.5h1.2a1.8 1.8 0 011.8 1.8v7.4a1.8 1.8 0 01-1.8 1.8H5.3a1.8 1.8 0 01-1.8-1.8V6.8z"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="10.2" r="2.6" />
  </S>
);

export const LockIcon = (p: IconProps) => (
  <S size={p.size ?? 16} {...p}>
    <rect x="4.5" y="8.5" width="11" height="8" rx="1.8" />
    <path d="M7 8.5V6.6a3 3 0 016 0v1.9" />
  </S>
);

export const UploadIcon = (p: IconProps) => (
  <S size={p.size ?? 14} strokeWidth={p.strokeWidth ?? 1.8} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M10 13V4M6.5 7.5L10 4l3.5 3.5M4 16.5h12" />
  </S>
);

export const LeaveIcon = (p: IconProps) => (
  <S size={p.size ?? 15} strokeWidth={p.strokeWidth ?? 1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M8 3H5a1.5 1.5 0 00-1.5 1.5v11A1.5 1.5 0 005 17h3M13 13.5L16.5 10 13 6.5M16 10H8" />
  </S>
);

export const TrashIcon = (p: IconProps) => (
  <S size={p.size ?? 16} strokeLinecap="round" {...p}>
    <path d="M4 5.5h12M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5M6 5.5l.8 10a1.5 1.5 0 001.5 1.4h3.4a1.5 1.5 0 001.5-1.4l.8-10M8.5 9v5M11.5 9v5" />
  </S>
);

export const MuteBellIcon = (p: IconProps) => (
  <S size={p.size ?? 16} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M10 3a4.6 4.6 0 00-4.6 4.6c0 3.4-1.1 4.6-1.9 5.4h13c-.8-.8-1.9-2-1.9-5.4A4.6 4.6 0 0010 3z" />
    <path d="M3 3l14 14" />
  </S>
);

export const ShareIcon = (p: IconProps) => (
  <S size={p.size ?? 16} strokeLinecap="round" {...p}>
    <circle cx="5.5" cy="10" r="2" />
    <circle cx="14.5" cy="5" r="2" />
    <circle cx="14.5" cy="15" r="2" />
    <path d="M7.3 9L12.7 6M7.3 11l5.4 3" />
  </S>
);

export const ChatterLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <path
      d="M3 6.5A3.5 3.5 0 016.5 3h7A3.5 3.5 0 0117 6.5v4a3.5 3.5 0 01-3.5 3.5H8l-3.6 2.7c-.6.45-1.4-.02-1.4-.75V6.5z"
      fill="#fff"
    />
    <circle cx="8" cy="8.6" r="1.1" fill="var(--accent-text)" />
    <circle cx="12" cy="8.6" r="1.1" fill="var(--accent-text)" />
  </svg>
);
