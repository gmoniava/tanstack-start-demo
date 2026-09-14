import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { getCurrentUserFn, logoutFn } from '../serverActions/authActions'

export const Route = createFileRoute('/')({
  loader: () => getCurrentUserFn(),
  component: Home,
})

function Home() {
  const user = Route.useLoaderData()
  const logout = useServerFn(logoutFn)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    setError(null)
    try {
      await logout()
      await router.invalidate()
    } catch {
      setError('Unable to log out. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">Welcome to TanStack Start</h1>
      <p className="mt-4 text-lg">
        {user
          ? `You are signed in as ${user.name} (${user.email}).`
          : 'Log in or create an account to get started.'}
      </p>
      <div className="mt-6 flex gap-4">
        {user ? (
          <button
            onClick={handleLogout}
            disabled={loading}
            className="rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? 'Logging out...' : 'Log out'}
          </button>
        ) : (
          <>
            <Link to="/login" className="underline">
              Log in
            </Link>
            <Link to="/register" className="underline">
              Create an account
            </Link>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-4 text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
