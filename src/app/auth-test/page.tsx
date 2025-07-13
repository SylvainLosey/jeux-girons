"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "~/app/_components/navbar";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function AuthTestPage() {
  const { isAdmin, isLoading } = useAdmin();
  const [isHydrated, setIsHydrated] = useState(false);
  const [tokenExists, setTokenExists] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    const token = localStorage.getItem("adminToken");
    setTokenExists(!!token);
  }, []);

  const clearToken = () => {
    localStorage.removeItem("adminToken");
    setTokenExists(false);
    window.location.reload();
  };

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Is Hydrated:</strong> {isHydrated ? "Yes" : "No"}
            </div>
            <div>
              <strong>Is Loading:</strong> {isLoading ? "Yes" : "No"}
            </div>
            <div>
              <strong>Is Admin:</strong> {isAdmin ? "Yes" : "No"}
            </div>
            <div>
              <strong>Token Exists:</strong> {tokenExists ? "Yes" : "No"}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => window.location.href = "/admin"}>
              Go to Admin Login
            </Button>
            <Button onClick={() => window.location.href = "/admin/creneaux"}>
              Go to Admin Creneaux
            </Button>
            <Button onClick={clearToken} variant="destructive">
              Clear Token
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 