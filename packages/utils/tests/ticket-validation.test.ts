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
        eventId: string; // Changed from event object to eventId
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
        console.log('🔧 Setting up test environment...');

        // Store original environment variables
        originalEnv = {
            TICKET_SIGNING_PRIVATE_KEY: process.env.TICKET_SIGNING_PRIVATE_KEY,
            NEXT_PUBLIC_TICKET_SIGNING_PUBLIC_KEY: process.env.NEXT_PUBLIC_TICKET_SIGNING_PUBLIC_KEY
        };

        // Generate test keys
        testKeys = generateEd25519KeyPair();
        console.log('🔑 Generated test keys:', {
            privateKey: testKeys.privateKey,
            publicKey: testKeys.publicKey
        });

        // Sample ticket data - updated to use eventId instead of event object
        sampleTicketData = {
            ticketId: crypto.randomUUID(),
            visitorName: 'Ngo Tran Xuan Hoa',
            eventId: crypto.randomUUID(), 
            seat: { id: crypto.randomUUID(), number: '07' },
            row: { id: crypto.randomUUID(), name: 'R17A' },
            area: { id: crypto.randomUUID(), name: 'Premium Economy' }
        };
        console.log('📋 Sample ticket data created:', JSON.stringify(sampleTicketData, null, 2));
    });

    beforeEach(() => {
        // Set up clean environment variables before each test
        process.env.TICKET_SIGNING_PRIVATE_KEY = testKeys.privateKey;
        process.env.NEXT_PUBLIC_TICKET_SIGNING_PUBLIC_KEY = testKeys.publicKey;
        console.log('✅ Environment variables reset for test');
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

        console.log('🧹 Environment variables restored after test');
    });

    describe('generateEd25519KeyPair', () => {
        it('should generate valid key pair', () => {
            console.log('🧪 Testing key pair generation...');
            const keyPair = generateEd25519KeyPair();
            console.log('🔑 Generated key pair:', JSON.stringify({
                privateKey: keyPair.privateKey,
                publicKey: keyPair.publicKey
            }, null, 2));

            expect(keyPair).toHaveProperty('privateKey');
            expect(keyPair).toHaveProperty('publicKey');
            expect(typeof keyPair.privateKey).toBe('string');
            expect(typeof keyPair.publicKey).toBe('string');
            expect(keyPair.privateKey).toHaveLength(64); // 32 bytes * 2 (hex)
            expect(keyPair.publicKey).toHaveLength(64); // 32 bytes * 2 (hex)

            // Should be valid hex strings
            expect(() => Buffer.from(keyPair.privateKey, 'hex')).not.toThrow();
            expect(() => Buffer.from(keyPair.publicKey, 'hex')).not.toThrow();
            console.log('✅ Key pair validation passed');
        });

        it('should generate different keys on each call', () => {
            console.log('🧪 Testing key pair uniqueness...');
            const keyPair1 = generateEd25519KeyPair();
            const keyPair2 = generateEd25519KeyPair();
            console.log('🔑 Generated two key pairs for comparison:');
            console.log('KeyPair1:', JSON.stringify(keyPair1, null, 2));
            console.log('KeyPair2:', JSON.stringify(keyPair2, null, 2));

            expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
            expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
            console.log('✅ Key pair uniqueness verified');
        });
    });

    describe('generateTicketQRData (maximum compression)', () => {
        it('should generate valid compressed binary QR data', () => {
            console.log('🧪 Testing compressed binary QR data generation...');
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId, // Just eventId now
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Generated compressed binary QR data length:', qrData.length);

            expect(qrData).toBeInstanceOf(Uint8Array);
            expect(qrData.length).toBeGreaterThan(0);
            console.log('✅ Compressed binary QR data generation passed');
        });

        it('should generate different QR data on each call (due to timestamp)', async () => {
            console.log('🧪 Testing QR data uniqueness with timestamps...');
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
            console.log('📱 Generated two compressed QR data arrays for comparison:');
            console.log('QRData1 length:', qrData1.length);
            console.log('QRData2 length:', qrData2.length);

            expect(qrData1).not.toEqual(qrData2);
            console.log('✅ QR data uniqueness verified');
        });

        it('should throw error when private key is missing', () => {
            console.log('🧪 Testing error handling for missing private key...');
            delete process.env.TICKET_SIGNING_PRIVATE_KEY;
            console.log('🔑 Removed private key from environment');

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

            console.log('✅ Error handling verified');
        });

        it('should include all required data in compressed payload', () => {
            console.log('🧪 Testing compressed payload structure...');
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
            console.log('📋 Decoded compressed structure - payload length:', compressedPayload.length, 'signature length:', signature.length);

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
            expect(compressedPayload[3]).toBeInstanceOf(Uint8Array); // eventId as binary UUID (no name)
            expect(compressedPayload[3]).toHaveLength(16); // UUID is 16 bytes
            expect(Array.isArray(compressedPayload[4])).toBe(true); // seat array
            expect(compressedPayload[4]).toHaveLength(2); // [seatId, seatNumber]

            console.log('✅ Compressed payload structure validation passed');
        });

        it('should be significantly smaller than uncompressed format', () => {
            console.log('🧪 Testing compression efficiency...');
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

            console.log('📊 Compressed data size:', qrData.length, 'bytes');
            console.log('📊 Estimated uncompressed size:', uncompressedSize, 'bytes');
            console.log('📊 Compression ratio:', ((uncompressedSize - qrData.length) / uncompressedSize * 100).toFixed(1), '%');

            // Should be at least 50% smaller
            expect(qrData.length).toBeLessThan(uncompressedSize * 0.5);
            console.log('✅ Compression efficiency verified');
        });
    });

    describe('decodeTicketQRData (maximum compression)', () => {
        it('should decode compressed QR data correctly and return public API format', () => {
            console.log('🧪 Testing compressed QR data decoding...');
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Generated compressed QR data for decoding test, length:', qrData.length);

            const decoded = decodeTicketQRData(qrData);
            console.log('📋 Decoded data:', JSON.stringify(decoded, null, 2));

            expect(decoded).not.toBeNull();
            expect(decoded!.ticketId).toBe(sampleTicketData.ticketId);
            expect(decoded!.visitorName).toBe(sampleTicketData.visitorName);
            expect(decoded!.eventId).toBe(sampleTicketData.eventId); // Just eventId now
            expect(decoded!.seat).toEqual(sampleTicketData.seat);
            expect(decoded!.row).toEqual(sampleTicketData.row);
            expect(decoded!.area).toEqual(sampleTicketData.area);
            expect(typeof decoded!.timestamp).toBe('number');
            console.log('✅ Compressed QR data decoding validation passed');
        });

        it('should return null for invalid compressed binary data', () => {
            console.log('🧪 Testing invalid compressed binary data handling...');
            const invalidBinary = new Uint8Array([1, 2, 3, 4, 5]); // Invalid MessagePack
            console.log('📱 Invalid compressed binary data being tested, length:', invalidBinary.length);
            const decoded = decodeTicketQRData(invalidBinary);
            console.log('📋 Decoded result for invalid compressed binary:', decoded);
            expect(decoded).toBeNull();
            console.log('✅ Invalid compressed binary data handled correctly');
        });

        it('should return null when public key is missing', () => {
            console.log('🧪 Testing missing public key handling...');
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            delete process.env.NEXT_PUBLIC_TICKET_SIGNING_PUBLIC_KEY;
            console.log('🔑 Removed public key from environment');

            const decoded = decodeTicketQRData(qrData);
            console.log('📋 Decoded result without public key:', decoded);
            expect(decoded).toBeNull();
            console.log('✅ Missing public key handled correctly');
        });

        it('should return null for tampered compressed data (invalid signature)', () => {
            console.log('🧪 Testing tampered compressed data detection...');
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Original compressed QR data length:', qrData.length);

            // Decode, tamper with compressed payload, and re-encode
            const [compressedPayload, signature] = unpack(qrData) as any;

            // Tamper with the visitor name (index 2 in compressed array)
            console.log('🔧 Original visitor name:', compressedPayload[2]);
            compressedPayload[2] = 'tampered-visitor-name';
            console.log('🔧 Tampered visitor name:', compressedPayload[2]);

            const tamperedPacked = pack([compressedPayload, signature]);
            const tamperedQrData = new Uint8Array(tamperedPacked);
            console.log('📱 Tampered compressed QR data length:', tamperedQrData.length);

            const decoded = decodeTicketQRData(tamperedQrData);
            console.log('📋 Decoded result for tampered compressed data:', decoded);
            expect(decoded).toBeNull();
            console.log('✅ Tampered compressed data detected correctly');
        });

        it('should return null for data signed with different key', () => {
            console.log('🧪 Testing different key signature detection...');
            // Generate different key pair
            const differentKeys = generateEd25519KeyPair();
            console.log('🔑 Generated different key pair:', JSON.stringify(differentKeys, null, 2));

            // Set different private key
            const originalPrivateKey = process.env.TICKET_SIGNING_PRIVATE_KEY;
            process.env.TICKET_SIGNING_PRIVATE_KEY = differentKeys.privateKey;
            console.log('🔑 Set different private key:', differentKeys.privateKey);

            const qrDataWithDifferentKey = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Generated compressed QR data with different private key, length:', qrDataWithDifferentKey.length);

            // Restore original private key
            process.env.TICKET_SIGNING_PRIVATE_KEY = originalPrivateKey;
            console.log('🔑 Restored original private key');

            // Try to decode with original public key
            const decoded = decodeTicketQRData(qrDataWithDifferentKey);
            console.log('📋 Decoded result with mismatched keys:', decoded);
            expect(decoded).toBeNull();
            console.log('✅ Different key signature detected correctly');
        });
    });

    describe('generateQRCodeImage (compressed)', () => {
        it('should generate QR code image from compressed binary data', async () => {
            console.log('🧪 Testing QR code image generation from compressed binary...');
            const compressedData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Compressed data length:', compressedData.length);

            const qrImage = await generateQRCodeImage(compressedData);
            console.log('🖼️ Generated QR image (first 100 chars):', qrImage.substring(0, 100) + '...');

            console.log('\n\n' + qrImage);

            expect(typeof qrImage).toBe('string');
            expect(qrImage).toMatch(/^data:image\/png;base64,/);
            console.log('✅ Compressed QR code image generation passed');
        });
    });

    describe('Integration tests (maximum compression)', () => {
        it('should complete full compressed encode/decode cycle successfully', () => {
            console.log('🧪 Testing full compressed encode/decode integration...');
            console.log('📋 Using sample ticket data:', JSON.stringify(sampleTicketData, null, 2));

            // Generate compressed QR data
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Generated compressed QR data for integration test, length:', qrData.length);

            // Decode compressed QR data
            const decoded = decodeTicketQRData(qrData);
            console.log('📋 Integration test decoded data:', JSON.stringify(decoded, null, 2));

            // Verify all data matches original input exactly
            expect(decoded).not.toBeNull();
            expect(decoded!.ticketId).toBe(sampleTicketData.ticketId);
            expect(decoded!.visitorName).toBe(sampleTicketData.visitorName);
            expect(decoded!.eventId).toBe(sampleTicketData.eventId);
            expect(decoded!.seat).toEqual(sampleTicketData.seat);
            expect(decoded!.row).toEqual(sampleTicketData.row);
            expect(decoded!.area).toEqual(sampleTicketData.area);
            console.log('✅ Full compressed encode/decode cycle completed successfully');
        });

        it('should handle special characters in visitor names', () => {
            console.log('🧪 Testing special characters in visitor names...');
            const specialName = 'Ngô Trần Xuân Hoà & Sarah O\'Connor';
            console.log('👤 Special name:', specialName);

            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                specialName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Generated compressed QR data with special name, length:', qrData.length);

            const decoded = decodeTicketQRData(qrData);
            console.log('📋 Decoded special name result:', JSON.stringify(decoded, null, 2));

            expect(decoded).not.toBeNull();
            expect(decoded!.visitorName).toBe(specialName);
            console.log('✅ Special characters handled correctly in compression');
        });

        it('should verify timestamp is recent', () => {
            console.log('🧪 Testing timestamp accuracy...');
            const beforeGeneration = Date.now();
            console.log('⏰ Before generation timestamp:', beforeGeneration);

            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Generated compressed QR data, length:', qrData.length);

            const afterGeneration = Date.now();
            console.log('⏰ After generation timestamp:', afterGeneration);
            const decoded = decodeTicketQRData(qrData);
            console.log('⏰ Ticket timestamp:', decoded?.timestamp);
            console.log('📋 Full decoded data with timestamp:', JSON.stringify(decoded, null, 2));

            expect(decoded).not.toBeNull();
            expect(decoded!.timestamp).toBeGreaterThanOrEqual(beforeGeneration);
            expect(decoded!.timestamp).toBeLessThanOrEqual(afterGeneration);
            console.log('✅ Timestamp accuracy verified');
        });

        it('should verify maximum compression benefits with event name removal', () => {
            console.log('🧪 Testing maximum compression benefits with event name removal...');

            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            console.log('📊 Final compressed size:', qrData.length, 'bytes');
            console.log('📊 Compression features applied:');
            console.log('  ✅ Binary signature (32 bytes vs 64 hex chars)');
            console.log('  ✅ Array format (no field names)');
            console.log('  ✅ UUID compression (16 bytes vs 36 chars each)');
            console.log('  ✅ Event name removal (ID only, inspector looks up name)');
            console.log('  ✅ MessagePack encoding');
            console.log('  ✅ QR byte mode');

            // Should be even more compact now (typically under 180 bytes)
            expect(qrData.length).toBeLessThan(220);
            console.log('✅ Maximum compression with event name removal achieved');
        });

        it('should handle edge case: minimal data', () => {
            console.log('🧪 Testing edge case with minimal data...');

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
            console.log('📱 Minimal data compressed size:', qrData.length, 'bytes');
            console.log('✅ Minimal data compression handled correctly');
        });
    });

    describe('Edge cases (maximum compression)', () => {
        it('should handle empty visitor name', () => {
            console.log('🧪 Testing empty visitor name handling...');
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
            console.log('✅ Empty visitor name handled correctly');
        });

        it('should handle very large seat numbers', () => {
            console.log('🧪 Testing large seat numbers...');
            const largeSeatNumber = '99999999';
            console.log('💺 Large seat number:', largeSeatNumber);

            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.eventId,
                { id: sampleTicketData.seat.id, number: largeSeatNumber },
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Generated compressed QR data with large seat number, length:', qrData.length);

            const decoded = decodeTicketQRData(qrData);
            console.log('📋 Decoded large seat number result:', JSON.stringify(decoded, null, 2));

            expect(decoded).not.toBeNull();
            expect(decoded!.seat.number).toBe(largeSeatNumber);
            console.log('✅ Large seat numbers handled correctly');
        });
    });
});