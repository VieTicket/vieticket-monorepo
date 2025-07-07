import QRCode from 'qrcode';
import { BSON } from 'bson';
import * as ed25519 from '@noble/ed25519';

export interface TicketValidationPayload {
  ticketId: string;
  timestamp: number;
  visitorName: string;
  event: { id: string; name: string };
  seat: { id: string; number: string };
  row: { id: string; name: string };
  area: { id: string; name: string };
}

interface SignedTicketData {
  payload: TicketValidationPayload;
  signature: string;
}

/**
 * Generates dynamic ticket QR data with Ed25519 signature
 * @param ticketId - The unique identifier for the ticket
 * @param visitorName - Name of the ticket holder
 * @param event - Event information with id and name
 * @param seat - Seat information with id and number
 * @param row - Row information with id and name
 * @param area - Area information with id and name
 * @returns Base64url encoded BSON string containing signed ticket data
 */
export async function generateTicketQRData(
  ticketId: string,
  visitorName: string,
  event: { id: string; name: string },
  seat: { id: string; number: string },
  row: { id: string; name: string },
  area: { id: string; name: string }
): Promise<string> {
  const payload: TicketValidationPayload = {
    ticketId,
    timestamp: Date.now(),
    visitorName,
    event,
    seat,
    row,
    area
  };

  // Get private key from environment (hex string)
  const privateKeyHex = process.env.TICKET_SIGNING_PRIVATE_KEY;
  if (!privateKeyHex) {
    throw new Error('TICKET_SIGNING_PRIVATE_KEY environment variable not set');
  }

  // Convert payload to bytes for signing
  const message = new TextEncoder().encode(JSON.stringify(payload));
  
  // Create signature
  const signature = await ed25519.sign(message, privateKeyHex);

  const signedData: SignedTicketData = {
    payload,
    signature: Buffer.from(signature).toString('hex')
  };

  // Serialize to BSON and encode to base64url
  const bsonData = BSON.serialize(signedData);
  return Buffer.from(bsonData).toString('base64url');
}

/**
 * Decodes and validates ticket QR data
 * @param qrData - Base64url encoded BSON string from QR code
 * @returns Decoded ticket payload if valid, null if invalid or signature verification fails
 */
export async function decodeTicketQRData(qrData: string): Promise<TicketValidationPayload | null> {
  try {
    // Decode from base64url and deserialize BSON
    const bsonBuffer = Buffer.from(qrData, 'base64url');
    const signedData = BSON.deserialize(bsonBuffer) as SignedTicketData;

    // Get public key from environment (hex string)
    const publicKeyHex = process.env.TICKET_SIGNING_PUBLIC_KEY;
    if (!publicKeyHex) {
      console.error('TICKET_SIGNING_PUBLIC_KEY environment variable not set');
      return null;
    }

    // Convert payload to bytes for verification
    const message = new TextEncoder().encode(JSON.stringify(signedData.payload));
    const signature = new Uint8Array(Buffer.from(signedData.signature, 'hex'));

    // Verify signature
    const isValid = await ed25519.verify(signature, message, publicKeyHex);

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
 * Generates a QR code image from ticket data
 * @param qrData - The ticket QR data string
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

/**
 * Utility function to generate Ed25519 key pair for development/setup
 * @returns Object containing hex-encoded private and public keys
 */
export async function generateEd25519KeyPair(): Promise<{ privateKey: string; publicKey: string }> {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = await ed25519.getPublicKey(privateKey);

  return {
    privateKey: Buffer.from(privateKey).toString('hex'),
    publicKey: Buffer.from(publicKey).toString('hex')
  };
}