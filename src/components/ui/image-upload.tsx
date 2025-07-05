"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onError?: (error: string) => void;
  className?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function ImageUpload({
  value = "",
  onChange,
  onError,
  className,
  label = "Image",
  placeholder = "ou entrez une URL d'image",
  disabled = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    
    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);

      // Upload file
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        onChange(result.imageUrl);
        setPreview(result.imageUrl);
      } else {
        // Handle fallback case (Blob Storage not configured)
        if (result.fallback) {
          onError?.(result.error + " L'upload de fichier n'est pas disponible en développement local.");
        } else {
          onError?.(result.error ?? "Failed to upload image");
        }
        setPreview(value);
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Failed to upload image");
      setPreview(value);
    } finally {
      setIsUploading(false);
    }
  }, [onChange, onError, value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    onChange(url);
    setPreview(url);
  };

  const clearImage = () => {
    onChange("");
    setPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Label>{label}</Label>
      
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          "border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-colors",
          "hover:border-gray-400 focus-within:border-blue-500",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-h-40 max-w-full mx-auto rounded-lg"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2"
              onClick={clearImage}
              disabled={disabled || isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <ImageIcon className="h-8 w-8 mx-auto text-gray-400" />
            <div className="text-sm text-gray-600">
              <p>Glissez une image ici ou cliquez pour sélectionner</p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF, WebP jusqu&apos;à 4MB
              </p>
              <p className="text-xs text-blue-600 mt-1">
                💡 En développement local : utilisez le champ URL ci-dessous
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="flex-1"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Upload en cours...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Sélectionner une image
            </>
          )}
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || isUploading}
        />
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-600">
          {placeholder}
        </Label>
        <Input
          type="url"
          value={value}
          onChange={handleUrlChange}
          placeholder="https://example.com/image.jpg"
          disabled={disabled || isUploading}
        />
      </div>
    </div>
  );
}