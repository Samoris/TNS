import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { Moon, Sun, Wallet, Globe, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import logoImage from "@assets/WhatsApp Image 2025-10-16 at 3.19.59 PM_1760633880162.jpeg";

export function Header() {
  const [location] = useLocation();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") as "light" | "dark" || "light";
    }
    return "light";
  });

  const {
    isConnected,
    address,
    balance,
    isCorrectNetwork,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    formatAddress,
  } = useWallet();

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  const navigation = [
    { name: "Search", href: "/", active: location === "/" },
    { name: "Register", href: "/register", active: location === "/register" },
    { name: "My Domains", href: "/manage", active: location === "/manage" },
    { name: "Docs", href: "#", active: false },
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center">
              <img 
                src={logoImage} 
                alt="TNS Logo" 
                className="h-10 w-auto object-contain"
              />
              <Badge variant="secondary" className="ml-2 bg-trust-violet/10 text-trust-violet">
                BETA
              </Badge>
            </Link>

            {/* Navigation */}
            <div className="hidden md:ml-8 md:flex md:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    item.active
                      ? "text-trust-blue border-b-2 border-trust-blue"
                      : "text-gray-500 dark:text-gray-400 hover:text-trust-blue"
                  }`}
                  data-testid={`nav-${item.name.toLowerCase().replace(" ", "-")}`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Network Status */}
            {isConnected && (
              <div className="hidden sm:flex items-center">
                {isCorrectNetwork ? (
                  <Badge variant="default" className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    Intuition Testnet
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="cursor-pointer" onClick={switchNetwork}>
                    Wrong Network
                  </Badge>
                )}
              </div>
            )}

            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="theme-toggle">
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            {/* Wallet Connection */}
            {!isConnected ? (
              <Button
                onClick={connectWallet}
                disabled={isLoading}
                className="trust-button"
                data-testid="connect-wallet-button"
              >
                <Wallet className="mr-2 h-4 w-4" />
                {isLoading ? "Connecting..." : "Connect Wallet"}
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2" data-testid="wallet-dropdown">
                    <Wallet className="h-4 w-4" />
                    <span className="hidden sm:block">
                      {formatAddress(address!)}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="p-3">
                    <div className="text-sm font-medium">Connected Wallet</div>
                    <div className="text-xs text-gray-500 font-mono">{address}</div>
                    {balance && (
                      <div className="text-sm font-medium mt-1">
                        Balance: {balance} TRUST
                      </div>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  {!isCorrectNetwork && (
                    <DropdownMenuItem onClick={switchNetwork} data-testid="switch-network">
                      <Globe className="mr-2 h-4 w-4" />
                      Switch to Intuition Testnet
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={disconnectWallet} data-testid="disconnect-wallet">
                    <LogOut className="mr-2 h-4 w-4" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}
    </nav>
  );
}
