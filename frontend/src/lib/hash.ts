import { encodePacked, keccak256, parseEther } from 'viem';

/**
 * Generate Keccak256 commitment hash
 * Formula: keccak256(abi.encodePacked(uint256 amount, string secret, address bidder))
 */
export function generateCommitmentHash(
  amountInWei: bigint,
  secret: string,
  bidderAddress: `0x${string}`
): `0x${string}` {
  return keccak256(
    encodePacked(
      ['uint256', 'string', 'address'],
      [amountInWei, secret, bidderAddress]
    )
  );
}

/**
 * Convenience wrapper converting BOT string to wei before hashing
 */
export function computeCommitment(
  botAmount: string,
  secret: string,
  bidderAddress: string
): { hash: `0x${string}`; amountWei: bigint } {
  try {
    const amountWei = parseEther(botAmount || '0');
    const hash = generateCommitmentHash(
      amountWei,
      secret || '',
      (bidderAddress || '0x0000000000000000000000000000000000000000') as `0x${string}`
    );
    return { hash, amountWei };
  } catch (err) {
    return {
      hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      amountWei: BigInt(0),
    };
  }
}

/**
 * Generate a random cyber secret phrase (e.g. "neon-quantum-hawk-892")
 */
export function generateRandomSecret(): string {
  const adjectives = ['cyber', 'neon', 'crypto', 'quantum', 'secret', 'stealth', 'shadow', 'matrix', 'bot', 'hyper'];
  const nouns = ['vault', 'cipher', 'protocol', 'enigma', 'core', 'token', 'phantom', 'signal', 'node', 'vector'];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${randomAdj}-${randomNoun}-${num}`;
}
