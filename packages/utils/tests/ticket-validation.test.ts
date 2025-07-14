import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'bun:test';
import {
    generateTicketQRData,
    generateEd25519KeyPair,
} from '../src/ticket-validation/server';
import { generateQRCodeImage } from '../src/ticket-validation/client';
import { decodeTicketQRData } from '../src/ticket-validation/client';
import { unpack, pack } from 'msgpackr';
import { TicketValidationPayload } from '../src/ticket-validation/types';

describe('ticket-validation', () => {
    let testKeys: { privateKey: string; publicKey: string };
    let sampleTicketData: Omit<TicketValidationPayload, 'timestamp'>;

    // Store original environment variables
    let originalEnv: {
        TICKET_SIGNING_PRIVATE_KEY?: string;
        NEXT_PUBLIC_TICKET_SIGNING_PUBLIC_KEY?: string;
    };

    beforeAll(() => {
        // Store original environment variables
        originalEnv = {
            TICKET_SIGNING_PRIVATE_KEY: process.env.TICKET_SIGNING_PRIVATE_KEY,
            NEXT_PUBLIC_TICKET_SIGNING_PUBLIC_KEY: process.env.NEXT_PUBLIC_TICKET_SIGNING_PUBLIC_KEY
        };

        // Generate test keys
        testKeys = generateEd25519KeyPair();

        // Sample ticket data
        sampleTicketData = {
            ticketId: crypto.randomUUID(),
            visitorName: 'Ngo Tran Xuan Hoa',
            eventId: crypto.randomUUID(), 
            seat: '07',           // Just seat number
            row: 'R17A',          // Just row name
            area: 'Premium Economy' // Just area name
        };
    });

    beforeEach(() => {
        // Set up clean environment variables before each test
        process.env.TICKET_SIGNING_PRIVATE_KEY = testKeys.privateKey;
        process.env.NEXT_PUBLIC_TICKET_SIGNING_PUBLIC_KEY = testKeys.publicKey;
    });

    afterEach(() => {
        // Restore environment variables after each test
        if (originalEnv.TICKET_SIGNING_PRIVATE_KEY !== undefined) {
            process.env.TICKET_SIGNING_PRIVATE_KEY = originalEnv.TICKET_SIGNING_PRIVATE_KEY;
        } else {
            delete process.env.TICKET_SIGNING_PRIVATE_KEY;
        }

        if (originalEnv.NEXT_PUBLIC_TICKET_SIGNING_PUBLIC_KEY !== undefined) {
            process.env.NEXT_PUBLIC_TICKET_SIGNING_PUBLIC_KEY = originalEnv.NEXT_PUBLIC_TICKET_SIGNING_PUBLIC_KEY;
        } else {
            delete process.env.NEXT_PUBLIC_TICKET_SIGNING_PUBLIC_KEY;
        }
    });

    describe('generateEd25519KeyPair', () => {
        it('generates valid key pair', () => {
            const keyPair = generateEd25519KeyPair();

            expect(keyPair).toHaveProperty('privateKey');
            expect(keyPair).toHaveProperty('publicKey');
            expect(typeof keyPair.privateKey).toBe('string');
            expect(typeof keyPair.publicKey).toBe('string');
            expect(keyPair.privateKey).toHaveLength(64); // 32 bytes * 2 (hex)
            expect(keyPair.publicKey).toHaveLength(64); // 32 bytes * 2 (hex)

            // Should be valid hex strings
            expect(() => Buffer.from(keyPair.privateKey, 'hex')).not.toThrow();
            expect(() => Buffer.from(keyPair.publicKey, 'hex')).not.toThrow();
        });

        it('generates different keys on each call', () => {
            const keyPair1 = generateEd25519KeyPair();
            const keyPair2 = generateEd25519KeyPair();

            expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
            expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
        });
    });

    describe('generateTicketQRData (Base64URL format)', () => {
        it('generates valid Base64URL QR data string', () => {
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            expect(typeof qrData).toBe('string');
            expect(qrData.length).toBeGreaterThan(0);
            
            // Should be valid Base64URL (no +, /, or = characters)
            expect(qrData).not.toMatch(/[+/=]/);
            
            // Should only contain Base64URL characters
            expect(qrData).toMatch(/^[A-Za-z0-9_-]+$/);
        });

        it('generates different QR data on each call due to timestamp', async () => {
            const qrData1 = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            // Wait a bit to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 10));

            const qrData2 = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            expect(qrData1).not.toBe(qrData2);
        });

        it('throws error when private key is missing', () => {
            delete process.env.TICKET_SIGNING_PRIVATE_KEY;

            expect(() => {
                generateTicketQRData(
                    sampleTicketData.ticketId,
                    sampleTicketData.visitorName,
                    sampleTicketData.eventId,
                    sampleTicketData.seat,
                    sampleTicketData.row,
                    sampleTicketData.area
                )
            }).toThrow('TICKET_SIGNING_PRIVATE_KEY environment variable not set');
        });

        it('includes all required data in compressed payload', () => {
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            ).substring(3);

            // Decode Base64URL to binary, then MessagePack to verify structure
            const base64 = qrData.replace(/-/g, '+').replace(/_/g, '/');
            const paddedBase64 = base64 + '='.repeat((4 - base64.length % 4) % 4);
            const binaryData = new Uint8Array(Buffer.from(paddedBase64, 'base64'));
            const [compressedPayload, signature] = unpack(binaryData) as any;

            // Verify compressed payload structure: [ticketId, timestamp, visitorName, eventId, seat, row, area]
            expect(Array.isArray(compressedPayload)).toBe(true);
            expect(compressedPayload).toHaveLength(7);

            // Verify signature is binary
            expect(signature).toBeInstanceOf(Uint8Array);
            expect(signature).toHaveLength(64); // Ed25519 signature is 64 bytes

            // Verify compressed payload contents
            expect(compressedPayload[0]).toBeInstanceOf(Uint8Array); // ticketId as binary UUID
            expect(compressedPayload[0]).toHaveLength(16); // UUID is 16 bytes
            expect(typeof compressedPayload[1]).toBe('number'); // timestamp
            expect(typeof compressedPayload[2]).toBe('string'); // visitorName
            expect(compressedPayload[3]).toBeInstanceOf(Uint8Array); // eventId as binary UUID
            expect(compressedPayload[3]).toHaveLength(16); // UUID is 16 bytes
            expect(typeof compressedPayload[4]).toBe('string'); // seat (just string)
            expect(typeof compressedPayload[5]).toBe('string'); // row (just string)
            expect(typeof compressedPayload[6]).toBe('string'); // area (just string)
        });

        it('produces significantly smaller output than uncompressed format', () => {
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            // Simulate uncompressed format (object with full field names and hex signature)
            const uncompressedSize = JSON.stringify({
                payload: sampleTicketData,
                signature: 'a'.repeat(128) // 64-byte signature as hex string
            }).length;

            // Base64URL adds 33% overhead, but should still be smaller than uncompressed JSON
            expect(qrData.length).toBeLessThan(uncompressedSize * 0.7);
        });
    });

    describe('decodeTicketQRData (Base64URL format)', () => {
        it('decodes Base64URL QR data correctly and returns public API format', () => {
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            const decoded = decodeTicketQRData(qrData);

            expect(decoded).not.toBeNull();
            expect(decoded!.ticketId).toBe(sampleTicketData.ticketId);
            expect(decoded!.visitorName).toBe(sampleTicketData.visitorName);
            expect(decoded!.eventId).toBe(sampleTicketData.eventId);
            expect(decoded!.seat).toBe(sampleTicketData.seat);
            expect(decoded!.row).toBe(sampleTicketData.row);
            expect(decoded!.area).toBe(sampleTicketData.area);
            expect(typeof decoded!.timestamp).toBe('number');
        });

        it('returns null for invalid Base64URL string', () => {
            const invalidString = 'invalid-base64url-string-with-invalid-chars@#$';
            const decoded = decodeTicketQRData(invalidString);
            expect(decoded).toBeNull();
        });

        it('returns null when public key is missing', () => {
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            delete process.env.NEXT_PUBLIC_TICKET_SIGNING_PUBLIC_KEY;

            const decoded = decodeTicketQRData(qrData);
            expect(decoded).toBeNull();
        });

        it('returns null for tampered Base64URL data with invalid signature', () => {
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            ).substring(3);

            // Decode Base64URL to binary, then MessagePack
            const base64 = qrData.replace(/-/g, '+').replace(/_/g, '/');
            const paddedBase64 = base64 + '='.repeat((4 - base64.length % 4) % 4);
            const binaryData = new Uint8Array(Buffer.from(paddedBase64, 'base64'));
            const [compressedPayload, signature] = unpack(binaryData) as any;
            
            // Tamper with payload
            compressedPayload[2] = 'tampered-visitor-name';

            // Re-encode to Base64URL
            const tamperedPacked = pack([compressedPayload, signature]);
            const tamperedBase64 = Buffer.from(tamperedPacked).toString('base64');
            const tamperedQrData = tamperedBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

            const decoded = decodeTicketQRData(tamperedQrData);
            expect(decoded).toBeNull();
        });

        it('returns null for data signed with different key', () => {
            // Generate different key pair
            const differentKeys = generateEd25519KeyPair();

            // Set different private key
            const originalPrivateKey = process.env.TICKET_SIGNING_PRIVATE_KEY;
            process.env.TICKET_SIGNING_PRIVATE_KEY = differentKeys.privateKey;

            const qrDataWithDifferentKey = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            // Restore original private key
            process.env.TICKET_SIGNING_PRIVATE_KEY = originalPrivateKey;

            // Try to decode with original public key
            const decoded = decodeTicketQRData(qrDataWithDifferentKey);
            expect(decoded).toBeNull();
        });
    });

    describe('generateQRCodeImage (Base64URL)', () => {
        it('generates QR code image from Base64URL string', async () => {
            const base64UrlData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            const qrImage = await generateQRCodeImage(base64UrlData);

            expect(typeof qrImage).toBe('string');
            expect(qrImage).toMatch(/^data:image\/png;base64,/);
        });
    });

    describe('Integration tests (Base64URL format)', () => {
        it('completes full Base64URL encode decode cycle successfully', () => {
            // Generate Base64URL QR data
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            // Decode Base64URL QR data
            const decoded = decodeTicketQRData(qrData);

            // Verify all data matches original input exactly
            expect(decoded).not.toBeNull();
            expect(decoded!.ticketId).toBe(sampleTicketData.ticketId);
            expect(decoded!.visitorName).toBe(sampleTicketData.visitorName);
            expect(decoded!.eventId).toBe(sampleTicketData.eventId);
            expect(decoded!.seat).toBe(sampleTicketData.seat);
            expect(decoded!.row).toBe(sampleTicketData.row);
            expect(decoded!.area).toBe(sampleTicketData.area);
        });

        it('handles special characters in visitor names', () => {
            const specialName = 'Ngô Trần Xuân Hoà & Sarah O\'Connor';

            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                specialName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            const decoded = decodeTicketQRData(qrData);

            expect(decoded).not.toBeNull();
            expect(decoded!.visitorName).toBe(specialName);
        });

        it('verifies timestamp is recent', () => {
            const beforeGeneration = Date.now();

            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            const afterGeneration = Date.now();
            const decoded = decodeTicketQRData(qrData);

            expect(decoded).not.toBeNull();
            expect(decoded!.timestamp).toBeGreaterThanOrEqual(beforeGeneration);
            expect(decoded!.timestamp).toBeLessThanOrEqual(afterGeneration);
        });

        it('verifies Base64URL compression benefits with event name removal', () => {
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            // Should be compact (typically under 300 characters for Base64URL)
            expect(qrData.length).toBeLessThan(300);
        });

        it('handles edge case with minimal data', () => {
            // Use minimal data to test compression
            const minimalData = {
                ticketId: '00000000-0000-0000-0000-000000000001',
                visitorName: 'A',
                eventId: '00000000-0000-0000-0000-000000000002',
                seat: '1',
                row: 'A',
                area: 'X'
            };

            const qrData = generateTicketQRData(
                minimalData.ticketId,
                minimalData.visitorName,
                minimalData.eventId,
                minimalData.seat,
                minimalData.row,
                minimalData.area
            );

            const decoded = decodeTicketQRData(qrData);

            expect(decoded).not.toBeNull();
            expect(decoded!.ticketId).toBe(minimalData.ticketId);
            expect(decoded!.visitorName).toBe(minimalData.visitorName);
            expect(decoded!.eventId).toBe(minimalData.eventId);
        });
    });

    describe('Edge cases (Base64URL format)', () => {
        it('handles empty visitor name', () => {
            const emptyNameData = {
                ticketId: '00000000-0000-0000-0000-000000000001',
                visitorName: '',
                eventId: '00000000-0000-0000-0000-000000000002',
                seat: '07',
                row: 'R17A',
                area: 'Premium'
            };

            const qrData = generateTicketQRData(
                emptyNameData.ticketId,
                emptyNameData.visitorName,
                emptyNameData.eventId,
                emptyNameData.seat,
                emptyNameData.row,
                emptyNameData.area
            );

            const decoded = decodeTicketQRData(qrData);

            expect(decoded).not.toBeNull();
            expect(decoded!.visitorName).toBe('');
        });

        it('handles very large seat numbers', () => {
            const largeSeatNumber = '99999999';

            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                largeSeatNumber,
                sampleTicketData.row,
                sampleTicketData.area
            );

            const decoded = decodeTicketQRData(qrData);

            expect(decoded).not.toBeNull();
            expect(decoded!.seat).toBe(largeSeatNumber);
        });

        it('validates Base64URL format requirements', () => {
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            // Should not contain Base64 padding or unsafe characters
            expect(qrData).not.toMatch(/[+=\/]/);
            
            // Should only contain URL-safe Base64 characters
            expect(qrData).toMatch(/^[A-Za-z0-9_-]+$/);
        });
    });
});