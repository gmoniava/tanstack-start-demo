import { Link } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import type { LinkProps } from '@tanstack/react-router';
import { LogoutButton } from './LogoutButton';

const iconPaths = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  home: 'm3 10 9-7 9 7 M5 9v12h5v-7h4v7h5V9',
  login: 'M14 3h7v18h-7 M3 12h12 m-5-5 5 5-5 5',
  register:
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-2a7 7 0 0 1 14 0v2 M20 7v6 m-3-3h6',
};

type MenuLink = {
  id: string;
  label: string;
  icon: keyof typeof iconPaths;
  to: LinkProps['to'];
  children?: never;
};
// Each item is a link or a group. A group's children can include more groups.
export type SidebarItem =
  | MenuLink
  | {
      id: string;
      label: string;
      children: ReadonlyArray<SidebarItem>;
    };

export const mockMenuItems: ReadonlyArray<SidebarItem> = [
  { id: 'dashboard', label: 'Home', icon: 'dashboard', to: '/dashboard' },
  {
    id: 'account',
    label: 'Account',
    children: [
      { id: 'login', label: 'Log in', icon: 'login', to: '/login' },
      {
        id: 'register',
        label: 'Create account',
        icon: 'register',
        to: '/register',
      },
    ],
  },
];

// Desktop and mobile use the same colors, spacing, and scroll behavior.
const panelClasses = `
  h-dvh flex-col overflow-hidden bg-neutral-950 p-2 text-neutral-200
`;
const actionClasses = `
  flex items-center gap-3 rounded-md p-3
  hover:bg-neutral-800 hover:text-white
  focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white
`;

type SidebarProps = {
  isMobile: boolean;
  open: boolean;
  onClose: () => void;
  onToggle: () => void;
  items?: ReadonlyArray<SidebarItem>;
};

export function Sidebar({
  isMobile,
  open,
  onClose,
  onToggle,
  items = mockMenuItems,
}: SidebarProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const compact = !isMobile && !open;

  useEffect(() => {
    if (!isMobile || !open) return;
    // Remember which element had keyboard focus, usually the "Open menu" button.
    // Also save the body's scroll setting so we can put both back on close.
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    // Prevent the body from scrolling behind the menu. Focus the sidebar so
    // pressing Tab moves through its controls and Escape can close it.
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      // When the menu closes, restore scrolling and focus the previous element.
      // React also runs this when switching to desktop or leaving this layout.
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isMobile, open]);

  // For a group, call this function again for each child until we reach links.
  // In the narrow desktop sidebar, show only icons. aria-label names each link
  // for screen readers; title shows its name when the pointer hovers over it.
  function renderItem(item: SidebarItem) {
    return (
      <li key={item.id}>
        {item.children ? (
          <>
            {!compact && (
              <p className="p-3 text-xs text-neutral-400">{item.label}</p>
            )}
            <ul
              aria-label={item.label}
              className={`
              space-y-1 border-neutral-700
              ${compact ? 'mt-1 border-t pt-1' : 'ml-3 border-l pl-2'}
            `}
            >
              {item.children.map(renderItem)}
            </ul>
          </>
        ) : (
          <Link
            to={item.to}
            aria-label={item.label}
            title={compact ? item.label : undefined}
            onClick={isMobile ? onClose : undefined}
            activeOptions={{ exact: true }}
            activeProps={{ className: 'bg-neutral-800 text-white' }}
            className={`${actionClasses} text-sm whitespace-nowrap`}
          >
            <svg
              className="size-6 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={iconPaths[item.icon]} />
            </svg>
            {!compact && item.label}
          </Link>
        )}
      </li>
    );
  }

  // Build the menu once, then place it in the desktop sidebar or mobile overlay.
  const menu = (
    <>
      <div className="mb-4 flex h-12 shrink-0 items-center gap-2 font-semibold">
        <button
          type="button"
          onClick={isMobile ? onClose : onToggle}
          aria-label={
            isMobile
              ? 'Close menu'
              : compact
                ? 'Expand sidebar'
                : 'Collapse sidebar'
          }
          aria-expanded={open}
          aria-controls="sidebar-navigation"
          className={`${actionClasses} shrink-0 cursor-pointer`}
        >
          <span
            aria-hidden="true"
            className="size-6 text-center text-2xl leading-6"
          >
            {isMobile ? '×' : compact ? '›' : '‹'}
          </span>
        </button>
        <h2
          id="sidebar-title"
          className={compact ? 'sr-only' : 'whitespace-nowrap'}
        >
          Menu
        </h2>
      </div>
      {/* Only the menu scrolls, so logout stays visible at the bottom. */}
      <nav
        id="sidebar-navigation"
        aria-label="Main navigation"
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
      >
        <ul className="space-y-1">{items.map(renderItem)}</ul>
      </nav>
      <div className="mt-2 shrink-0 border-t border-neutral-700 pt-2">
        <LogoutButton compact={compact} className={actionClasses} />
      </div>
    </>
  );

  if (!isMobile) {
    // On desktop, closing shrinks the sidebar to 64px so its icons stay visible.
    // Opening widens it to 240px. The page beside it gets the remaining space.
    return (
      <aside
        id="app-sidebar"
        aria-label="Sidebar"
        className={`
        ${panelClasses} hidden shrink-0 md:flex
        transition-[width] duration-250 ease-[ease] motion-reduce:transition-none
        ${compact ? 'w-16' : 'w-60'}
      `}
      >
        {menu}
      </aside>
    );
  }

  // On mobile, closing slides the sidebar off the left edge of the screen.
  // Leave it in the HTML so CSS can finish that movement; removing it with
  // {open && ...} would make it vanish immediately. While closed, inert stops
  // users from tabbing to its hidden links, and clicks pass through to the page.
  return (
    <div
      inert={!open}
      aria-hidden={!open}
      className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      {/* This button is the dark background behind the sidebar. Clicking it
          closes the menu. It fades out when closed and no longer blocks clicks. */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={`
          absolute inset-0 bg-black/50 transition-opacity duration-250
          motion-reduce:transition-none ${open ? 'opacity-100' : 'opacity-0'}
        `}
      />
      {/* translate-x-0 shows the sidebar; -translate-x-full moves it fully off-screen.
          Skip the animation if the user has requested reduced motion.
          tabIndex={-1} lets focus() select this div without adding a Tab stop. */}
      <div
        ref={panelRef}
        id="app-sidebar"
        role="region"
        aria-labelledby="sidebar-title"
        tabIndex={-1}
        className={`
          ${panelClasses} relative flex w-[min(280px,85vw)]
          transition-transform duration-250 ease-[ease] motion-reduce:transition-none
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {menu}
      </div>
    </div>
  );
}
