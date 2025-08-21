export interface PricingTier {
  characters: string;
  pricePerYear: string;
  description: string;
  minLength: number;
  maxLength: number;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    characters: "5+",
    pricePerYear: "0.02",
    description: "5+ characters",
    minLength: 5,
    maxLength: Infinity,
  },
  {
    characters: "4",
    pricePerYear: "0.1",
    description: "4 characters",
    minLength: 4,
    maxLength: 4,
  },
  {
    characters: "3",
    pricePerYear: "2.0",
    description: "3 characters",
    minLength: 3,
    maxLength: 3,
  },
];

export function calculateDomainPrice(domainName: string): {
  pricePerYear: string;
  tier: PricingTier;
  totalCost: (years: number) => string;
} {
  const cleanName = domainName.replace('.trust', '');
  const length = cleanName.length;

  let tier = PRICING_TIERS[0]; // Default to 5+ characters

  for (const pricingTier of PRICING_TIERS) {
    if (length >= pricingTier.minLength && length <= pricingTier.maxLength) {
      tier = pricingTier;
      break;
    }
  }

  return {
    pricePerYear: tier.pricePerYear,
    tier,
    totalCost: (years: number) => (parseFloat(tier.pricePerYear) * years).toFixed(2),
  };
}

export function formatPrice(amount: string | number, currency = "TRUST"): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${numAmount.toFixed(2)} ${currency}`;
}

export function isValidDomainName(name: string): boolean {
  // Remove .trust suffix if present
  const cleanName = name.replace(/\.trust$/, '');
  
  // Check length (3-64 characters)
  if (cleanName.length < 3 || cleanName.length > 64) {
    return false;
  }
  
  // Check valid characters (only lowercase letters, numbers, hyphens)
  const validPattern = /^[a-z0-9-]+$/;
  if (!validPattern.test(cleanName)) {
    return false;
  }
  
  // Cannot start or end with hyphen
  if (cleanName.startsWith('-') || cleanName.endsWith('-')) {
    return false;
  }
  
  // Cannot have consecutive hyphens
  if (cleanName.includes('--')) {
    return false;
  }
  
  return true;
}

export function normalizeDomainName(name: string): string {
  // Convert to lowercase and remove .trust suffix if present
  let normalized = name.toLowerCase().replace(/\.trust$/, '');
  
  // Add .trust suffix
  return `${normalized}.trust`;
}

export function getDomainSuggestions(baseName: string): string[] {
  const cleanName = baseName.replace(/\.trust$/, '').toLowerCase();
  
  const suffixes = ['app', 'dao', 'web3', 'official', 'xyz', 'pro'];
  const prefixes = ['my', 'the', 'get'];
  
  const suggestions: string[] = [];
  
  // Add suffix suggestions
  suffixes.forEach(suffix => {
    suggestions.push(`${cleanName}${suffix}.trust`);
  });
  
  // Add prefix suggestions
  prefixes.forEach(prefix => {
    suggestions.push(`${prefix}${cleanName}.trust`);
  });
  
  // Add number suggestions
  for (let i = 1; i <= 3; i++) {
    suggestions.push(`${cleanName}${i}.trust`);
  }
  
  return suggestions.slice(0, 6);
}
