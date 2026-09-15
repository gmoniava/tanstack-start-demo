import { Link } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import type { LinkProps } from '@tanstack/react-router';

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
export type SidebarItem =
  | MenuLink
  | {
      id: string;
      label: string;
      children: ReadonlyArray<MenuLink>;
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const compact = !isMobile && !open;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isMobile || !open || !dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, open]);

  function renderLink(item: MenuLink) {
    return (
      <Link
        to={item.to}
        onClick={isMobile ? onClose : undefined}
        title={compact ? item.label : undefined}
        aria-label={item.label}
        activeOptions={{ exact: true }}
        activeProps={{ className: 'bg-neutral-800 text-white' }}
        className={`
          flex min-h-11 items-center gap-3 rounded-md p-3 text-sm
          hover:bg-neutral-800 hover:text-white
          focus-visible:outline-2 focus-visible:-outline-offset-2
          focus-visible:outline-white
        `}
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
        <span className={compact ? 'hidden' : 'whitespace-nowrap'}>
          {item.label}
        </span>
      </Link>
    );
  }

  const menu = (
    <>
      <div className="mb-4 flex h-12 items-center gap-2 font-semibold">
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
          className={`
            flex min-h-11 shrink-0 cursor-pointer items-center rounded-md p-3
            hover:bg-neutral-800 hover:text-white
            focus-visible:outline-2 focus-visible:-outline-offset-2
            focus-visible:outline-white
          `}
        >
          <svg
            className="size-6 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path
              d={
                isMobile
                  ? 'm6 6 12 12 M6 18 18 6'
                  : compact
                    ? 'm9 5 7 7-7 7'
                    : 'm15 5-7 7 7 7'
              }
            />
          </svg>
        </button>
        <h2
          id="sidebar-title"
          className={compact ? 'hidden' : 'whitespace-nowrap'}
        >
          Menu
        </h2>
      </div>
      <nav id="sidebar-navigation" aria-label="Main navigation">
        <ul className="flex list-none flex-col gap-1">
          {items.map((item) => (
            <li key={item.id}>
              {item.children ? (
                <>
                  <p
                    className={
                      compact ? 'hidden' : 'p-3 text-xs text-neutral-400'
                    }
                  >
                    {item.label}
                  </p>
                  <ul
                    className={`
                      flex list-none flex-col gap-1 border-neutral-700
                      ${compact ? 'mt-1 border-t pt-1' : 'ml-3 border-l pl-2'}
                    `}
                    aria-label={item.label}
                  >
                    {item.children.map((child) => (
                      <li key={child.id}>{renderLink(child)}</li>
                    ))}
                  </ul>
                </>
              ) : (
                renderLink(item)
              )}
            </li>
          ))}
        </ul>
      </nav>
    </>
  );

  if (!isMobile) {
    return (
      <aside
        id="app-sidebar"
        aria-label="Sidebar"
        className={`
          hidden h-dvh shrink-0 overflow-x-hidden overflow-y-auto md:block
          bg-neutral-950 p-2 text-neutral-200
          transition-[width] duration-250 ease-[ease]
          motion-reduce:transition-none
          ${compact ? 'w-16' : 'w-60'}
        `}
      >
        {menu}
      </aside>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      id="app-sidebar"
      aria-labelledby="sidebar-title"
      className={`
        fixed inset-y-0 right-auto left-0 m-0
        h-dvh max-h-none w-[min(280px,85vw)] max-w-none
        overflow-x-hidden overflow-y-auto
        border-0 bg-neutral-950 p-2 text-neutral-200
        -translate-x-full open:translate-x-0
        transition-[translate,display,overlay]
        transition-discrete duration-250 ease-[ease]
        backdrop:bg-black/50 backdrop:opacity-0 open:backdrop:opacity-100
        backdrop:transition-[opacity,display,overlay]
        backdrop:transition-discrete backdrop:duration-250 backdrop:ease-[ease]
        motion-reduce:transition-none motion-reduce:backdrop:transition-none
        starting:open:-translate-x-full starting:open:backdrop:opacity-0
      `}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      {menu}
    </dialog>
  );
}
