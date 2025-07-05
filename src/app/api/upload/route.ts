import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
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

    // Validate file size (4MB limit for Vercel)
    const maxSize = 4 * 1024 * 1024; // 4MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 4MB." },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop() ?? "jpg";
    const fileName = `games/${uuidv4()}.${fileExtension}`;
    
    // Upload to Vercel Blob Storage
    const blob = await put(fileName, file, {
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