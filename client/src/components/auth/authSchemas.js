import * as z from 'zod';

export const loginSchema = z.object({
  username: z.string().regex(/^\d{8}$/, { message: 'Enter your 8-digit registration number' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const registerSchema = z.object({
  full_name: z.string().min(3, { message: 'Name must be at least 3 characters' }).max(50, { message: 'Name cannot exceed 50 characters' }),
  username: z.string().regex(/^\d{8}$/, { message: 'Registration number must be exactly 8 digits' }),
  phone_number: z.string().regex(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits' }),
  email: z.string().email({ message: 'Must be a valid email' }).regex(/@gmail\.com$/i, { message: 'Only @gmail.com emails are allowed' }),
  otp: z.string().optional(),
  password: z.string({ message: 'Password is required' })
    .min(8, { message: 'Must be at least 8 characters' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Must contain at least one special character' }),
  password_confirm: z.string({ message: 'Please confirm your password' })
    .min(1, { message: 'Please confirm your password' }),
}).refine((data) => {
  return data.password === data.password_confirm;
}, {
  message: "Passwords don't match",
  path: ["password_confirm"],
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email address is required' })
    .email({ message: 'Must be a valid email address' })
    .regex(/@gmail\.com$/i, { message: 'Only @gmail.com emails are allowed' }),
});

export const resetPasswordSchema = z.object({
  password: z
    .string({ message: 'Password is required' })
    .min(8, { message: 'Must be at least 8 characters' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Must contain at least one special character' }),
  password_confirm: z
    .string({ message: 'Please confirm your password' })
    .min(1, { message: 'Please confirm your password' }),
}).refine((data) => {
  return data.password === data.password_confirm;
}, {
  message: "Passwords don't match",
  path: ["password_confirm"],
});
