"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Gamepad2, CalendarClock, ClipboardList } from "lucide-react";
import { cn } from "~/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  
  const navItems = [
    {
      name: "Jeunesses Admin",
      href: "/",
      icon: Users,
      active: pathname === "/"
    },
    {
      name: "Jeux Admin",
      href: "/games",
      icon: Gamepad2,
      active: pathname === "/games"
    },
    {
      name: "Horaires Admin",
      href: "/schedule",
      icon: CalendarClock,
      active: pathname === "/schedule"
    },
    {
      name: "Planning",
      href: "/planning",
      icon: ClipboardList,
      active: pathname === "/planning"
    },
  ];

  return (
    <nav className="bg-background border-b mb-6">
      <div className="container mx-auto">
        <div className="flex items-center h-16">
          <div className="flex space-x-4">
            <Link href="/" className="flex items-center px-2 text-xl font-bold">
              Jeux-Girons
            </Link>
            
            <div className="hidden md:flex md:items-center md:space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    item.active 
                      ? "bg-primary/10 text-primary" 
                      : "text-foreground/70 hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 