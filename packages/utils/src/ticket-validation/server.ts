import * as ed25519 from '@noble/ed25519';
import type { TicketValidationPayload, CompressedTicketPayload, CompressedSignedData } from './types';
import { pack } from 'msgpackr/pack';
import { sha512 } from '@noble/hashes/sha2';

// Configure synchronous SHA-512 for ed25519
ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

// UUID compression utilities
function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Convert public API format to compressed format
function compressPayload(payload: TicketValidationPayload): CompressedTicketPayload {
  return [
    uuidToBytes(payload.ticketId),
    payload.timestamp,
    payload.visitorName,
    uuidToBytes(payload.eventId), // Just store eventId as binary, no name
    [uuidToBytes(payload.seat.id), payload.seat.number],
    [uuidToBytes(payload.row.id), payload.row.name],
    [uuidToBytes(payload.area.id), payload.area.name]
  ];
}

/**
 * Generates dynamic ticket QR data with Ed25519 signature (maximum compression)
 * @param ticketId - The unique identifier for the ticket
 * @param visitorName - Name of the ticket holder
 * @param eventId - Event identifier (name can be looked up by inspector)
 * @param seat - Seat information with id and number
 * @param row - Row information with id and name
 * @param area - Area information with id and name
 * @returns Uint8Array containing signed ticket data for QR byte mode
 */
export function generateTicketQRData(
  ticketId: string,
  visitorName: string,
  eventId: string, // Changed from event object to just eventId
  seat: { id: string; number: string },
  row: { id: string; name: string },
  area: { id: string; name: string }
): Uint8Array {
  const payload: TicketValidationPayload = {
    ticketId,
    timestamp: Date.now(),
    visitorName,
    eventId, // Just store the ID
    seat,
    row,
    area
  };

  // Get private key from environment (hex string)
  const privateKeyHex = process.env.TICKET_SIGNING_PRIVATE_KEY;
  if (!privateKeyHex) {
    throw new Error('TICKET_SIGNING_PRIVATE_KEY environment variable not set');
  }

  // Compress payload to array format with binary UUIDs
  const compressedPayload = compressPayload(payload);

  // Use MessagePack for signing
  const message = pack(compressedPayload);

  // Create signature
  const signature = ed25519.sign(message, privateKeyHex);

  // Create compressed signed data (array format with binary signature)
  const compressedSignedData: CompressedSignedData = [
    compressedPayload,
    new Uint8Array(signature)
  ];

  // Serialize to MessagePack and return as binary
  const packedData = pack(compressedSignedData);
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