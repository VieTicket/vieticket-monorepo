import * as ed25519 from '@noble/ed25519';
import type { TicketValidationPayload, CompressedTicketPayload, CompressedSignedData } from './types';
import QRCode from 'qrcode';
import { pack, unpack } from 'msgpackr';
import { sha512 } from '@noble/hashes/sha2';

// Configure synchronous SHA-512 for ed25519
ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

// Base64URL decoding utilities
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  // Restore padding
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

// UUID decompression utilities
function bytesToUuid(bytes: Uint8Array): string {
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
}

// Convert compressed format back to public API format
function decompressPayload(compressed: CompressedTicketPayload): TicketValidationPayload {
    return {
        ticketId: bytesToUuid(compressed[0]),
        timestamp: compressed[1],
        visitorName: compressed[2],
        eventId: bytesToUuid(compressed[3]),
        seat: compressed[4],  // Just the seat number/name
        row: compressed[5],   // Just the row name
        area: compressed[6]   // Just the area name
    };
}

/**
 * Decodes and validates ticket QR data from Base64URL format
 * @param qrData - Base64URL string from QR code
 * @returns Decoded ticket payload if valid, null if invalid or signature verification fails
 */
export function decodeTicketQRData(qrData: string): TicketValidationPayload | null {
    try {
        // Decode Base64URL to binary
        const binaryData = base64UrlToUint8Array(qrData.substring(3));
        
        // Deserialize MessagePack to compressed format
        const [compressedPayload, signature] = unpack(binaryData) as CompressedSignedData;

        // Get public key from environment (hex string)
        const publicKeyHex = process.env.NEXT_PUBLIC_TICKET_SIGNING_PUBLIC_KEY || process.env.TICKET_SIGNING_PUBLIC_KEY;
        if (!publicKeyHex) {
            console.error('NEXT_PUBLIC_TICKET_SIGNING_PUBLIC_KEY environment variable not set');
            return null;
        }

        // Convert compressed payload to bytes for verification using MessagePack
        const message = pack(compressedPayload);

        // Verify signature (signature is already Uint8Array)
        const isValid = ed25519.verify(signature, message, publicKeyHex);

        if (!isValid) {
            console.error('Invalid ticket signature');
            return null;
        }

        // Decompress payload back to public API format
        return decompressPayload(compressedPayload);
    } catch (error) {
        console.error('Error decoding ticket QR data:', error);
        return null;
    }
}

/**
 * Generates a QR code image from ticket data
 * @param qrData - The ticket QR data (Base64URL string)
 * @returns Promise<string> - Data URL of the QR code image
 */
export async function generateQRCodeImage(qrData: string): Promise<string> {
    try {
        return await QRCode.toDataURL(qrData, {
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