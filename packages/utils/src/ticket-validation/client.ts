import * as ed25519 from '@noble/ed25519';
import type { TicketValidationPayload, CompressedTicketPayload, CompressedSignedData } from './types';
import QRCode, { QRCodeSegment } from 'qrcode';
import { pack, unpack } from 'msgpackr';

// UUID decompression utilities
function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
}

// Convert compressed format back to public API format
function decompressPayload(compressed: CompressedTicketPayload): TicketValidationPayload {
  return {
    ticketId: bytesToUuid(compressed[0]),
    timestamp: compressed[1],
    visitorName: compressed[2],
    event: {
      id: bytesToUuid(compressed[3][0]),
      name: compressed[3][1]
    },
    seat: {
      id: bytesToUuid(compressed[4][0]),
      number: compressed[4][1]
    },
    row: {
      id: bytesToUuid(compressed[5][0]),
      name: compressed[5][1]
    },
    area: {
      id: bytesToUuid(compressed[6][0]),
      name: compressed[6][1]
    }
  };
}

/**
 * Decodes and validates ticket QR data from binary format
 * @param qrData - Uint8Array from QR code
 * @returns Decoded ticket payload if valid, null if invalid or signature verification fails
 */
export function decodeTicketQRData(qrData: Uint8Array): TicketValidationPayload | null {
  try {
    // Deserialize MessagePack to compressed format
    const [compressedPayload, signature] = unpack(qrData) as CompressedSignedData;

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
