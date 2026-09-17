import { useRouter } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { logoutFn } from '../../serverActions/authActions';

export function LogoutButton({
  compact,
  className,
}: {
  compact: boolean;
  className: string;
}) {
  const logout = useServerFn(logoutFn);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    try {
      // The server clears the session and redirects to login. useServerFn
      // handles that redirect; invalidate refreshes any cached session data.
      await logout();
      await router.invalidate();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  const label = pending ? 'Logging out…' : 'Log out';
  return (
    <>
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        aria-label={label}
        aria-busy={pending}
        title={compact ? label : undefined}
        className={`
          ${className} w-full cursor-pointer text-sm whitespace-nowrap
          disabled:cursor-wait disabled:opacity-50
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
          <path d="M9 3H3v18h6 M9 12h12 m-5-5 5 5-5 5" />
        </svg>
        {!compact && label}
      </button>
      {failed && (
        <p role="alert" className="px-1 pt-2 text-xs text-red-300">
          {compact ? 'Failed. Retry.' : 'Unable to log out. Please try again.'}
        </p>
      )}
    </>
  );
}
