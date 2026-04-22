import CryptoJS from 'crypto-js';
import LZString from 'lz-string';

/**
 * DataPipeline Service
 * Implements a flow of: Object -> JSON -> Compress -> Encrypt -> Chunk
 * and reverse: Chunk[] -> Decrypt -> Decompress -> Parse -> Object
 */
export const dataPipeline = {
  // Step 1: Object to JSON (Translation/Translation into string)
  serialize: (data: any): string => {
    try {
      return JSON.stringify(data);
    } catch (error) {
      console.error('Serialization error:', error);
      throw new Error('Failed to serialize data');
    }
  },

  // Step 2: Compress
  compress: (text: string): string => {
    return LZString.compressToUTF16(text);
  },

  // Step 3: Encrypt
  encrypt: (text: string, secretKey: string): string => {
    return CryptoJS.AES.encrypt(text, secretKey).toString();
  },

  // Step 4: Chunk (Divide into pieces for easier/paged sending)
  chunk: (text: string, chunkSize: number = 100000): string[] => {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks;
  },

  /**
   * Complete Output Pipeline
   */
  pack: (data: any, key: string, chunkSize: number = 500000): string[] => {
    const serialized = dataPipeline.serialize(data);
    const compressed = dataPipeline.compress(serialized);
    const encrypted = dataPipeline.encrypt(compressed, key);
    return dataPipeline.chunk(encrypted, chunkSize);
  },

  /**
   * Complete Input Pipeline
   */
  unpack: (chunks: string[], key: string): any => {
    try {
      // Step 1: Unchunk (Join)
      const joined = chunks.join('');
      
      // Step 2: Decrypt
      const bytes = CryptoJS.AES.decrypt(joined, key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) throw new Error('Decryption failed or invalid key');

      // Step 3: Decompress
      const decompressed = LZString.decompressFromUTF16(decrypted);
      
      if (!decompressed) throw new Error('Decompression failed');

      // Step 4: Deserialize (Translate back to object)
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Unpack error:', error);
      throw new Error('Failed to unpack data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
};
