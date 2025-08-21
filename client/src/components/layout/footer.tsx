import { Link } from "wouter";
import { Globe, Twitter, Github, MessageCircle } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    resources: [
      { name: "Documentation", href: "#" },
      { name: "API Reference", href: "#" },
      { name: "Smart Contracts", href: "#" },
      { name: "Integration Guide", href: "#" },
    ],
    network: [
      { name: "Chain ID: 13579", href: "#" },
      { name: "Currency: TRUST", href: "#" },
      { name: "Block Explorer ↗", href: "https://testnet.explorer.intuition.systems", external: true },
      { name: "Add to MetaMask", href: "#" },
    ],
    legal: [
      { name: "Privacy Policy", href: "#" },
      { name: "Terms of Service", href: "#" },
      { name: "Support", href: "#" },
    ],
  };

  const socialLinks = [
    { name: "Twitter", icon: Twitter, href: "#" },
    { name: "GitHub", icon: Github, href: "#" },
    { name: "Discord", icon: MessageCircle, href: "#" },
  ];

  return (
    <footer className="bg-trust-dark text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand Section */}
          <div className="col-span-2">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-trust-blue to-trust-violet rounded-lg flex items-center justify-center">
                <Globe className="text-white text-lg" />
              </div>
              <span className="ml-3 text-2xl font-bold">TNS</span>
            </div>
            <p className="text-gray-300 max-w-md mb-6">
              Trust Naming Service provides decentralized domain names for the Intuition blockchain ecosystem, 
              making Web3 addresses human-readable and secure.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
                  aria-label={social.name}
                  data-testid={`social-${social.name.toLowerCase()}`}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-2 text-gray-300">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="hover:text-white transition-colors text-sm"
                    data-testid={`footer-${link.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Network */}
          <div>
            <h3 className="font-semibold text-white mb-4">Network</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              {footerLinks.network.map((link) => (
                <li key={link.name}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                      data-testid={`footer-${link.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.name}
                    </a>
                  ) : (
                    <span className="font-mono" data-testid={`footer-${link.name.toLowerCase().replace(/\s+/g, "-")}`}>
                      {link.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm mb-4 md:mb-0">
            © {currentYear} Trust Naming Service. Built on Intuition blockchain.
          </div>
          <div className="flex space-x-6 text-sm text-gray-400">
            {footerLinks.legal.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="hover:text-white transition-colors"
                data-testid={`footer-legal-${link.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {link.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
