declare module 'imghash' {
  /**
   * Compute a perceptual hash for an image buffer.
   * @param data - Image buffer or file path
   * @param bits - Hash size (default: 8, common values: 8, 16, 32)
   * @param format - Output format ('hex' or 'binary', default: 'hex')
   * @returns Perceptual hash string
   */
  function hash(data: Buffer | string, bits?: number, format?: 'hex' | 'binary'): Promise<string>;

  /**
   * Compute the Hamming distance between two hashes.
   * Lower distance means more similar images.
   * @param hash1 - First hash
   * @param hash2 - Second hash
   * @returns Hamming distance (0 = identical)
   */
  function hammingDistance(hash1: string, hash2: string): number;

  export { hash, hammingDistance };
  export default { hash, hammingDistance };
}
