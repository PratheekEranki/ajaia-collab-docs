// Account rules shared by sign-up, admin "create account" and tests (ADR-0008).
import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(200);
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(200, "Password must be 200 characters or fewer.");
export const nameSchema = z.string().trim().min(1, "Enter a name.").max(100, "Name must be 100 characters or fewer.");

export const signupSchema = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema });
export const adminCreateSchema = signupSchema.extend({ isAdmin: z.boolean().optional() });
export const signinSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.").max(200) });

export const BCRYPT_ROUNDS = 10;
