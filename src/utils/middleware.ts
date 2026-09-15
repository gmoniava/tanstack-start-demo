import { createMiddleware } from '@tanstack/react-start';
import { getSessionUser } from './session';

export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const user = await getSessionUser();
    if (!user) throw new Error('Unauthorized');
    return next({ context: { userId: user.id, role: user.role } });
  },
);
