import QRCode from "qrcode";

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
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    return `data:image/svg+xml;base64,${Buffer.from(
      `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <rect width="200" height="200" fill="white" stroke="black"/>
        <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12">
          QR Error
        </text>
      </svg>
    `
    ).toString("base64")}`;
  }
}

/**
 * Generates a QR code as a Buffer
 * @param qrData - The ticket QR data (Base64URL string)
 * @returns Promise<Buffer> - Buffer containing the QR code image (PNG)
 */
export async function generateQRCodeBuffer(qrData: string): Promise<Buffer> {
  try {
    return await QRCode.toBuffer(qrData, {
      type: 'png',
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
  } catch (error) {
    console.error("Error generating QR code buffer:", error);
    // Fallback error image as buffer
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <rect width="200" height="200" fill="white" stroke="black"/>
        <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12">
          QR Error
        </text>
      </svg>
    `;
    return Buffer.from(svgString);
  }
}
