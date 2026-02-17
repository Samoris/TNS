import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { Moon, Sun, Wallet, Globe, LogOut, Crown, RefreshCw, Menu, X, Database, User, KeyRound, Link2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { web3Service } from "@/lib/web3";
import { TNS_RESOLVER_ADDRESS } from "@/lib/contracts";
import logoImage from "@assets/WhatsApp Image 2025-10-16 at 3.19.59 PM_1760633880162.jpeg";

const ADMIN_WALLET_ADDRESS = (import.meta.env.VITE_ADMIN_WALLET_ADDRESS || "").toLowerCase();

export function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
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
    providerType,
    web3AuthAvailable,
    connectWallet,
    connectWithWeb3Auth,
    switchWallet,
    switchAccount,
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

  const { data: primaryDomain } = useQuery({
    queryKey: ['/api/primary-domain', address],
    queryFn: async () => {
      if (!address) return "";
      try {
        const domain = await web3Service.getPrimaryDomainENS(
          TNS_RESOLVER_ADDRESS,
          address
        );
        return domain;
      } catch {
        return "";
      }
    },
    enabled: isConnected && !!address,
    refetchInterval: 30000,
    retry: false,
  });

  const isAdmin = address?.toLowerCase() === ADMIN_WALLET_ADDRESS;

  const handleConnectMetaMask = async () => {
    setConnectDialogOpen(false);
    await connectWallet();
  };

  const handleConnectSocial = async () => {
    setConnectDialogOpen(false);
    await connectWithWeb3Auth();
  };

  const handleConnectClick = () => {
    if (web3AuthAvailable) {
      setConnectDialogOpen(true);
    } else {
      connectWallet();
    }
  };

  const navigation = [
    { name: "Search", href: "/", active: location === "/" },
    { name: "Register", href: "/register", active: location === "/register" },
    { name: "My Domains", href: "/manage", active: location === "/manage" },
    { name: "Send Payment", href: "/send-payment", active: location === "/send-payment" },
    { name: "Agents", href: "/agents", active: location === "/agents" || location === "/agent-register" || location === "/agent-test" },
    { name: "Sync", href: "/sync", active: location === "/sync" },
    { name: "Docs", href: "/docs", active: location === "/docs" },
  ];

  return (
    <>
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0 flex items-center">
                <img 
                  src={logoImage} 
                  alt="TNS Logo" 
                  className="h-8 sm:h-10 w-auto object-contain"
                />
                <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs bg-trust-violet/10 text-trust-violet">
                  BETA
                </Badge>
              </Link>

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

            <div className="flex items-center space-x-2 sm:space-x-4">
              {isConnected && (
                <div className="hidden sm:flex items-center gap-2">
                  {providerType === 'web3auth' && (
                    <Badge variant="outline" className="text-xs border-purple-300 text-purple-600 dark:border-purple-600 dark:text-purple-400">
                      Social Login
                    </Badge>
                  )}
                  {isCorrectNetwork ? (
                    <Badge variant="default" className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      Intuition Mainnet
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="cursor-pointer" onClick={switchNetwork}>
                      Wrong Network
                    </Badge>
                  )}
                </div>
              )}

              <Button variant="ghost" size="icon" onClick={toggleTheme} className="min-h-[44px] min-w-[44px] h-11 w-11" data-testid="theme-toggle">
                {theme === "light" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </Button>

              {!isConnected ? (
                <Button
                  onClick={handleConnectClick}
                  disabled={isLoading}
                  className="trust-button min-h-[44px]"
                  data-testid="connect-wallet-button"
                >
                  <Wallet className="mr-0 sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">{isLoading ? "Connecting..." : "Connect"}</span>
                </Button>
              ) : (
                <div className="flex items-center gap-1 sm:gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center space-x-1 sm:space-x-2 min-h-[44px]" data-testid="wallet-dropdown">
                        <Wallet className="h-4 w-4" />
                        <span className="hidden sm:block">
                          {primaryDomain ? (primaryDomain.endsWith('.trust') ? primaryDomain : `${primaryDomain}.trust`) : formatAddress(address!)}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <div className="p-3">
                        {primaryDomain && (
                          <div className="mb-2 flex items-center gap-2">
                            <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            <div className="text-sm font-bold text-trust-blue" data-testid="text-primary-domain">
                              {primaryDomain.endsWith('.trust') ? primaryDomain : `${primaryDomain}.trust`}
                            </div>
                          </div>
                        )}
                        <div className="text-sm font-medium">Connected Wallet</div>
                        <div className="text-xs text-gray-500 font-mono">{address}</div>
                        {balance && (
                          <div className="text-sm font-medium mt-1">
                            Balance: {balance} TRUST
                          </div>
                        )}
                        {providerType && (
                          <div className="text-xs text-gray-400 mt-1">
                            via {providerType === 'web3auth' ? 'Social Login' : 'MetaMask'}
                          </div>
                        )}
                      </div>
                      <DropdownMenuSeparator />
                      {providerType !== 'web3auth' && (
                        <>
                          <DropdownMenuItem onClick={switchWallet} data-testid="switch-wallet">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Switch Wallet
                          </DropdownMenuItem>
                          {!isCorrectNetwork && (
                            <DropdownMenuItem onClick={switchNetwork} data-testid="switch-network">
                              <Globe className="mr-2 h-4 w-4" />
                              Switch to Intuition Mainnet
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={switchAccount} data-testid="switch-account">
                            <User className="mr-2 h-4 w-4" />
                            Switch Account
                          </DropdownMenuItem>
                        </>
                      )}
                      <Link href="/link-accounts">
                        <DropdownMenuItem data-testid="link-accounts">
                          <Link2 className="mr-2 h-4 w-4" />
                          Link Social Accounts
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={disconnectWallet} data-testid="disconnect-wallet-dropdown">
                        <LogOut className="mr-2 h-4 w-4" />
                        Disconnect
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={disconnectWallet}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 min-h-[44px] min-w-[44px] h-11 w-11 hidden sm:flex"
                    title="Disconnect Wallet"
                    data-testid="disconnect-wallet-button"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden min-h-[44px] min-w-[44px] h-11 w-11"
                data-testid="mobile-menu-toggle"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-3 min-h-[44px] rounded-md text-base font-medium transition-colors ${
                    item.active
                      ? "bg-trust-blue/10 text-trust-blue"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  data-testid={`mobile-nav-${item.name.toLowerCase().replace(" ", "-")}`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            {isConnected && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Network Status</div>
                {isCorrectNetwork ? (
                  <Badge variant="default" className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    Intuition Mainnet
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="cursor-pointer" onClick={switchNetwork}>
                    Wrong Network - Tap to Switch
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}
      </nav>

      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Connect to TNS</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={handleConnectMetaMask}
              disabled={isLoading}
              variant="outline"
              className="flex items-center justify-start gap-3 h-14 px-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <div className="font-medium">MetaMask</div>
                <div className="text-xs text-gray-500">Connect with browser wallet</div>
              </div>
            </Button>
            <Button
              onClick={handleConnectSocial}
              disabled={isLoading}
              variant="outline"
              className="flex items-center justify-start gap-3 h-14 px-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <KeyRound className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <div className="font-medium">Social Login</div>
                <div className="text-xs text-gray-500">Google, Twitter, Email & more</div>
              </div>
            </Button>
            <p className="text-xs text-center text-gray-400 mt-2">
              Social login creates a wallet automatically via Web3Auth
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
