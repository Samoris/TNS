import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Shield, 
  Coins, 
  RefreshCw, 
  Send, 
  Crown, 
  Settings, 
  Flame,
  Clock,
  Link as LinkIcon,
  FileText,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function DocsPage() {
  const sections = [
    {
      id: "overview",
      title: "Overview",
      icon: BookOpen,
      content: [
        {
          heading: "What is TNS?",
          text: "Trust Name Service (TNS) is a decentralized naming service for the Intuition mainnet, similar to ENS. It enables you to register human-readable .trust domain names that map to blockchain addresses and other resources."
        },
        {
          heading: "Key Features",
          items: [
            "Domain registration with ERC-721 NFT ownership",
            "2-step commit-reveal process for front-running protection",
            "Address resolution and payment forwarding",
            "Reverse resolution (display domain instead of address)",
            "Domain extension/renewal system",
            "30-day grace period for expired domains",
            "Custom resolver records (addresses, content hashes, text records)"
          ]
        }
      ]
    },
    {
      id: "registration",
      title: "Domain Registration",
      icon: Shield,
      content: [
        {
          heading: "2-Step Commit-Reveal Process",
          text: "TNS uses a secure 2-step registration process to prevent front-running attacks where malicious actors try to steal domain names by observing pending transactions."
        },
        {
          heading: "Step 1: Make Commitment",
          items: [
            "Click 'Step 1: Make Commitment' on the registration page",
            "A random secret is generated and combined with your domain choice",
            "A commitment hash is created and submitted to the blockchain",
            "Wait at least 60 seconds before proceeding to Step 2"
          ]
        },
        {
          heading: "Step 2: Complete Registration",
          items: [
            "After the 60-second wait, click 'Step 2: Complete Registration'",
            "Your secret is revealed to the contract for verification",
            "Payment is sent and the ERC-721 NFT is minted to your wallet",
            "You now own the domain as a transferable NFT"
          ]
        },
        {
          heading: "Important Notes",
          items: [
            "Minimum wait: 60 seconds between steps",
            "Maximum window: 24 hours to complete after commitment",
            "Domain names must be 3-63 characters",
            "Only lowercase letters, numbers, and hyphens allowed",
            "Cannot start or end with hyphens"
          ]
        }
      ]
    },
    {
      id: "pricing",
      title: "Pricing Structure",
      icon: Coins,
      content: [
        {
          heading: "Tiered Pricing",
          text: "Domain prices are based on character length. Shorter domains are more expensive due to their scarcity and memorability."
        },
        {
          heading: "Price Tiers",
          items: [
            "3 characters: 100 TRUST per year",
            "4 characters: 70 TRUST per year",
            "5+ characters: 30 TRUST per year"
          ]
        },
        {
          heading: "Registration Duration",
          items: [
            "Minimum: 1 year",
            "Maximum: 10 years",
            "You can extend your domain at any time before expiration"
          ]
        }
      ]
    },
    {
      id: "extension",
      title: "Domain Extension & Renewal",
      icon: RefreshCw,
      content: [
        {
          heading: "How to Extend Your Domain",
          text: "Keep your domain active by extending its registration before it expires. You can add 1, 2, 3, or 5 years at a time."
        },
        {
          heading: "Extension Process",
          items: [
            "Go to 'My Domains' page",
            "Click 'Manage' on the domain you want to extend",
            "Find the 'Extend Domain' section",
            "Select your desired duration (1, 2, 3, or 5 years)",
            "Review the cost calculation and new expiration date",
            "Click 'Extend for X Years' to submit the transaction"
          ]
        },
        {
          heading: "Grace Period",
          items: [
            "30-day grace period after domain expiration",
            "Only the original owner can renew during grace period",
            "Domain cannot be re-registered or burned during grace period",
            "After grace period ends, anyone can burn the NFT or re-register the domain"
          ]
        }
      ]
    },
    {
      id: "payment",
      title: "Payment Forwarding",
      icon: Send,
      content: [
        {
          heading: "Send TRUST to Domain Names",
          text: "You can send TRUST tokens directly to .trust domain names. The payment automatically resolves to the correct address."
        },
        {
          heading: "How It Works",
          items: [
            "Go to 'Send Payment' page",
            "Enter a .trust domain name",
            "Click 'Resolve' to verify the domain and get payment address",
            "Enter the amount of TRUST tokens to send",
            "Click 'Send Payment' to complete the transaction",
            "Payment is sent to the domain's resolver address (if set) or owner's address"
          ]
        },
        {
          heading: "Security",
          items: [
            "Domain existence and expiration are validated before transfer",
            "Payments to expired domains are rejected",
            "Reentrancy protection on all payment functions",
            "All payments emit blockchain events for tracking"
          ]
        }
      ]
    },
    {
      id: "reverse",
      title: "Reverse Resolution",
      icon: Crown,
      content: [
        {
          heading: "Primary Domain",
          text: "Set one of your domains as your primary domain to display it instead of your wallet address across the TNS platform."
        },
        {
          heading: "Benefits",
          items: [
            "Your primary domain shows in the header instead of your address",
            "Easier for others to recognize and remember you",
            "Enhances your Web3 identity",
            "Stored on-chain for transparency"
          ]
        },
        {
          heading: "How to Set Primary Domain",
          items: [
            "Go to 'My Domains' page",
            "Click 'Manage' on the domain you want as primary",
            "Find the 'Domain Information' section",
            "Click 'Set as Primary Domain' button",
            "Confirm the transaction in MetaMask"
          ]
        }
      ]
    },
    {
      id: "resolver",
      title: "Resolver Records",
      icon: Settings,
      content: [
        {
          heading: "Configure Resolution Data",
          text: "Add custom records to your domain to map it to various resources like wallet addresses, IPFS content, and social media profiles."
        },
        {
          heading: "Record Types",
          items: [
            "ETH Address: Map your domain to any Ethereum-compatible address",
            "Content Hash: Link to IPFS/IPNS content (0x, Qm, or bafy prefixes)",
            "Text Records: Store metadata like email, social media handles, and more"
          ]
        },
        {
          heading: "Supported Text Record Keys",
          items: [
            "email - Email address",
            "url - Website URL",
            "avatar - Avatar image URL",
            "description - Description text",
            "com.twitter - Twitter/X handle or URL",
            "com.github - GitHub username or URL",
            "com.discord - Discord username",
            "com.reddit - Reddit username",
            "org.telegram - Telegram username"
          ]
        },
        {
          heading: "How to Manage Records",
          items: [
            "Go to 'My Domains' and click 'Manage' on your domain",
            "Scroll to 'Resolver Settings' section",
            "Use the forms to add or update records",
            "Each update requires a blockchain transaction"
          ]
        }
      ]
    },
    {
      id: "burning",
      title: "Burning Expired Domains",
      icon: Flame,
      content: [
        {
          heading: "Permissionless Cleanup",
          text: "Anyone can burn (permanently delete) expired domain NFTs after the grace period ends, making the domain available for re-registration."
        },
        {
          heading: "When Can Domains Be Burned?",
          items: [
            "Domain must be expired (past expiration date)",
            "Grace period (30 days) must have ended",
            "Only expired domains can be burned - active domains are protected"
          ]
        },
        {
          heading: "How to Burn",
          items: [
            "Find an expired domain past its grace period",
            "Click the 'Burn NFT' button",
            "Confirm the transaction in MetaMask",
            "The NFT is permanently deleted and domain becomes available"
          ]
        },
        {
          heading: "Why Burn Domains?",
          items: [
            "Cleanup: Removes expired domains from the registry",
            "Availability: Frees up domain names for new registration",
            "Fair Access: Prevents indefinite domain squatting",
            "Gas Efficiency: Reduces blockchain state"
          ]
        }
      ]
    },
    {
      id: "technical",
      title: "Technical Details",
      icon: FileText,
      content: [
        {
          heading: "Smart Contracts",
          items: [
            "TNS Registry: 0x7C365AF9034b00dadc616dE7f38221C678D423Fa",
            "TNS Resolver: 0x490a0B0EAD6B1da1C7810ACBc9574D7429880F06",
            "Payment Forwarder: 0x640E4fD39A2f7f65BBB344988eFF7470A98E2547"
          ]
        },
        {
          heading: "Network Information",
          items: [
            "Chain ID: 1155",
            "Network: Intuition mainnet",
            "RPC URL: https://intuition.calderachain.xyz",
            "Explorer: https://explorer.intuition.systems",
            "Currency: TRUST"
          ]
        },
        {
          heading: "Security Features",
          items: [
            "Reentrancy protection on all critical functions",
            "Front-running protection via commit-reveal",
            "Ownership verification for all state changes",
            "Grace period to protect domain owners",
            "Integer overflow checks in calculations"
          ]
        },
        {
          heading: "NFT Standard",
          items: [
            "ERC-721 compliant NFTs",
            "OpenZeppelin implementation",
            "Fully transferable and tradeable",
            "Compatible with NFT marketplaces"
          ]
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-trust-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="h-10 w-10 text-trust-blue" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              TNS Documentation
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl">
            Complete guide to using Trust Name Service on the Intuition mainnet
          </p>
        </div>

        {/* Quick Links */}
        <Card className="mb-12 trust-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Quick Navigation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-trust-blue/10 dark:hover:bg-trust-blue/20 transition-colors"
                  data-testid={`docs-nav-${section.id}`}
                >
                  <section.icon className="h-4 w-4 text-trust-blue" />
                  <span className="text-sm font-medium">{section.title}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Documentation Sections */}
        <div className="space-y-8">
          {sections.map((section, index) => (
            <Card key={section.id} id={section.id} className="trust-card scroll-mt-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <section.icon className="h-7 w-7 text-trust-blue" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {section.content.map((item, itemIndex) => (
                  <div key={itemIndex}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      {item.heading}
                    </h3>
                    {item.text && (
                      <p className="text-gray-600 dark:text-gray-300 mb-3 ml-7">
                        {item.text}
                      </p>
                    )}
                    {item.items && (
                      <ul className="space-y-2 ml-7">
                        {item.items.map((listItem, listIndex) => (
                          <li key={listIndex} className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                            <span className="text-trust-blue mt-1.5">•</span>
                            <span>{listItem}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {itemIndex < section.content.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Help Section */}
        <Card className="mt-12 trust-card bg-trust-blue/5 dark:bg-trust-blue/10 border-trust-blue/20">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-trust-blue mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Need Help?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              If you have questions or need assistance, feel free to reach out to the TNS community or check the contract on the block explorer.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Badge variant="secondary" className="text-sm">
                Intuition Mainnet
              </Badge>
              <Badge variant="secondary" className="text-sm">
                ERC-721 NFTs
              </Badge>
              <Badge variant="secondary" className="text-sm">
                Open Source
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
