import { Outlet, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useMediaQuery } from 'usehooks-ts';
import { Sidebar } from '../../components/Sidebar/Sidebar';

export const Route = createFileRoute('/_app')({ component: AppLayout });

function AppLayout() {
  // true: expanded on desktop, visible on mobile.
  // false: icons only on desktop, hidden on mobile.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)', {
    // The server cannot know the screen width. Start with the same value on
    // server and browser, then check the actual width once React is ready.
    initializeWithValue: false,
  });

  return (
    <div className="flex h-dvh">
      <Sidebar
        isMobile={isMobile}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen((value) => !value)}
      />
      {/* While the mobile menu is open, keep the page visible but inactive.
          inert prevents clicks and Tab focus here, and tells screen readers
          to skip this content until the menu closes. */}
      <div
        inert={isMobile && sidebarOpen}
        className="flex min-w-0 flex-1 flex-col"
      >
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 px-4">
          <button
            type="button"
            aria-controls="app-sidebar"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
            className="rounded border border-neutral-300 px-3 py-1 md:hidden"
          >
            Open menu
          </button>
          <span className="font-semibold">My App</span>
        </header>
        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
        <footer className="shrink-0 border-t border-neutral-200 px-4 py-2 text-sm text-neutral-500">
          © 2026 My App. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
