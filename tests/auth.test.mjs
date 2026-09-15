import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hashPassword,
  verifyPassword,
  DUMMY_PASSWORD_HASH,
} from '../src/utils/password.server.ts';
import { registrationSchema, loginSchema } from '../src/utils/auth-schema.ts';

test('passwords are salted, hashed and verified without accepting wrong passwords', async () => {
  const password = 'a long test password';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.ok(!first.includes(password));
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
  assert.equal(await verifyPassword(password, DUMMY_PASSWORD_HASH), false);
  assert.equal(await verifyPassword(password, 'malformed'), false);
});

test('registration normalizes identity, rejects invalid input, and ignores supplied roles', () => {
  const input = {
    name: '  Test User  ',
    email: ' Test@Example.com ',
    password: 'test-password',
    role: 'admin',
  };
  assert.deepEqual(registrationSchema.parse(input), {
    name: 'Test User',
    email: 'test@example.com',
    password: 'test-password',
  });
  for (const changes of [
    { name: ' ' },
    { email: 'invalid' },
    { password: 'short' },
    { password: 'x'.repeat(129) },
  ]) {
    assert.equal(
      registrationSchema.safeParse({ ...input, ...changes }).success,
      false,
    );
  }
  assert.equal(loginSchema.parse(input).email, 'test@example.com');
});
