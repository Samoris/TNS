import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  HelpCircle, 
  MessageCircle, 
  Mail, 
  BookOpen, 
  ExternalLink,
  Search,
  Code,
  Shield,
  Users
} from "lucide-react";
import { SiDiscord, SiX } from "react-icons/si";
import { Link } from "wouter";

export default function SupportPage() {
  const supportOptions = [
    {
      icon: BookOpen,
      title: "Documentation",
      description: "Comprehensive guides and tutorials for using TNS",
      action: "View Docs",
      href: "/docs",
      color: "text-trust-blue",
      bgColor: "bg-trust-blue/10"
    },
    {
      icon: MessageCircle,
      title: "Discord Community",
      description: "Join our Discord server for community support and discussions",
      action: "Join Discord",
      href: "https://discord.gg/J8qZRrTKEf",
      external: true,
      color: "text-indigo-600",
      bgColor: "bg-indigo-600/10"
    },
    {
      icon: SiX,
      title: "Follow on X",
      description: "Get updates and announcements on X (formerly Twitter)",
      action: "Follow Us",
      href: "https://x.com/TNS_trust",
      external: true,
      color: "text-gray-900 dark:text-white",
      bgColor: "bg-gray-900/10 dark:bg-white/10"
    }
  ];

  const faqs = [
    {
      question: "How do I register a .trust domain?",
      answer: "Navigate to the Register page, search for your desired domain, and complete the 2-step commit-reveal process. You'll need to make a commitment first, wait 60 seconds, then complete the registration by minting your domain as an NFT."
    },
    {
      question: "What is the commit-reveal process?",
      answer: "The commit-reveal process prevents front-running attacks. Step 1 commits your domain choice with a secret hash. After a 60-second wait, Step 2 reveals your choice and completes the registration. This ensures no one can steal your domain by observing your transaction."
    },
    {
      question: "How much does a domain cost?",
      answer: "Pricing is tiered by domain length: 3 characters cost 100 TRUST/year, 4 characters cost 70 TRUST/year, and 5+ characters cost 30 TRUST/year. You can register domains for 1-10 years."
    },
    {
      question: "What happens when my domain expires?",
      answer: "After expiration, you have a 30-day grace period to renew (owner-only). After the grace period, anyone can burn the NFT and re-register the domain."
    },
    {
      question: "Can I transfer my domain?",
      answer: "Yes! Your domain is an ERC-721 NFT that you fully own. You can transfer it to another address just like any other NFT."
    },
    {
      question: "How do I set resolver records?",
      answer: "Go to My Domains, click Manage on your domain, and scroll to Resolver Settings. You can set ETH addresses, content hashes (IPFS), and text records like email and social media handles."
    },
    {
      question: "What is a primary domain?",
      answer: "Your primary domain is displayed instead of your wallet address across the TNS platform. Set it by clicking 'Set as Primary Domain' on your domain management page."
    },
    {
      question: "Is my data secure?",
      answer: "All domain data is stored on the Intuition blockchain with security features including reentrancy protection and front-running prevention. However, note that blockchain data is publicly accessible."
    }
  ];

  const quickLinks = [
    { name: "Domain Registration Guide", href: "/docs#registration" },
    { name: "Pricing Information", href: "/docs#pricing" },
    { name: "Technical Documentation", href: "/docs#technical" },
    { name: "Smart Contract Details", href: "/docs#technical" },
    { name: "Payment Forwarding", href: "/docs#payment" },
    { name: "Domain Extension", href: "/docs#extension" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-trust-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <HelpCircle className="h-10 w-10 text-trust-blue" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Support Center
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Get help with Trust Name Service. Browse our guides, FAQs, and connect with our community.
          </p>
        </div>

        {/* Support Options */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {supportOptions.map((option, index) => (
            <Card key={index} className="trust-card hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className={`w-14 h-14 ${option.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                  <option.icon className={`${option.color} h-7 w-7`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {option.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                  {option.description}
                </p>
                {option.external ? (
                  <a
                    href={option.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="w-full trust-button" data-testid={`support-${index}`}>
                      {option.action}
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                ) : (
                  <Link href={option.href}>
                    <Button className="w-full trust-button" data-testid={`support-${index}`}>
                      {option.action}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Links */}
        <Card className="mb-12 trust-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-6 w-6 text-trust-blue" />
              Quick Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickLinks.map((link, index) => (
                <Link key={index} href={link.href}>
                  <a className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-trust-blue/10 dark:hover:bg-trust-blue/20 transition-colors cursor-pointer">
                    <Code className="h-4 w-4 text-trust-blue flex-shrink-0" />
                    <span className="text-sm font-medium">{link.name}</span>
                  </a>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* FAQs */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index} className="trust-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-start gap-2">
                    <HelpCircle className="h-5 w-5 text-trust-blue mt-0.5 flex-shrink-0" />
                    {faq.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 ml-7">
                    {faq.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Additional Resources */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="trust-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-trust-blue" />
                Security & Safety
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Learn about our security measures and best practices for protecting your domains and assets.
              </p>
              <Link href="/docs#technical">
                <Button variant="outline" className="w-full" data-testid="security-docs">
                  View Security Docs
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="trust-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-trust-blue" />
                Community
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Join our growing community to connect with other TNS users and stay updated on new features.
              </p>
              <div className="flex gap-2">
                <a
                  href="https://discord.gg/J8qZRrTKEf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full" data-testid="discord-link">
                    <SiDiscord className="mr-2 h-4 w-4" />
                    Discord
                  </Button>
                </a>
                <a
                  href="https://x.com/TNS_trust"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full" data-testid="x-link">
                    <SiX className="mr-2 h-4 w-4" />
                    X / Twitter
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Still Need Help */}
        <Card className="mt-12 trust-card bg-trust-blue/5 dark:bg-trust-blue/10 border-trust-blue/20">
          <CardContent className="p-8 text-center">
            <Mail className="h-12 w-12 text-trust-blue mx-auto mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Still Need Help?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
              Can't find what you're looking for? Join our Discord community or check our comprehensive documentation for detailed guides and tutorials.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://discord.gg/J8qZRrTKEf"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="trust-button" data-testid="join-discord">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Join Discord Community
                </Button>
              </a>
              <Link href="/docs">
                <Button variant="outline" data-testid="view-all-docs">
                  <BookOpen className="mr-2 h-4 w-4" />
                  View All Documentation
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
