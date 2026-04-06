import QRCode from "qrcode";

/**
 * Generate a QR code PNG for a given token.
 * Used to display a preview of the pass QR code in the web portal.
 *
 * @param qrToken  The token encoded in the QR code (same value stored in Tag.tagId).
 * @returns        PNG image as a Buffer.
 */
export async function generateQrPng(qrToken: string): Promise<Buffer> {
  const dataUrl = await QRCode.toDataURL(qrToken, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 300,
  });
  // Strip the "data:image/png;base64," prefix and convert to Buffer.
  const base64 = dataUrl.split(",")[1]!;
  return Buffer.from(base64, "base64");
}
