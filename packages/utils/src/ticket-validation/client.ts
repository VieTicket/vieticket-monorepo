import * as ed25519 from '@noble/ed25519';
import type { TicketValidationPayload, SignedTicketData } from './types';
import QRCode, { QRCodeSegment } from 'qrcode';
import { pack, unpack } from 'msgpackr';

/**
 * Decodes and validates ticket QR data
 * @param qrData - Base64url encoded BSON string from QR code
 *
 * @returns Decoded ticket payload if valid, null if invalid or signature verification fails
 *
 * Safe to be used on client side
 */

export function decodeTicketQRData(qrData: Uint8Array | string): TicketValidationPayload | null {
  try {
    // Handle both binary and string formats
    let binaryData: Uint8Array;
    if (typeof qrData === 'string') {
      // Legacy base64url format
      binaryData = base64UrlToUint8Array(qrData);
    } else {
      // Binary format
      binaryData = qrData;
    }

    // Deserialize MessagePack
    const signedData = unpack(binaryData) as SignedTicketData;

    // Get public key from environment (hex string)
    const publicKeyHex = process.env.NEXT_PUBLIC_TICKET_SIGNING_PUBLIC_KEY || process.env.TICKET_SIGNING_PUBLIC_KEY;
    if (!publicKeyHex) {
      console.error('NEXT_PUBLIC_TICKET_SIGNING_PUBLIC_KEY environment variable not set');
      return null;
    }

    // Convert payload to bytes for verification using MessagePack
    const message = pack(signedData.payload);
    const signature = new Uint8Array(Buffer.from(signedData.signature, 'hex'));

    // Verify signature
    const isValid = ed25519.verify(signature, message, publicKeyHex);

    if (!isValid) {
      console.error('Invalid ticket signature');
      return null;
    }

    return signedData.payload;
  } catch (error) {
    console.error('Error decoding ticket QR data:', error);
    return null;
  }
}

/**
 * Generates a QR code image from ticket data (optimized for byte mode)
 * @param qrData - The ticket QR data (Uint8Array or string)
 * @returns Promise<string> - Data URL of the QR code image
 */
export async function generateQRCodeImage(qrData: Uint8Array | string): Promise<string> {
  try {
    // Pass raw binary data directly for byte mode, or string for other modes
    const dataToEncode: string | QRCodeSegment[] = typeof qrData === 'string' 
      ? qrData 
      : [{ data: qrData, mode: 'byte' }];

    return await QRCode.toDataURL(dataToEncode, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return `data:image/svg+xml;base64,${Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <rect width="200" height="200" fill="white" stroke="black"/>
        <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12">
          QR Error
        </text>
      </svg>
    `).toString('base64')}`;
  }
}

/**
 * Helper to convert a base64url string to a Uint8Array.
 * This replaces the need for Buffer.from(str, 'base64url').
 * @param input The base64url encoded string
 * @returns A Uint8Array
 */
function base64UrlToUint8Array(input: string): Uint8Array {
  // Replace URL-safe characters with standard Base64 characters
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with '=' characters if necessary
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  // Decode from base64 to a binary string
  const binaryString = atob(padded);
  // Convert the binary string to a Uint8Array
  const uint8Array = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }
  return uint8Array;
}