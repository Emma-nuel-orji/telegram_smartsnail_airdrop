/**
 * Truncate a blockchain address to show only the beginning and the end.
 * Example: "0x1234567890abcdef" becomes "0x123...def"
 *
 * @param address - The full blockchain address to format.
 * @param length - The number of characters to display from the start and end.
 *                 Defaults to 6.
 * @returns The formatted address string.
 */
export function formatAddress(address: string, length: number = 4): string {
    if (!address || address.length <= length * 2) {
      return address; // Return the full address if it's already short.
    }
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }
  