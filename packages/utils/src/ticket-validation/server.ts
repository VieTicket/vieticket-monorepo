import * as ed25519 from '@noble/ed25519';
import type { SignedTicketData, TicketValidationPayload } from './types';
import { pack } from 'msgpackr/pack';

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
export function generateTicketQRData(
  ticketId: string,
  visitorName: string,
  event: { id: string; name: string },
  seat: { id: string; number: string },
  row: { id: string; name: string },
  area: { id: string; name: string }
): Uint8Array {
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

  // Use MessagePack for signing instead of JSON
  const message = pack(payload);

  // Create signature
  const signature = ed25519.sign(message, privateKeyHex);

  const signedData: SignedTicketData = {
    payload,
    signature: Buffer.from(signature).toString('hex')
  };

  // Serialize to MessagePack and return as binary
  const packedData = pack(signedData);
  return new Uint8Array(packedData);
}

/**
 * Utility function to generate Ed25519 key pair for development/setup
 * @returns Object containing hex-encoded private and public keys
 */
export function generateEd25519KeyPair(): { privateKey: string; publicKey: string } {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privateKey);

  return {
    privateKey: Buffer.from(privateKey).toString('hex'),
    publicKey: Buffer.from(publicKey).toString('hex')
  };
}