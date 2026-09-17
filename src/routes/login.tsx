import { createFileRoute, redirect } from '@tanstack/react-router';
import { AuthForm } from '../components/AuthForm';
import { getCurrentUserFn } from '../serverActions/authActions';

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    // Check the session before showing the form. Signed-in users can go
    // straight to the dashboard without seeing the login page first.
    if (await getCurrentUserFn()) {
      // Replace the current history entry instead of adding a dashboard entry.
      // Back should not return the signed-in user to this login page.
      throw redirect({ to: '/dashboard', replace: true });
    }
  },
  component: () => <AuthForm mode="login" />,
});
