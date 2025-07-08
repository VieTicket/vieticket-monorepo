import { describe, it, expect, beforeAll, vi, beforeEach, afterEach } from 'vitest';
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
        event: { id: string; name: string };
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

        // Sample ticket data
        sampleTicketData = {
            ticketId: crypto.randomUUID(),
            visitorName: 'Ngo Tran Xuan Hoa',
            event: { id: crypto.randomUUID(), name: 'Festival Thanh Hoa 36' },
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

    describe('generateTicketQRData (binary)', () => {
        it('should generate valid binary QR data', () => {
            console.log('🧪 Testing binary QR data generation...');
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.event,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Generated binary QR data length:', qrData.length);

            expect(qrData).toBeInstanceOf(Uint8Array);
            expect(qrData.length).toBeGreaterThan(0);
            console.log('✅ Binary QR data generation passed');
        });

        it('should generate different QR data on each call (due to timestamp)', async () => {
            console.log('🧪 Testing QR data uniqueness with timestamps...');
            const qrData1 = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.event,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            // Wait a bit to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 10));

            const qrData2 = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.event,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Generated two binary QR data arrays for comparison:');
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
                    sampleTicketData.event,
                    sampleTicketData.seat,
                    sampleTicketData.row,
                    sampleTicketData.area
                )
            }).toThrow('TICKET_SIGNING_PRIVATE_KEY environment variable not set');

            console.log('✅ Error handling verified');
        });

        it('should include all required data in payload', () => {
            console.log('🧪 Testing payload structure...');
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.event,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );

            // Decode to verify payload structure using MessagePack
            const signedData = unpack(qrData) as any;
            console.log('📋 Decoded signed data:', JSON.stringify(signedData, null, 2));

            expect(signedData).toHaveProperty('payload');
            expect(signedData).toHaveProperty('signature');

            const payload = signedData.payload;
            console.log('📋 Full payload contents:', JSON.stringify(payload, null, 2));
            expect(payload.ticketId).toBe(sampleTicketData.ticketId);
            expect(payload.visitorName).toBe(sampleTicketData.visitorName);
            expect(payload.event).toEqual(sampleTicketData.event);
            expect(payload.seat).toEqual(sampleTicketData.seat);
            expect(payload.row).toEqual(sampleTicketData.row);
            expect(payload.area).toEqual(sampleTicketData.area);
            expect(typeof payload.timestamp).toBe('number');
            expect(payload.timestamp).toBeGreaterThan(0);
            console.log('✅ Payload structure validation passed');
        });
    });

    describe('decodeTicketQRData (binary)', () => {
        it('should decode binary QR data correctly', () => {
            console.log('🧪 Testing binary QR data decoding...');
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.event,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Generated binary QR data for decoding test, length:', qrData.length);

            const decoded = decodeTicketQRData(qrData);
            console.log('📋 Decoded data:', JSON.stringify(decoded, null, 2));

            expect(decoded).not.toBeNull();
            expect(decoded!.ticketId).toBe(sampleTicketData.ticketId);
            expect(decoded!.visitorName).toBe(sampleTicketData.visitorName);
            expect(decoded!.event).toEqual(sampleTicketData.event);
            expect(decoded!.seat).toEqual(sampleTicketData.seat);
            expect(decoded!.row).toEqual(sampleTicketData.row);
            expect(decoded!.area).toEqual(sampleTicketData.area);
            expect(typeof decoded!.timestamp).toBe('number');
            console.log('✅ Binary QR data decoding validation passed');
        });

        it('should return null for invalid binary data', () => {
            console.log('🧪 Testing invalid binary data handling...');
            const invalidBinary = new Uint8Array([1, 2, 3, 4, 5]); // Invalid MessagePack
            console.log('📱 Invalid binary data being tested, length:', invalidBinary.length);
            const decoded = decodeTicketQRData(invalidBinary);
            console.log('📋 Decoded result for invalid binary:', decoded);
            expect(decoded).toBeNull();
            console.log('✅ Invalid binary data handled correctly');
        });

        it('should return null when public key is missing', () => {
            console.log('🧪 Testing missing public key handling...');
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.event,
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

        it('should return null for tampered data (invalid signature)', () => {
            console.log('🧪 Testing tampered data detection...');
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.event,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Original binary QR data length:', qrData.length);

            // Decode, tamper with payload, and re-encode
            const signedData = unpack(qrData) as any;

            // Tamper with the ticket ID
            console.log('🔧 Original ticket ID:', signedData.payload.ticketId);
            signedData.payload.ticketId = 'tampered-ticket-id';
            console.log('🔧 Tampered ticket ID:', signedData.payload.ticketId);

            const tamperedPacked = pack(signedData);
            const tamperedQrData = new Uint8Array(tamperedPacked);
            console.log('📱 Tampered binary QR data length:', tamperedQrData.length);

            const decoded = decodeTicketQRData(tamperedQrData);
            console.log('📋 Decoded result for tampered data:', decoded);
            expect(decoded).toBeNull();
            console.log('✅ Tampered data detected correctly');
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
                sampleTicketData.event,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Generated binary QR data with different private key, length:', qrDataWithDifferentKey.length);

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

    describe('generateQRCodeImage (binary)', () => {
        it('should generate QR code image from binary data', async () => {
            console.log('🧪 Testing QR code image generation from binary...');
            const binaryData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.event,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Binary data length:', binaryData.length);
            
            const qrImage = await generateQRCodeImage(binaryData);
            console.log('🖼️ Generated QR image (first 100 chars):', qrImage.substring(0, 100) + '...');

            expect(typeof qrImage).toBe('string');
            expect(qrImage).toMatch(/^data:image\/png;base64,/);
            console.log('✅ Binary QR code image generation passed');
        });

        it('should generate QR code with correct options for binary data', async () => {
            console.log('🧪 Testing QR code generation options with binary data...');
            const mockToDataURL = vi.fn().mockResolvedValue('data:image/png;base64,fake-data');
            const mockQRCode = await import('qrcode');
            vi.spyOn(mockQRCode.default, 'toDataURL').mockImplementation(mockToDataURL);

            const testData = new Uint8Array([1, 2, 3, 4, 5]);
            console.log('📱 Test binary data for options test, length:', testData.length);
            await generateQRCodeImage(testData);

            expect(mockToDataURL).toHaveBeenCalledWith([{ data: testData, mode: 'byte' }], {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            console.log('✅ Binary QR code options verification passed');

            mockToDataURL.mockRestore();
        });
    });

    describe('Integration tests (binary)', () => {
        it('should complete full binary encode/decode cycle successfully', () => {
            console.log('🧪 Testing full binary encode/decode integration...');
            console.log('📋 Using sample ticket data:', JSON.stringify(sampleTicketData, null, 2));

            // Generate binary QR data
            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.event,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Generated binary QR data for integration test, length:', qrData.length);

            // Decode binary QR data
            const decoded = decodeTicketQRData(qrData);
            console.log('📋 Integration test decoded data:', JSON.stringify(decoded, null, 2));

            // Verify all data matches
            expect(decoded).not.toBeNull();
            expect(decoded!.ticketId).toBe(sampleTicketData.ticketId);
            expect(decoded!.visitorName).toBe(sampleTicketData.visitorName);
            expect(decoded!.event).toEqual(sampleTicketData.event);
            expect(decoded!.seat).toEqual(sampleTicketData.seat);
            expect(decoded!.row).toEqual(sampleTicketData.row);
            expect(decoded!.area).toEqual(sampleTicketData.area);
            console.log('✅ Full binary encode/decode cycle completed successfully');
        });

        it('should handle special characters in visitor names', () => {
            console.log('🧪 Testing special characters in visitor names...');
            const specialName = 'Ngô Trần Xuân Hoà & Sarah O\'Connor';
            console.log('👤 Special name:', specialName);

            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                specialName,
                sampleTicketData.event,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Generated binary QR data with special name, length:', qrData.length);

            const decoded = decodeTicketQRData(qrData);
            console.log('📋 Decoded special name result:', JSON.stringify(decoded, null, 2));

            expect(decoded).not.toBeNull();
            expect(decoded!.visitorName).toBe(specialName);
            console.log('✅ Special characters handled correctly');
        });

        it('should handle long event names', () => {
            console.log('🧪 Testing long event names...');
            const longEventName = 'This is a very long event name that might cause issues with QR code generation if not handled properly - Annual Music Festival 2024';
            console.log('🎫 Long event name:', longEventName);

            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                { id: sampleTicketData.event.id, name: longEventName },
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Generated binary QR data with long event name, length:', qrData.length);

            const decoded = decodeTicketQRData(qrData);
            console.log('📋 Decoded long event name result:', JSON.stringify(decoded, null, 2));

            expect(decoded).not.toBeNull();
            expect(decoded!.event.name).toBe(longEventName);
            console.log('✅ Long event name handled correctly');
        });

        it('should verify timestamp is recent', () => {
            console.log('🧪 Testing timestamp accuracy...');
            const beforeGeneration = Date.now();
            console.log('⏰ Before generation timestamp:', beforeGeneration);

            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.event,
                sampleTicketData.seat,
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Generated binary QR data, length:', qrData.length);

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
    });

    describe('Edge cases (binary)', () => {
        it('should handle empty strings in data', () => {
            console.log('🧪 Testing empty strings handling...');
            const emptyData = {
                ticketId: '',
                visitorName: '',
                event: { id: '', name: '' },
                seat: { id: '', number: '' },
                row: { id: '', name: '' },
                area: { id: '', name: '' }
            };
            console.log('📋 Empty data being tested:', JSON.stringify(emptyData, null, 2));

            const qrData = generateTicketQRData(
                emptyData.ticketId,
                emptyData.visitorName,
                emptyData.event,
                emptyData.seat,
                emptyData.row,
                emptyData.area
            );
            console.log('📱 Generated binary QR data with empty strings, length:', qrData.length);

            const decoded = decodeTicketQRData(qrData);
            console.log('📋 Decoded empty strings data:', JSON.stringify(decoded, null, 2));

            expect(decoded).not.toBeNull();
            expect(decoded!.ticketId).toBe('');
            expect(decoded!.visitorName).toBe('');
            console.log('✅ Empty strings handled correctly');
        });

        it('should handle very large seat numbers', () => {
            console.log('🧪 Testing large seat numbers...');
            const largeSeatNumber = '99999999';
            console.log('💺 Large seat number:', largeSeatNumber);

            const qrData = generateTicketQRData(
                sampleTicketData.ticketId,
                sampleTicketData.visitorName,
                sampleTicketData.event,
                { id: sampleTicketData.seat.id, number: largeSeatNumber },
                sampleTicketData.row,
                sampleTicketData.area
            );
            console.log('📱 Generated binary QR data with large seat number, length:', qrData.length);

            const decoded = decodeTicketQRData(qrData);
            console.log('📋 Decoded large seat number result:', JSON.stringify(decoded, null, 2));

            expect(decoded).not.toBeNull();
            expect(decoded!.seat.number).toBe(largeSeatNumber);
            console.log('✅ Large seat numbers handled correctly');
        });
    });
});