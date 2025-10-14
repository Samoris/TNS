import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DomainSearch } from "@/components/domain-search";
import { PricingSection } from "@/components/pricing-card";
import { ContractStats } from "@/components/contract-stats";
import { Shield, Coins, Award, ArrowRight, Zap, Users, Globe } from "lucide-react";

export default function Home() {
  const [selectedDomain, setSelectedDomain] = useState<{ name: string; pricing: any } | null>(null);

  const handleDomainSelect = (domain: string, pricing: any) => {
    setSelectedDomain({ name: domain, pricing });
  };

  const features = [
    {
      icon: Shield,
      title: "Decentralized & Secure",
      description: "Powered by Intuition blockchain smart contracts",
      color: "text-trust-blue",
      bgColor: "bg-trust-blue/10",
    },
    {
      icon: Coins,
      title: "Affordable Pricing",
      description: "Starting from 30 TRUST per year",
      color: "text-trust-violet",
      bgColor: "bg-trust-violet/10",
    },
    {
      icon: Award,
      title: "NFT Ownership",
      description: "Your domain is an ERC-721 NFT you truly own",
      color: "text-trust-emerald",
      bgColor: "bg-trust-emerald/10",
    },
  ];

  const howItWorksSteps = [
    {
      step: 1,
      title: "Search & Commit",
      description: "Search for available domains and submit a commit transaction to reserve your choice securely.",
      color: "bg-trust-blue",
    },
    {
      step: 2,
      title: "Wait & Reveal",
      description: "After a 1-minute security delay, reveal your commitment and complete the registration process.",
      color: "bg-trust-violet",
    },
    {
      step: 3,
      title: "Own & Manage",
      description: "Your domain becomes an NFT in your wallet. Set addresses, create subdomains, and transfer ownership freely.",
      color: "bg-trust-emerald",
    },
  ];

  // Remove static stats - now using real-time ContractStats component

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        {/* Background */}
        <div className="absolute inset-0 hero-gradient"></div>
        <div className="absolute inset-0 pattern-dots opacity-30"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Your{" "}
              <span className="bg-gradient-to-r from-trust-blue to-trust-violet bg-clip-text text-transparent">
                Web3 Identity
              </span>
              <br />
              Starts with{" "}
              <span className="text-trust-blue">.trust</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Trust Naming Service (TNS) provides decentralized, human-readable names for your crypto addresses 
              on Intuition blockchain. Own your digital identity with .trust domains.
            </p>

            {/* Domain Search */}
            <div className="mb-16">
              <DomainSearch onDomainSelect={handleDomainSelect} autoFocus />
              
              {selectedDomain && (
                <div className="mt-6 flex justify-center">
                  <Link href={`/register?domain=${encodeURIComponent(selectedDomain.name)}`}>
                    <Button className="trust-button text-lg px-8 py-3" data-testid="proceed-to-register">
                      Register {selectedDomain.name} <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Key Features */}
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {features.map((feature, index) => (
                <div key={index} className="text-center">
                  <div className={`w-16 h-16 ${feature.bgColor} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                    <feature.icon className={`${feature.color} text-2xl h-8 w-8`} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" data-testid={`feature-${index}`}>
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Real-time Statistics Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Live Network Statistics
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Real-time data from the TNS blockchain registry
            </p>
          </div>
          <ContractStats />
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50 dark:bg-trust-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How TNS Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Built on proven ENS architecture with commit-reveal security and ERC-721 ownership
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="space-y-8">
              {howItWorksSteps.map((item) => (
                <div key={item.step} className="flex items-start">
                  <div className={`flex-shrink-0 w-12 h-12 ${item.color} rounded-xl flex items-center justify-center mr-6`}>
                    <span className="text-white font-bold">{item.step}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <Card className="trust-card">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Domain Architecture
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="flex items-center mb-2">
                      <Globe className="text-trust-blue mr-3 h-5 w-5" />
                      <span className="font-semibold">Registry Contract</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Maintains domain ownership and resolver mappings
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="flex items-center mb-2">
                      <Shield className="text-trust-violet mr-3 h-5 w-5" />
                      <span className="font-semibold">Resolver Contract</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Translates domains to addresses and resource records
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="flex items-center mb-2">
                      <Award className="text-trust-emerald mr-3 h-5 w-5" />
                      <span className="font-semibold">Registrar Contract</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Handles registration, pricing, and renewals
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Network Information */}
          <Card className="trust-card">
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
                Network Information
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-trust-blue font-semibold mb-1">Chain ID</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="chain-id">
                    13579
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-trust-blue font-semibold mb-1">Network</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    Intuition Testnet
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-trust-blue font-semibold mb-1">Currency</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    TRUST
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-trust-blue font-semibold mb-1">RPC URL</div>
                  <div className="text-sm font-mono text-gray-600 dark:text-gray-400 break-all">
                    testnet.rpc.intuition.systems
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-trust-dark text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Your .trust Domain?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of users who trust TNS for their Web3 identity
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button className="bg-white text-trust-dark hover:bg-gray-100 px-8 py-3 text-lg" data-testid="cta-register">
                Register Domain
              </Button>
            </Link>
            <Link href="/manage">
              <Button variant="outline" className="border-white text-white hover:bg-white hover:text-trust-dark px-8 py-3 text-lg" data-testid="cta-manage">
                Manage Domains
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
