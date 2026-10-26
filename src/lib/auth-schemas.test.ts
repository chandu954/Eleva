import { describe, expect, it } from 'vitest';
import { loginSchema, signupSchema } from './auth-schemas';

describe('loginSchema', () => {
  it('accepts a valid credential pair and trims the email', () => {
    const result = loginSchema.safeParse({ email: '  user@example.com ', password: 'hunter2' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ email: 'user@example.com', password: 'hunter2' });
  });

  it('requires a non-empty email and a valid address', () => {
    const empty = loginSchema.safeParse({ email: '', password: 'x' });
    expect(empty.success).toBe(false);
    if (!empty.success) expect(empty.error.issues[0].message).toBe('Email is required');

    const invalid = loginSchema.safeParse({ email: 'not-an-email', password: 'x' });
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(invalid.error.issues[0].message).toBe('Please enter a valid email address');
  });

  it('requires a non-empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe('Password is required');
  });
});

describe('signupSchema', () => {
  it('accepts a complete signup payload', () => {
    const result = signupSchema.safeParse({
      name: "D'Angelo Mc-Doe",
      email: 'd@example.com',
      password: 'GoodPass1',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("D'Angelo Mc-Doe");
  });

  it('bounds the name to 2..50 chars after trimming and rejects non-letter characters', () => {
    const tooShort = signupSchema.safeParse({ name: ' a ', email: 'a@b.co', password: 'GoodPass1' });
    expect(tooShort.success).toBe(false);
    if (!tooShort.success) expect(tooShort.error.issues[0].message).toBe('Name must be at least 2 characters');

    const tooLong = signupSchema.safeParse({ name: 'x'.repeat(51), email: 'a@b.co', password: 'GoodPass1' });
    expect(tooLong.success).toBe(false);
    if (!tooLong.success) expect(tooLong.error.issues[0].message).toBe('Name must be at most 50 characters');

    const badChars = signupSchema.safeParse({ name: 'Agent 007', email: 'a@b.co', password: 'GoodPass1' });
    expect(badChars.success).toBe(false);
    if (!badChars.success) {
      expect(badChars.error.issues[0].message).toBe("Name can only contain letters, spaces, apostrophes, and hyphens");
    }
  });

  it('enforces the signup password policy: length, uppercase, digit', () => {
    const parse = (password: string) => signupSchema.safeParse({ name: 'Ada Loy', email: 'a@b.co', password });

    const tooShort = parse('Cd1');
    expect(tooShort.success).toBe(false);
    if (!tooShort.success) expect(tooShort.error.issues[0].message).toBe('Password must be at least 6 characters');

    const tooLong = parse(`A1${'x'.repeat(100)}`);
    expect(tooLong.success).toBe(false);
    if (!tooLong.success) expect(tooLong.error.issues[0].message).toBe('Password must be at most 100 characters');

    const noUpper = parse('abcdef1');
    expect(noUpper.success).toBe(false);
    if (!noUpper.success) expect(noUpper.error.issues[0].message).toBe('Password must contain at least one uppercase letter');

    const noDigit = parse('Abcdefg');
    expect(noDigit.success).toBe(false);
    if (!noDigit.success) expect(noDigit.error.issues[0].message).toBe('Password must contain at least one number');
  });
});
