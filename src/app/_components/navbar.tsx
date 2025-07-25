"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Users, Gamepad2, CalendarClock, Menu, Settings, Shield, LogOut, Loader2, ArrowRight, ClipboardList } from "lucide-react";
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
  isLoading: boolean;
}>({
  isAdmin: false,
  setIsAdmin: () => {
    // Default empty implementation
  },
  logout: () => {
    // Default empty implementation
  },
  isLoading: true,
});

export const useAdmin = () => useContext(AdminContext);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenChecked, setTokenChecked] = useState(false);
  
  // Check for existing admin authentication on mount
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;
    
    const adminToken = localStorage.getItem("adminToken");
    
    if (adminToken) {
      setToken(adminToken);
      // Don't set isLoading to false yet - wait for validation
    } else {
      setIsLoading(false);
      setTokenChecked(true);
    }
  }, []);
  
  // Validate token using tRPC query
  const { data: validation, error, isLoading: isValidating } = api.admin.validateToken.useQuery(
    { token: token! },
    { 
      enabled: !!token && !tokenChecked && typeof window !== "undefined",
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    }
  );
  
  // Update admin state based on validation result
  useEffect(() => {
    if (token && !isValidating && !tokenChecked) {
      if (validation && validation.isValid && validation.admin) {
        setIsAdmin(true);
        setIsLoading(false);
        setTokenChecked(true);
      } else if (error || (validation && !validation.isValid)) {
        // Clear invalid tokens
        if (typeof window !== "undefined") {
          localStorage.removeItem("adminToken");
        }
        setIsAdmin(false);
        setToken(null);
        setIsLoading(false);
        setTokenChecked(true);
      }
    } else if (!token && !tokenChecked) {
      setIsLoading(false);
      setTokenChecked(true);
    }
  }, [validation, error, token, isValidating, tokenChecked]);

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("adminToken");
    }
    setIsAdmin(false);
    setToken(null);
    setTokenChecked(false);
    setIsLoading(false);
  };

  // Update setIsAdmin to also handle token setting
  const updateIsAdmin = (admin: boolean) => {
    setIsAdmin(admin);
    if (admin) {
      setTokenChecked(true);
    }
  };
  
  return (
    <AdminContext.Provider value={{ isAdmin, setIsAdmin: updateIsAdmin, logout, isLoading }}>
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
    // Add admin items
    ...(isAdmin ? [{
      name: "Scores",
      href: "/admin/creneaux",
      icon: ClipboardList,
      active: pathname === "/admin/creneaux"
    }] : []),
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
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-oriental-cream/30 text-oriental-cream/70 hover:text-oriental-cream hover:border-oriental-cream bg-transparent hover:bg-oriental-cream/10"
              >
                <a
                  href="https://murist2025.ch/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Site du Giron</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            )}
            
            {/* Admin Logout Button */}
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-oriental-cream/70 hover:text-oriental-cream hover:bg-oriental-cream/10"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Déconnexion
              </Button>
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
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="mt-2 border-oriental-cream/30 text-oriental-cream/70 hover:text-oriental-cream hover:border-oriental-cream bg-transparent hover:bg-oriental-cream/10"
                >
                  <a
                    href="https://murist2025.ch/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>Site du Giron</span>
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              )}
              
              {/* Mobile Admin Logout */}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="mt-2 text-oriental-cream/70 hover:text-oriental-cream hover:bg-oriental-cream/10"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Déconnexion
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 