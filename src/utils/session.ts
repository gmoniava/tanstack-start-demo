import { useSession } from '@tanstack/react-start/server';
import { findUserById } from './users.server';

type SessionData = { userId?: string };

export function useAppSession() {
  const password = process.env.SESSION_SECRET;
  if (
    !password ||
    password.length < 32 ||
    password.startsWith('replace-with-')
  ) {
    throw new Error(
      'Set SESSION_SECRET to a random secret of at least 32 characters',
    );
  }
  return useSession<SessionData>({
    name: 'app-session',
    password,
    maxAge: 7 * 24 * 60 * 60,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    },
  });
}

export async function getSessionUser() {
  const session = await useAppSession();
  if (!session.data.userId) return null;

  // Older sessions may still contain IDs from
  // the previous in-memory user store.
  // Current database users use UUIDs, so if the stored ID
  // is not a UUID, treat the session as stale and clear it,
  // which logs the user out.
  if (
    !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(session.data.userId)
  ) {
    await session.clear();
    return null;
  }
  const user = await findUserById(session.data.userId);
  if (!user) await session.clear();
  return user;
}
