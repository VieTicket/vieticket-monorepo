import QRCode from 'qrcode';

/**
 * Generates validation data for a ticket (text content that will be embedded in QR code)
 * @param ticketId - The ID of the ticket
 * @param orderId - The ID of the order
 * @returns A unique validation string
 * 
 * @todo In later iteration, do sign the data for offline inspection
 */
export function generateTicketValidationData(ticketId: string, orderId: string): string {
  const timestamp = Date.now().toString(36);
  const hash = Buffer.from(`${ticketId}-${orderId}-${timestamp}`).toString('base64url');
  return `${hash}`;
}

/**
 * Validates if validation data format is valid
 * @param validationData - The validation data to validate
 * @returns boolean indicating if the validation data is valid
 */
export function validateTicketValidationData(validationData: string): boolean {
  try {
    const decoded = Buffer.from(validationData, 'base64url').toString();
    return decoded.includes('-') && decoded.length > 0;
  } catch {
    return false;
  }
}

/**
 * Decodes validation data to extract ticket and order information
 * @param validationData - The validation data to decode
 * @returns Object containing ticketId, orderId, and timestamp or null if invalid
 */
export function decodeTicketValidationData(validationData: string): { 
  ticketId: string; 
  orderId: string; 
  timestamp: string 
} | null {
  try {
    const decoded = Buffer.from(validationData, 'base64url').toString();
    const parts = decoded.split('-');
    
    if (parts.length >= 3) {
      const [ticketId, orderId, timestamp] = parts;
      return { ticketId, orderId, timestamp };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Generates a QR code data URL from validation data
 * @param validationData - The validation data to encode in QR code
 * @returns Promise<string> - Data URL of the QR code image
 */
export async function generateQRCodeImage(validationData: string): Promise<string> {
  try {
    return await QRCode.toDataURL(validationData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Return a fallback SVG if QR generation fails
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