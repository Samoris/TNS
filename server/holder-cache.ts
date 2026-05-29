let holdingsByAddress = new Map<string, number>();
let lastRefresh = 0;

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

export function updateHoldings(records: Array<{ owner: string; expirationDate: Date | string | number }>): void {
  const map = new Map<string, number>();
  const now = Date.now();
  for (const r of records) {
    if (!r.owner || r.owner.toLowerCase() === ZERO_ADDR) continue;
    const exp = r.expirationDate instanceof Date ? r.expirationDate.getTime() : new Date(r.expirationDate).getTime();
    if (!Number.isFinite(exp) || exp <= now) continue;
    const key = r.owner.toLowerCase();
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  holdingsByAddress = map;
  lastRefresh = Date.now();
}

export function getHolderCount(address: string): number {
  return holdingsByAddress.get(address.toLowerCase()) ?? 0;
}

export function getAllHolders(): Map<string, number> {
  return new Map(holdingsByAddress);
}

export function getLastHoldersRefresh(): number {
  return lastRefresh;
}

export function getHoldersCount(): number {
  return holdingsByAddress.size;
}

export function getTotalNftCount(): number {
  let total = 0;
  for (const count of holdingsByAddress.values()) total += count;
  return total;
}
