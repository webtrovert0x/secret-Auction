import { StoredCommitment } from './types';

const VAULT_KEY = 'BOT_SECRET_AUCTION_VAULT_V1';

export function getStoredCommitments(): StoredCommitment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCommitment(commitment: StoredCommitment): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getStoredCommitments();
    // Filter out existing for same auction & bidder
    const filtered = all.filter(
      (c) =>
        !(
          c.auctionAddress.toLowerCase() === commitment.auctionAddress.toLowerCase() &&
          c.bidderAddress.toLowerCase() === commitment.bidderAddress.toLowerCase()
        )
    );
    filtered.push(commitment);
    localStorage.setItem(VAULT_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to save commitment to vault', err);
  }
}

export function getCommitmentForAuction(
  auctionAddress: string,
  bidderAddress?: string
): StoredCommitment | undefined {
  if (!auctionAddress) return undefined;
  const all = getStoredCommitments();
  return all.find(
    (c) =>
      c.auctionAddress.toLowerCase() === auctionAddress.toLowerCase() &&
      (!bidderAddress || c.bidderAddress.toLowerCase() === bidderAddress.toLowerCase())
  );
}

export function markCommitmentRevealed(
  auctionAddress: string,
  bidderAddress: string
): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getStoredCommitments();
    const updated = all.map((c) => {
      if (
        c.auctionAddress.toLowerCase() === auctionAddress.toLowerCase() &&
        c.bidderAddress.toLowerCase() === bidderAddress.toLowerCase()
      ) {
        return { ...c, revealed: true };
      }
      return c;
    });
    localStorage.setItem(VAULT_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to mark revealed in vault', err);
  }
}
