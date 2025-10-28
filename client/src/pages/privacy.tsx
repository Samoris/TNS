import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, Database, UserCheck, AlertCircle } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-trust-dark">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-10 w-10 text-trust-blue" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Privacy Policy
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Last updated: October 28, 2025
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-8 trust-card">
          <CardContent className="p-8">
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Trust Name Service (TNS) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our decentralized naming service on the Intuition blockchain.
            </p>
          </CardContent>
        </Card>

        {/* Information Collection */}
        <Card className="mb-8 trust-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6 text-trust-blue" />
              Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Blockchain Data</h3>
              <p className="text-gray-600 dark:text-gray-300">
                All domain registrations, transactions, and on-chain activities are permanently recorded on the Intuition blockchain. This includes your wallet address, domain names, and transaction history.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Wallet Information</h3>
              <p className="text-gray-600 dark:text-gray-300">
                We connect to your Web3 wallet (e.g., MetaMask) to facilitate transactions. We do not store your private keys or seed phrases.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Resolver Records</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Any information you add to your domain's resolver records (addresses, content hashes, text records) is stored on-chain and publicly accessible.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Information */}
        <Card className="mb-8 trust-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-6 w-6 text-trust-blue" />
              How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  To process domain registrations, renewals, and management requests
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  To display your registered domains and associated data
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  To resolve domain names to addresses and resources
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  To improve our service and user experience
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card className="mb-8 trust-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-6 w-6 text-trust-blue" />
              Data Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  All transactions are secured by blockchain cryptography
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  We never store or have access to your private keys
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Smart contracts are audited for security vulnerabilities
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  We use reentrancy protection and front-running prevention
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Blockchain Transparency */}
        <Card className="mb-8 trust-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-trust-blue" />
              Blockchain Transparency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              As a decentralized service, all TNS data is stored on the public Intuition blockchain. This means:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Your wallet address and domain ownership are publicly visible
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  All transactions can be viewed on the block explorer
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Resolver records you set are publicly accessible
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Data stored on-chain cannot be deleted, only updated
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card className="mb-8 trust-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-trust-blue" />
              Your Rights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  You have full control over your domain NFTs and can transfer or sell them
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  You can update or remove resolver records at any time
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  You can disconnect your wallet from our platform at any time
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  You can choose which information to include in resolver records
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Third-Party Services */}
        <Card className="mb-8 trust-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-trust-blue" />
              Third-Party Services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              TNS integrates with the following third-party services:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  <strong>MetaMask:</strong> For wallet connectivity and transaction signing
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  <strong>Intuition Blockchain:</strong> For storing domain data and processing transactions
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span className="text-gray-600 dark:text-gray-300">
                  <strong>IPFS:</strong> For decentralized content hosting (if you choose to use content hashes)
                </span>
              </li>
            </ul>
            <p className="text-gray-600 dark:text-gray-300 mt-4">
              These services have their own privacy policies, which we encourage you to review.
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="trust-card bg-trust-blue/5 dark:bg-trust-blue/10 border-trust-blue/20">
          <CardContent className="p-8">
            <h3 className="text-xl font-semibold mb-4">Questions About Privacy?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              If you have questions or concerns about this Privacy Policy, please contact us through our support channels.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This policy may be updated periodically. Continued use of TNS constitutes acceptance of any changes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
