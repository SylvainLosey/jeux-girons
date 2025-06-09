"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Gamepad2, CalendarClock, Menu, Settings } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "~/components/ui/navigation-menu";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { useState, createContext, useContext } from "react";

// Create admin context
const AdminContext = createContext<{
  isAdmin: boolean;
  setIsAdmin: (admin: boolean) => void;
}>({
  isAdmin: false,
  setIsAdmin: () => {
    // Default empty implementation
  },
});

export const useAdmin = () => useContext(AdminContext);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  
  return (
    <AdminContext.Provider value={{ isAdmin, setIsAdmin }}>
      {children}
    </AdminContext.Provider>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAdmin, setIsAdmin } = useAdmin();
  
  const navItems = [
    {
      name: "Jeunesses",
      href: "/groups",
      icon: Users,
      active: pathname === "/groups"
    },
    {
      name: "Jeux",
      href: "/games",
      icon: Gamepad2,
      active: pathname === "/games"
    },
    {
      name: "Horaires",
      href: "/schedule",
      icon: CalendarClock,
      active: pathname === "/schedule"
    },
  ];

  // Custom component for navlink compatibility with Next.js Link
  const NavMenuLink = ({ href, active, className, children, ...props }: {
    href: string;
    active: boolean;
    className?: string;
    children: React.ReactNode;
  }) => (
    <Link
      href={href}
      legacyBehavior
      passHref
    >
      <NavigationMenuLink
        active={active}
        className={cn(
          "flex flex-row items-center px-3 py-2 text-sm font-medium transition-colors", 
          active 
            ? "bg-primary/10 text-primary" 
            : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
          "p-0 gap-0", 
          className
        )}
        {...props}
      >
        {children}
      </NavigationMenuLink>
    </Link>
  );

  return (
    <nav className="bg-background border-b mb-6">
      <div className="container mx-auto">
        <div className="flex items-center h-16 justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center px-2 text-xl font-bold">
            Jeux Murist 25
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {isAdmin && (
              <NavigationMenu>
                <NavigationMenuList>
                  {navItems.map((item) => (
                    <NavigationMenuItem key={item.href}>
                      <NavMenuLink href={item.href} active={item.active} className="px-3 py-2">
                        <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                        {item.name}
                      </NavMenuLink>
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            )}
            
            {/* Admin Toggle */}
            <div className="flex items-center space-x-2 ml-4 pl-4 border-l">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="admin-mode" className="text-sm font-medium">
                Admin
              </Label>
              <Switch
                id="admin-mode"
                checked={isAdmin}
                onCheckedChange={setIsAdmin}
              />
            </div>
          </div>
          
          {/* Mobile Navigation Button */}
          <div className="md:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden px-2 pb-3">
            <div className="flex flex-col space-y-1">
              {isAdmin && navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    item.active 
                      ? "bg-primary/10 text-primary" 
                      : "text-foreground/70 hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile Admin Toggle */}
              <div className="flex items-center justify-between px-3 py-2 border-t mt-2 pt-3">
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="admin-mode-mobile" className="text-sm font-medium">
                    Mode Admin
                  </Label>
                </div>
                <Switch
                  id="admin-mode-mobile"
                  checked={isAdmin}
                  onCheckedChange={setIsAdmin}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 