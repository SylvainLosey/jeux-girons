import { Gamepad2, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

export default function GameLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center pt-8">
      <div className="container mx-auto px-4 pb-4 max-w-4xl">
        <div className="mb-6">
          {/* Loading Header */}
          <div className="flex flex-col md:flex-row md:items-start gap-6 mb-6">
            {/* Game Image Placeholder */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 border border-border rounded-lg flex items-center justify-center shadow-sm animate-pulse">
                <Gamepad2 className="h-16 w-16 text-gray-400 animate-pulse" />
              </div>
            </div>
            
            {/* Game Details Placeholder */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-md w-64 mx-auto md:mx-0 animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Schedule Content */}
        <div className="space-y-6">
          {/* Loading Time Slots */}
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="transition-all hover:shadow-md animate-pulse">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400 animate-pulse" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  </div>
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="space-y-1">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="flex items-center justify-between p-2 rounded-md bg-gray-100 dark:bg-gray-800">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400 animate-pulse" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                        </div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
} 