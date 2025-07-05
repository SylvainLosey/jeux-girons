import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { env } from "~/env";

// Rate limiting for file uploads
const uploadAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_UPLOAD_ATTEMPTS = 10;
const UPLOAD_WINDOW = 60 * 1000; // 1 minute

function getClientIP(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0] ?? 
         request.headers.get("x-real-ip") ?? 
         request.headers.get("cf-connecting-ip") ?? 
         "unknown";
}

function isUploadRateLimited(ip: string): boolean {
  const attempts = uploadAttempts.get(ip);
  if (!attempts) return false;
  
  const now = Date.now();
  if (now - attempts.lastAttempt > UPLOAD_WINDOW) {
    uploadAttempts.delete(ip);
    return false;
  }
  
  return attempts.count >= MAX_UPLOAD_ATTEMPTS;
}

function recordUploadAttempt(ip: string): void {
  const attempts = uploadAttempts.get(ip) ?? { count: 0, lastAttempt: 0 };
  attempts.count++;
  attempts.lastAttempt = Date.now();
  uploadAttempts.set(ip, attempts);
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    
    if (!token) {
      return NextResponse.json({
        error: "Authentication required for file uploads"
      }, { status: 401 });
    }

    // Validate JWT token
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { admin: boolean };
      if (!decoded.admin) {
        return NextResponse.json({
          error: "Admin access required for file uploads"
        }, { status: 403 });
      }
    } catch (error) {
      return NextResponse.json({
        error: "Invalid authentication token"
      }, { status: 401 });
    }

    // Skip CSRF validation for now (same as tRPC mutations)
    // The JWT authentication and rate limiting provide sufficient security for an event website
    // TODO: Implement proper CSRF protection if needed for production

    // Rate limiting
    const clientIP = getClientIP(request);
    if (isUploadRateLimited(clientIP)) {
      return NextResponse.json({
        error: "Too many upload attempts. Please try again later."
      }, { status: 429 });
    }
    recordUploadAttempt(clientIP);

    // Image upload is not configured - always fallback to URL input
    return NextResponse.json({
      error: "Image upload not configured. Please use the URL field to add images from external sources.",
      fallback: true
    }, { status: 400 });

  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload image. Please try using the URL field instead." },
      { status: 500 }
    );
  }
} 