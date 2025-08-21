import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DomainSearch } from "@/components/domain-search";
import { ArrowRight, Search, Sparkles } from "lucide-react";

export default function SearchPage() {
  const [selectedDomain, setSelectedDomain] = useState<{ name: string; pricing: any } | null>(null);

  const handleDomainSelect = (domain: string, pricing: any) => {
    setSelectedDomain({ name: domain, pricing });
  };

  const popularDomains = [
    { name: "web3.trust", category: "Technology" },
    { name: "dao.trust", category: "Organization" },
    { name: "nft.trust", category: "Digital Assets" },
    { name: "defi.trust", category: "Finance" },
    { name: "crypto.trust", category: "Cryptocurrency" },
    { name: "meta.trust", category: "Metaverse" },
  ];

  const searchTips = [
    "Domain names must be 3-64 characters long",
    "Only lowercase letters, numbers, and hyphens allowed",
    "Cannot start or end with a hyphen",
    "Shorter domains cost more but have higher resale value",
    "Consider your brand and how memorable the domain is",
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-trust-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Find Your Perfect{" "}
            <span className="text-trust-blue">.trust</span> Domain
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Search for available domain names and register your Web3 identity on the Intuition blockchain
          </p>
        </div>

        {/* Search Section */}
        <div className="mb-16">
          <DomainSearch 
            onDomainSelect={handleDomainSelect} 
            autoFocus 
            placeholder="Enter your desired domain name"
          />
          
          {selectedDomain && (
            <div className="mt-8 flex justify-center">
              <Card className="trust-card max-w-md">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <Sparkles className="h-8 w-8 text-trust-violet mx-auto mb-2" />
                    <h3 className="text-lg font-semibold">Ready to register?</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    <strong>{selectedDomain.name}</strong> is available for{" "}
                    <strong>{selectedDomain.pricing.pricePerYear} TRUST/year</strong>
                  </p>
                  <Link href={`/register?domain=${encodeURIComponent(selectedDomain.name)}`}>
                    <Button className="trust-button w-full" data-testid="proceed-to-register">
                      Register {selectedDomain.name} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Popular Domains */}
          <Card className="trust-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="mr-2 h-5 w-5 text-trust-blue" />
                Popular Domain Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {popularDomains.map((domain) => (
                  <div
                    key={domain.name}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                    onClick={() => {
                      const searchInput = document.querySelector('[data-testid="domain-search-input"]') as HTMLInputElement;
                      if (searchInput) {
                        searchInput.value = domain.name.replace('.trust', '');
                        searchInput.focus();
                      }
                    }}
                    data-testid={`popular-domain-${domain.name}`}
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {domain.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {domain.category}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Search
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Search Tips */}
          <Card className="trust-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-trust-violet" />
                Domain Registration Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {searchTips.map((tip, index) => (
                  <div key={index} className="flex items-start">
                    <div className="w-6 h-6 bg-trust-blue/10 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                      <span className="text-trust-blue text-sm font-medium">{index + 1}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {tip}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-trust-blue/5 dark:bg-trust-blue/10 rounded-lg">
                <h4 className="font-semibold text-trust-blue mb-2">Pro Tip</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Consider registering variations of your brand name or common misspellings to protect your identity.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <Card className="trust-card max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Need Help Choosing a Domain?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Our domain registration guide covers everything from pricing tiers to 
                best practices for Web3 identity management.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" className="border-trust-blue text-trust-blue hover:bg-trust-blue hover:text-white">
                  View Documentation
                </Button>
                <Link href="/manage">
                  <Button className="trust-button">
                    Manage Existing Domains
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
