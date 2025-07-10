import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'bun:test';
import {
    generateTicketQRData,
    generateEd25519KeyPair,
} from '../src/ticket-validation/server';
import { generateQRCodeImage } from '../src/ticket-validation/client';
import { decodeTicketQRData } from '../src/ticket-validation/client';
import { unpack, pack } from 'msgpackr';

describe('ticket-validation', () => {
    let testKeys: { privateKey: string; publicKey: string };
    let sampleTicketData: {
        ticketId: string;
        visitorName: string;
        eventId: string;
        seat: { id: string; number: string };
        row: { id: string; name: string };
        area: { id: string; name: string };
    };

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
            seat: { id: crypto.randomUUID(), number: '07' },
            row: { id: crypto.randomUUID(), name: 'R17A' },
            area: { id: crypto.randomUUID(), name: 'Premium Economy' }
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
        it('should generate valid key pair', () => {
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

        it('should generate different keys on each call', () => {
            const keyPair1 = generateEd25519KeyPair();
            const keyPair2 = generateEd25519KeyPair();

            expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
            expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
        });
    });

    describe('generateTicketQRData (maximum compression)', () => {
        it('should generate valid compressed binary QR data', () => {
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            expect(qrData).toBeInstanceOf(Uint8Array);
            expect(qrData.length).toBeGreaterThan(0);
        });

        it('should generate different QR data on each call (due to timestamp)', async () => {
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

            expect(qrData1).not.toEqual(qrData2);
        });

        it('should throw error when private key is missing', () => {
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

        it('should include all required data in compressed payload', () => {
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            // Decode to verify compressed payload structure
            const [compressedPayload, signature] = unpack(qrData) as any;

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
            expect(Array.isArray(compressedPayload[4])).toBe(true); // seat array
            expect(compressedPayload[4]).toHaveLength(2); // [seatId, seatNumber]
        });

        it('should be significantly smaller than uncompressed format', () => {
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

            // Should be at least 50% smaller
            expect(qrData.length).toBeLessThan(uncompressedSize * 0.5);
        });
    });

    describe('decodeTicketQRData (maximum compression)', () => {
        it('should decode compressed QR data correctly and return public API format', () => {
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
            expect(decoded!.seat).toEqual(sampleTicketData.seat);
            expect(decoded!.row).toEqual(sampleTicketData.row);
            expect(decoded!.area).toEqual(sampleTicketData.area);
            expect(typeof decoded!.timestamp).toBe('number');
        });

        it('should return null for invalid compressed binary data', () => {
            const invalidBinary = new Uint8Array([1, 2, 3, 4, 5]); // Invalid MessagePack
            const decoded = decodeTicketQRData(invalidBinary);
            expect(decoded).toBeNull();
        });

        it('should return null when public key is missing', () => {
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

        it('should return null for tampered compressed data (invalid signature)', () => {
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            // Decode, tamper with compressed payload, and re-encode
            const [compressedPayload, signature] = unpack(qrData) as any;
            compressedPayload[2] = 'tampered-visitor-name';

            const tamperedPacked = pack([compressedPayload, signature]);
            const tamperedQrData = new Uint8Array(tamperedPacked);

            const decoded = decodeTicketQRData(tamperedQrData);
            expect(decoded).toBeNull();
        });

        it('should return null for data signed with different key', () => {
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

    describe('generateQRCodeImage (compressed)', () => {
        it('should generate QR code image from compressed binary data', async () => {
            const compressedData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            const qrImage = await generateQRCodeImage(compressedData);

            expect(typeof qrImage).toBe('string');
            expect(qrImage).toMatch(/^data:image\/png;base64,/);
        });
    });

    describe('Integration tests (maximum compression)', () => {
        it('should complete full compressed encode/decode cycle successfully', () => {
            // Generate compressed QR data
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            // Decode compressed QR data
            const decoded = decodeTicketQRData(qrData);

            // Verify all data matches original input exactly
            expect(decoded).not.toBeNull();
            expect(decoded!.ticketId).toBe(sampleTicketData.ticketId);
            expect(decoded!.visitorName).toBe(sampleTicketData.visitorName);
            expect(decoded!.eventId).toBe(sampleTicketData.eventId);
            expect(decoded!.seat).toEqual(sampleTicketData.seat);
            expect(decoded!.row).toEqual(sampleTicketData.row);
            expect(decoded!.area).toEqual(sampleTicketData.area);
        });

        it('should handle special characters in visitor names', () => {
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

        it('should verify timestamp is recent', () => {
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

        it('should verify maximum compression benefits with event name removal', () => {
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            // Should be compact (typically under 220 bytes)
            expect(qrData.length).toBeLessThan(220);
        });

        it('should handle edge case: minimal data', () => {
            // Use minimal data to test compression
            const minimalData = {
                ticketId: '00000000-0000-0000-0000-000000000001',
                visitorName: 'A',
                eventId: '00000000-0000-0000-0000-000000000002',
                seat: { id: '00000000-0000-0000-0000-000000000003', number: '1' },
                row: { id: '00000000-0000-0000-0000-000000000004', name: 'A' },
                area: { id: '00000000-0000-0000-0000-000000000005', name: 'X' }
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

    describe('Edge cases (maximum compression)', () => {
        it('should handle empty visitor name', () => {
            const emptyNameData = {
                ticketId: '00000000-0000-0000-0000-000000000001',
                visitorName: '',
                eventId: '00000000-0000-0000-0000-000000000002',
                seat: { id: '00000000-0000-0000-0000-000000000003', number: '07' },
                row: { id: '00000000-0000-0000-0000-000000000004', name: 'R17A' },
                area: { id: '00000000-0000-0000-0000-000000000005', name: 'Premium' }
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

        it('should handle very large seat numbers', () => {
            const largeSeatNumber = '99999999';

            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                { id: sampleTicketData.seat.id, number: largeSeatNumber },
                sampleTicketData.row,
                sampleTicketData.area
            );

            const decoded = decodeTicketQRData(qrData);

            expect(decoded).not.toBeNull();
            expect(decoded!.seat.number).toBe(largeSeatNumber);
        });
    });
});