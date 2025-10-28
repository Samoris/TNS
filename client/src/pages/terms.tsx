import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Shield, AlertTriangle, Scale, CheckCircle2, XCircle } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-trust-dark">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-10 w-10 text-trust-blue" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Terms of Service
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Last updated: October 28, 2025
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-8 trust-card">
          <CardContent className="p-8">
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              Welcome to Trust Name Service (TNS). By using our platform, you agree to these Terms of Service. Please read them carefully.
            </p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              TNS is a decentralized naming service on the Intuition blockchain testnet. These terms govern your use of the TNS platform, including domain registration, management, and all related services.
            </p>
          </CardContent>
        </Card>

        {/* Acceptance of Terms */}
        <Card className="mb-8 trust-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-trust-blue" />
              Acceptance of Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              By accessing or using TNS, you agree to:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Be bound by these Terms of Service
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Comply with all applicable laws and regulations
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Accept the risks associated with blockchain technology
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Use the service in good faith and for lawful purposes
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Domain Registration */}
        <Card className="mb-8 trust-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-trust-blue" />
              Domain Registration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Registration Process</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Domains are registered using a 2-step commit-reveal process
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  You must wait at least 60 seconds between commitment and registration
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Registration creates an ERC-721 NFT representing domain ownership
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  All registrations require payment in TRUST tokens
                </span>
              </li>
            </ul>

            <h3 className="font-semibold text-gray-900 dark:text-white mt-6">Domain Ownership</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  You own the domain NFT for the duration of your registration period
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Ownership can be transferred by transferring the NFT
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Domains must be renewed before expiration to maintain ownership
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  A 30-day grace period is provided after expiration for owner-only renewal
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Prohibited Uses */}
        <Card className="mb-8 trust-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-600" />
              Prohibited Uses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              You may not use TNS for:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-1">✕</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Illegal activities or promoting illegal content
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-1">✕</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Infringing on intellectual property rights of others
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-1">✕</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Phishing, scamming, or fraudulent activities
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-1">✕</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Harassment, hate speech, or harmful content
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-1">✕</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Attempting to exploit or manipulate the smart contracts
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Disclaimers */}
        <Card className="mb-8 trust-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              Disclaimers & Limitations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Testnet Environment</h3>
            <p className="text-gray-600 dark:text-gray-300">
              TNS operates on the Intuition testnet. Testnet tokens have no real-world value, and the service may be unstable or subject to resets.
            </p>

            <h3 className="font-semibold text-gray-900 dark:text-white mt-6">No Warranties</h3>
            <p className="text-gray-600 dark:text-gray-300">
              TNS is provided "as is" without warranties of any kind. We do not guarantee:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Uninterrupted or error-free service
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Security against all possible attacks
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Specific results or outcomes from using the service
                </span>
              </li>
            </ul>

            <h3 className="font-semibold text-gray-900 dark:text-white mt-6">Limitation of Liability</h3>
            <p className="text-gray-600 dark:text-gray-300">
              TNS and its developers are not liable for any damages resulting from:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Loss of domain ownership due to expiration
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Smart contract bugs or vulnerabilities
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Network congestion or transaction failures
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  User error or loss of private keys
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* User Responsibilities */}
        <Card className="mb-8 trust-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-trust-blue" />
              Your Responsibilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Maintain the security of your wallet and private keys
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Verify all transaction details before confirming
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Keep track of domain expiration dates and renew as needed
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Ensure you have sufficient TRUST tokens for transactions
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Understand the irreversible nature of blockchain transactions
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card className="mb-8 trust-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-6 w-6 text-trust-blue" />
              Changes to Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting. Your continued use of TNS after changes constitutes acceptance of the modified terms.
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="trust-card bg-trust-blue/5 dark:bg-trust-blue/10 border-trust-blue/20">
          <CardContent className="p-8">
            <h3 className="text-xl font-semibold mb-4">Questions About These Terms?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              If you have questions or concerns about these Terms of Service, please contact us through our support channels.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              By using TNS, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
