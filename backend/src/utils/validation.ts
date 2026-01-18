/**
 * Validation utilities for wallet addresses and other inputs
 */
import { PublicKey } from '@solana/web3.js';

/**
 * Validates that a string is a valid Solana wallet address.
 * @param address - The address string to validate
 * @returns true if valid, false otherwise
 */
export function isValidWalletAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  try {
    // PublicKey constructor validates the address format
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a wallet address and throws an error if invalid.
 * @param address - The address string to validate
 * @param fieldName - Name of the field for error messages
 * @throws Error if the address is invalid
 */
export function validateWalletAddress(address: string, fieldName = 'wallet'): void {
  if (!isValidWalletAddress(address)) {
    throw new Error(`Invalid ${fieldName} address: ${address}`);
  }
}

/**
 * Safely converts a string to a PublicKey after validation.
 * @param address - The address string to convert
 * @param fieldName - Name of the field for error messages
 * @returns A validated PublicKey
 * @throws Error if the address is invalid
 */
export function toValidatedPublicKey(address: string, fieldName = 'wallet'): PublicKey {
  validateWalletAddress(address, fieldName);
  return new PublicKey(address);
}

/**
 * Converts an optional string to a PublicKey if provided and valid.
 * @param address - The optional address string
 * @param fieldName - Name of the field for error messages
 * @returns PublicKey if address is provided and valid, null otherwise
 * @throws Error if the address is provided but invalid
 */
export function toOptionalPublicKey(address: string | undefined | null, fieldName = 'address'): PublicKey | null {
  if (!address) {
    return null;
  }
  return toValidatedPublicKey(address, fieldName);
}
