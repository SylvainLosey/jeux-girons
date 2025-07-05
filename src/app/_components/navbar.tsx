"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Users, Gamepad2, CalendarClock, Menu, Settings, Shield, LogOut, Loader2, ArrowRight } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "~/components/ui/navigation-menu";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { useState, createContext, useContext, useEffect } from "react";
import { api } from "~/trpc/react";

// Create admin context
const AdminContext = createContext<{
  isAdmin: boolean;
  setIsAdmin: (admin: boolean) => void;
  logout: () => void;
}>({
  isAdmin: false,
  setIsAdmin: () => {
    // Default empty implementation
  },
  logout: () => {
    // Default empty implementation
  },
});

export const useAdmin = () => useContext(AdminContext);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  
  // Check for existing admin authentication on mount
  useEffect(() => {
    const adminToken = localStorage.getItem("adminToken");
    setToken(adminToken);
  }, []);
  
  // Validate token using tRPC query
  const { data: validation, error } = api.admin.validateToken.useQuery(
    { token: token! },
    { 
      enabled: !!token,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    }
  );
  
  // Update admin state based on validation result
  useEffect(() => {
    if (validation) {
      if (validation.isValid && validation.admin) {
        setIsAdmin(true);
      } else {
        // Clear invalid tokens
        localStorage.removeItem("adminAuthenticated");
        localStorage.removeItem("adminToken");
        setIsAdmin(false);
        setToken(null);
      }
    } else if (error) {
      // Clear invalid tokens on error
      localStorage.removeItem("adminAuthenticated");
      localStorage.removeItem("adminToken");
      setIsAdmin(false);
      setToken(null);
    }
  }, [validation, error]);

  const logout = () => {
    localStorage.removeItem("adminAuthenticated");
    localStorage.removeItem("adminToken");
    setIsAdmin(false);
    setToken(null);
  };
  
  return (
    <AdminContext.Provider value={{ isAdmin, setIsAdmin, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

function useNavigationState() {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Reset navigation state when pathname changes
    setIsNavigating(false);
  }, [pathname]);

  useEffect(() => {
    const handleStart = () => setIsNavigating(true);
    const handleComplete = () => setIsNavigating(false);

    window.addEventListener('navigation-start', handleStart);
    window.addEventListener('navigation-complete', handleComplete);

    return () => {
      window.removeEventListener('navigation-start', handleStart);
      window.removeEventListener('navigation-complete', handleComplete);
    };
  }, []);

  return isNavigating;
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAdmin, logout } = useAdmin();
  const isNavigating = useNavigationState();
  
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
    <NavigationMenuLink
      active={active}
      className={cn(
        "flex flex-row items-center px-3 py-2 text-sm font-medium transition-colors", 
        active 
          ? "bg-oriental-cream/20 text-oriental-cream" 
          : "text-oriental-cream/70 hover:bg-oriental-cream/10 hover:text-oriental-cream",
        "p-0 gap-0", 
        className
      )}
      asChild
      {...props}
    >
      <Link href={href}>
        {children}
      </Link>
    </NavigationMenuLink>
  );

  return (
    <nav className="shadow-sm border-b border-[#0A222C]/20 sticky top-0 z-40" style={{ backgroundColor: '#0A222C' }}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 py-4">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-4">
              <img 
                src="/logo_giron.png" 
                alt="Logo Giron" 
                className="h-16 w-16 object-contain"
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold" style={{ color: '#A08E6D' }}>
                  Jeux de Murist
                </span>
                <span className="text-xs text-oriental-cream/70 -mt-1">
                  2025
                </span>
              </div>
            </Link>
            
            {/* Navigation Loading Indicator */}
            {isNavigating && (
              <div className="ml-6 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-oriental-gold" />
                <span className="text-sm text-oriental-cream/70">
                  Chargement...
                </span>
              </div>
            )}
          </div>
          
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

            {/* External Link to Official Giron Site - Hidden in admin mode */}
            {!isAdmin && (
              <a
                href="https://murist2025.ch/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-oriental-cream/70 hover:text-oriental-cream transition-colors border border-oriental-cream/30 rounded-md hover:border-oriental-cream"
              >
                <span>Site des Girons</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            )}
            
            {/* Admin Status */}
            {isAdmin && (
              <div className="flex items-center space-x-2 ml-4 pl-4 border-l">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-oriental-cream" />
                    <Label className="text-sm font-medium text-oriental-cream">
                      Admin connecté
                    </Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="text-sm text-oriental-cream/70 hover:text-oriental-cream"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Déconnexion
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Mobile Navigation Button */}
          <div className="md:hidden flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              className="text-oriental-cream hover:bg-oriental-cream/10"
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
                      ? "bg-oriental-cream/20 text-oriental-cream" 
                      : "text-oriental-cream/70 hover:bg-oriental-cream/10 hover:text-oriental-cream"
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                  {item.name}
                </Link>
              ))}

              {/* External Link for Mobile - Hidden in admin mode */}
              {!isAdmin && (
                <a
                  href="https://murist2025.ch/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-oriental-cream/70 hover:text-oriental-cream transition-colors border border-oriental-cream/30 hover:border-oriental-cream mt-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>Site des Girons</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              )}
              
              {/* Mobile Admin Status */}
              {isAdmin && (
              <div className="flex items-center justify-between px-3 py-2 border-t mt-2 pt-3">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-oriental-cream" />
                  <Label className="text-sm font-medium text-oriental-cream">
                    Admin connecté
                  </Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-sm text-oriental-cream/70 hover:text-oriental-cream"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Déconnexion
                </Button>
              </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 