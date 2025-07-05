import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { env } from "~/env";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";

// JWT payload interface
interface JWTPayload {
  admin: boolean;
  iat: number;
  exp: number; // This will be set automatically by jwt.sign()
}

// Rate limiting store (in production, use Redis or similar)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function getClientIP(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0] ?? 
         headers.get("x-real-ip") ?? 
         headers.get("cf-connecting-ip") ?? 
         "unknown";
}

function isRateLimited(ip: string): boolean {
  const attempts = loginAttempts.get(ip);
  if (!attempts) return false;
  
  const now = Date.now();
  if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
    loginAttempts.delete(ip);
    return false;
  }
  
  return attempts.count >= MAX_LOGIN_ATTEMPTS;
}

function recordFailedAttempt(ip: string): void {
  const attempts = loginAttempts.get(ip) ?? { count: 0, lastAttempt: 0 };
  attempts.count++;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(ip, attempts);
}

function clearFailedAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

export const adminRouter = createTRPCRouter({
  /**
   * Authenticate admin with password and return JWT token
   */
  authenticate: publicProcedure
    .input(z.object({
      password: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const clientIP = getClientIP(ctx.headers);
      
      // Check rate limiting
      if (isRateLimited(clientIP)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many failed login attempts. Please try again later.",
        });
      }

             // Simple password comparison for event website
      const isValid = input.password === env.ADMIN_PASSWORD;
      
      if (!isValid) {
        recordFailedAttempt(clientIP);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid password",
        });
      }

      // Clear failed attempts on successful login
      clearFailedAttempts(clientIP);

      // Generate JWT token
      const token = jwt.sign(
        { 
          admin: true, 
          iat: Math.floor(Date.now() / 1000) // JWT standard uses seconds, not milliseconds
        },
        env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      return { 
        success: true, 
        token,
        expiresIn: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
      };
    }),

  /**
   * Validate JWT token
   */
  validateToken: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const decoded = jwt.verify(input.token, env.JWT_SECRET) as JWTPayload;
        return { 
          isValid: true, 
          admin: decoded.admin === true,
          expiresIn: (decoded.exp * 1000) - Date.now() // Convert JWT seconds to milliseconds
        };
      } catch (error) {
        return { 
          isValid: false, 
          admin: false,
          expiresIn: 0
        };
      }
    }),

  /**
   * Logout (invalidate token on client side)
   */
  logout: publicProcedure
    .mutation(async () => {
      // In a more complex setup, you'd maintain a blacklist of tokens
      // For now, we rely on client-side token removal
      return { success: true };
    }),
}); 