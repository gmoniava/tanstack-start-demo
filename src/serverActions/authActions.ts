import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { setResponseHeader } from '@tanstack/react-start/server'
import { useAppSession, getSessionUser } from '../utils/session'
import { loginSchema, registrationSchema } from '../utils/auth-schema'
import {
  allowAuthAttempt,
  createUser,
  findUserByEmail,
} from '../utils/users.server'
import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  verifyPassword,
} from '../utils/password.server'

export const loginFn = createServerFn({ method: 'POST' })
  .validator(loginSchema)
  .handler(async ({ data }) => {
    setResponseHeader('Cache-Control', 'no-store')
    if (!(await allowAuthAttempt(data.email)))
      return { error: 'Too many attempts. Try again in 15 minutes.' }
    const user = await findUserByEmail(data.email)
    const valid = await verifyPassword(
      data.password,
      user?.password_hash ?? DUMMY_PASSWORD_HASH,
    )
    if (!user || !valid) return { error: 'Invalid email or password' }
    const session = await useAppSession()
    await session.clear()
    await session.update({ userId: user.id })
    return { success: true }
  })

export const registerFn = createServerFn({ method: 'POST' })
  .validator(registrationSchema)
  .handler(async ({ data }) => {
    setResponseHeader('Cache-Control', 'no-store')
    const session = await useAppSession()
    if (!(await allowAuthAttempt(data.email)))
      return { error: 'Too many attempts. Try again in 15 minutes.' }
    const user = await createUser({
      name: data.name,
      email: data.email,
      passwordHash: await hashPassword(data.password),
    })
    if (!user)
      return {
        error: 'An account with this email already exists. Please log in.',
      }
    await session.clear()
    await session.update({ userId: user.id })
    return { success: true }
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useAppSession()
  await session.clear()
  throw redirect({ to: '/login' })
})

export const getCurrentUserFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    setResponseHeader('Cache-Control', 'no-store')
    return getSessionUser()
  },
)
