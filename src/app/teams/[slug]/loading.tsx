import { Users, Clock, Gamepad2 } from "lucide-react";
import { Card } from "~/components/ui/card";

export default function TeamLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center pt-8">
      <div className="container mx-auto px-4 pb-4 max-w-4xl">
        <div className="mb-6">
          {/* Loading Header */}
          <div className="flex items-center mb-2">
            <Users className="mr-3 h-8 w-8 text-oriental-accent animate-pulse" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-md w-48 animate-pulse"></div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-md w-32 animate-pulse"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
              {/* Loading Schedule Cards */}
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden !p-0 h-32 animate-pulse">
                  <div className="flex h-full">
                    {/* Game Image Placeholder */}
                    <div className="flex-shrink-0 w-32 h-32 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Gamepad2 className="h-12 w-12 text-gray-400 animate-pulse" />
                    </div>
                    
                    {/* Content Placeholder */}
                    <div className="flex-1 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-gray-400 animate-pulse" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                        </div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                      </div>
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 