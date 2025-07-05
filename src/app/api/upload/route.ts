import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";
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
    const JWT_SECRET = env.ADMIN_PASSWORD + "_jwt_secret";
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { admin: boolean };
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

    // Check if Vercel Blob Storage is configured
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    
    if (!blobToken) {
      return NextResponse.json({
        error: "Image upload not configured. Please use the URL field to add images from external sources.",
        fallback: true
      }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (2MB limit for security)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB." },
        { status: 400 }
      );
    }

    // Validate file signature (magic bytes)
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    const isValidImage = () => {
      // JPEG: FF D8 FF
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true;
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
      // GIF: 47 49 46 38 (GIF8)
      if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;
      // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF...WEBP)
      if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
          bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true;
      return false;
    };

    if (!isValidImage()) {
      return NextResponse.json(
        { error: "Invalid file format. File does not match its declared type." },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop() ?? "jpg";
    const fileName = `games/${uuidv4()}.${fileExtension}`;
    
    // Upload to Vercel Blob Storage
    const blob = await put(fileName, buffer, {
      access: "public",
      token: blobToken,
    });

    // Return the public URL
    return NextResponse.json({ 
      success: true, 
      imageUrl: blob.url,
      message: "Image uploaded successfully" 
    });

  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload image. Please try using the URL field instead." },
      { status: 500 }
    );
  }
} 