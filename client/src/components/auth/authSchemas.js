import * as z from 'zod';

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^\d{8}$/, { message: 'Enter your 8-digit registration number' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, { message: 'Full name must be at least 3 characters' })
    .max(50, { message: 'Full name cannot exceed 50 characters' })
    .regex(/^[a-zA-Z\s.'-]+$/, { message: 'Full name can only contain letters and spaces' }),
  username: z
    .string()
    .trim()
    .regex(/^\d{8}$/, { message: 'Registration number must be exactly 8 digits' }),
  phone_number: z
    .string()
    .trim()
    .regex(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits' }),
  email: z
    .string()
    .trim()
    .email({ message: 'Must be a valid email' })
    .regex(/@gmail\.com$/i, { message: 'Only @gmail.com emails are allowed' }),
  otp: z
    .string()
    .refine((val) => !val || /^\d{6}$/.test(val), { message: 'OTP must be exactly 6 numeric digits' })
    .optional(),
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
  reg_no: z
    .string()
    .min(1, { message: 'Registration number is required' })
    .regex(/^\d{8}$/, { message: 'Registration number must be exactly 8 digits' }),
  email: z
    .string()
    .min(1, { message: 'Email address is required' })
    .email({ message: 'Must be a valid email address' })
    .regex(/@gmail\.com$/i, { message: 'Only @gmail.com emails are allowed' }),
});

export const forgotPasswordResetOTPSchema = z.object({
  otp: z
    .string()
    .min(1, { message: 'Verification code is required' })
    .regex(/^\d{6}$/, { message: 'OTP must be exactly 6 numeric digits' }),
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

export const resetPasswordSchema = forgotPasswordResetOTPSchema;

