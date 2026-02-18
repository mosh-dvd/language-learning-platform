// Simple in-memory token blacklist
// In production, this should use Redis for distributed systems
export class TokenBlacklistService {
  private blacklist: Set<string> = new Set();

  addToken(token: string): void {
    this.blacklist.add(token);
  }

  isBlacklisted(token: string): boolean {
    return this.blacklist.has(token);
  }

  // Clean up expired tokens periodically
  cleanup(expirationTime: number): void {
    // In a real implementation with Redis, we'd use TTL
    // For in-memory, we'd need to track token expiration times
    // This is a simplified version
  }
}

export const tokenBlacklist = new TokenBlacklistService();
