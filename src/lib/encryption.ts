// src/lib/encryption.ts
// Web Crypto API implementation for AES-GCM


// Convert hex string to Uint8Array
function hexToUint8Array(hexString: string): Uint8Array {
  const match = hexString.match(/.{1,2}/g);
  if (!match) return new Uint8Array(0);
  return new Uint8Array(match.map(byte => parseInt(byte, 16)));
}

// Convert Base64 string to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  // Handle URL-safe base64 if needed
  const normalizedBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalizedBase64.length % 4)) % 4);
  const base64WithPadding = normalizedBase64 + padding;

  const binaryString = atob(base64WithPadding);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Convert Uint8Array to Base64 string
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  uint8Array.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
}

// Convert hex string to ArrayBuffer
function hexToArrayBuffer(hex: string): ArrayBuffer | any {
  const bytes = hexToUint8Array(hex);
  return bytes.buffer;
}

// Import key from hex string
async function importKey(hexKey: string): Promise<CryptoKey> {
  const keyBytes: any = hexToUint8Array(hexKey);

  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    {
      name: 'AES-GCM',
      length: 256
    },
    false, // not extractable
    ['encrypt', 'decrypt']
  );
}

// Encrypt data using Web Crypto API
export async function encryptData(data: any, sessionKeyHex: string): Promise<string> {
  try {
    console.log('🔐 Encrypting data with session key length:', sessionKeyHex.length);

    // Convert data to JSON and then to Uint8Array
    const plainText = JSON.stringify(data);
    const plainTextBytes = new TextEncoder().encode(plainText);

    // Import key
    const key = await importKey(sessionKeyHex);

    // Generate random 12-byte IV (96 bits for GCM) - matching Python's 12 bytes
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt with AES-GCM
    const encryptedBytes = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128 // 16 bytes tag (GCM default)
      },
      key,
      plainTextBytes
    );

    // Web Crypto API returns ciphertext + tag concatenated
    // Tag is the last 16 bytes
    const encrypted = new Uint8Array(encryptedBytes);
    const tag = encrypted.slice(-16);
    const ciphertext = encrypted.slice(0, -16);

    // Return in same format as Python: {iv, ciphertext, tag} as base64
    const result = JSON.stringify({
      iv: uint8ArrayToBase64(iv),
      ciphertext: uint8ArrayToBase64(ciphertext),
      tag: uint8ArrayToBase64(tag)
    });

    console.log('✅ Encryption successful');
    return result;
  } catch (error: any) {
    console.error('❌ Encryption error:', error);
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

// Decrypt data using Web Crypto API
export async function decryptData(encryptedJsonStr: string, sessionKeyHex: string): Promise<any> {
  try {
    console.log('🔓 Decrypting data with session key length:', sessionKeyHex.length);

    console.log("Using sessionKey:", sessionKeyHex);

    // Parse the encrypted data
    const encryptedData = JSON.parse(encryptedJsonStr);

    // Validate required fields
    if (!encryptedData.iv || !encryptedData.ciphertext || !encryptedData.tag) {
      throw new Error('Missing required encryption fields (iv, ciphertext, or tag)');
    }

    // Convert from Base64 to Uint8Array
    const iv: any = base64ToUint8Array(encryptedData.iv);
    const ciphertext = base64ToUint8Array(encryptedData.ciphertext);
    const tag = base64ToUint8Array(encryptedData.tag);

    // Validate lengths
    if (iv.length !== 12) {
      console.warn(`⚠️ IV length is ${iv.length}, expected 12 bytes`);
    }

    if (tag.length !== 16) {
      console.warn(`⚠️ Tag length is ${tag.length}, expected 16 bytes`);
    }

    // Combine ciphertext and tag (as required by Web Crypto API)
    const combined = new Uint8Array(ciphertext.length + tag.length);
    combined.set(ciphertext);
    combined.set(tag, ciphertext.length);

    // Import key
    const key = await importKey(sessionKeyHex);

    // Decrypt
    const decryptedBytes = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      key,
      combined
    );

    // Convert to string and parse JSON
    const decryptedText = new TextDecoder().decode(decryptedBytes);
    const result = JSON.parse(decryptedText);

    console.log('✅ Decryption successful');
    return result;
  } catch (error: any) {
    console.error('❌ Decryption error:', error);

    // Provide more helpful error messages
    if (error.message?.includes('MAC verification failed')) {
      throw new Error('Decryption failed: Invalid authentication tag (data may have been tampered with)');
    } else if (error.message?.includes('key')) {
      throw new Error('Decryption failed: Invalid session key');
    } else {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
}

// Helper to check if response is encrypted
export function isEncryptedResponse(response: any): boolean {
  if (!response || typeof response !== 'object') return false;

  // Check if it has a 'response' property that is a string
  if (!('response' in response) || typeof response.response !== 'string') {
    return false;
  }

  try {
    // Try to parse the inner JSON
    const innerData = JSON.parse(response.response);

    // Check if it has the required GCM fields
    return (
      innerData &&
      typeof innerData === 'object' &&
      'iv' in innerData &&
      'ciphertext' in innerData &&
      'tag' in innerData &&
      typeof innerData.iv === 'string' &&
      typeof innerData.ciphertext === 'string' &&
      typeof innerData.tag === 'string'
    );
  } catch {
    // If it fails to parse, it's not our encrypted format
    return false;
  }
}

// For debugging: inspect response structure
export function inspectEncryptedResponse(response: any): void {
  console.group('🔐 Encrypted Response Inspection');
  console.log('Has response property:', 'response' in response);
  console.log('Response type:', typeof response.response);

  if (typeof response.response === 'string') {
    console.log('Response preview:', response.response.substring(0, 100) + '...');

    try {
      const innerData = JSON.parse(response.response);
      console.log('Inner data keys:', Object.keys(innerData));
      console.log('Has iv:', 'iv' in innerData);
      console.log('Has ciphertext:', 'ciphertext' in innerData);
      console.log('Has tag:', 'tag' in innerData);

      if (innerData.iv) console.log('IV length:', innerData.iv.length);
      if (innerData.ciphertext) console.log('Ciphertext length:', innerData.ciphertext.length);
      if (innerData.tag) console.log('Tag length:', innerData.tag.length);

      // Try to decode base64 lengths
      try {
        if (innerData.iv) {
          const ivBytes = base64ToUint8Array(innerData.iv);
          console.log('IV bytes length:', ivBytes.length);
        }
        if (innerData.tag) {
          const tagBytes = base64ToUint8Array(innerData.tag);
          console.log('Tag bytes length:', tagBytes.length);
        }
      } catch (e) {
        console.log('Could not decode base64:', e);
      }
    } catch (e) {
      console.log('Failed to parse inner JSON:', e);
    }
  }
  console.groupEnd();
}