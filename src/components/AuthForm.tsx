import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { loginFn, registerFn } from '../serverActions/authActions'
import { loginSchema, registrationSchema } from '../utils/auth-schema'

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const registering = mode === 'register'
  const navigate = useNavigate()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setError(null)
    const input = { name, email, password }
    const validation = (
      registering ? registrationSchema : loginSchema
    ).safeParse(input)
    if (!validation.success) {
      setError(validation.error.issues[0].message)
      return
    }
    setLoading(true)
    try {
      const result = registering
        ? await registerFn({ data: input })
        : await loginFn({ data: { email, password } })
      if (result.error) {
        setError(result.error)
        return
      }
      await router.invalidate()
      // After login, replace the form's history entry with the dashboard so
      // Back skips the login form. Registration keeps its existing history behavior.
      await navigate({ to: registering ? '/' : '/dashboard', replace: !registering })
    } catch {
      setError('Unable to complete your request. Please try again shortly.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10'

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900">
            {registering ? 'Create an account' : 'Log in'}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {registering
              ? 'Enter your details to get started.'
              : 'Enter your credentials to continue.'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
          {registering && (
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-neutral-700"
              >
                Full name
              </label>
              <input
                id="name"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={100}
                className={inputClass}
                placeholder="Your name"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={registering ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={registering ? 8 : 1}
              maxLength={128}
              aria-describedby={registering ? 'password-help' : undefined}
              className={inputClass}
            />
            {registering && (
              <p id="password-help" className="text-xs text-neutral-500">
                Use 8–128 characters.
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? registering
                ? 'Creating account...'
                : 'Logging in...'
              : registering
                ? 'Create account'
                : 'Log in'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-neutral-600">
          {registering ? 'Already have an account? ' : 'New here? '}
          <Link
            to={registering ? '/login' : '/register'}
            className="font-medium text-neutral-900 underline"
          >
            {registering ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </main>
  )
}
