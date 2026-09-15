import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/dashboard')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <section className="p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-3 text-neutral-600">
        This page uses the app sidebar layout.
      </p>
    </section>
  );
}
