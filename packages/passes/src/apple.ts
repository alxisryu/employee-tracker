import { PKPass } from "passkit-generator";
import path from "path";
import fs from "fs";

export interface PassEmployee {
  name: string;
  email?: string | null;
}

/**
 * Generate an Apple Wallet .pkpass file for an employee.
 *
 * Required environment variables:
 *   APPLE_WWDR_CERT_PATH     - Path to Apple WWDR certificate (PEM)
 *   APPLE_SIGNER_CERT_PATH   - Path to your pass signing certificate (PEM)
 *   APPLE_SIGNER_KEY_PATH    - Path to your pass signing private key (PEM)
 *   APPLE_SIGNER_KEY_PASS    - Passphrase for the signing key (optional)
 *   APPLE_PASS_TYPE_ID       - e.g. "pass.com.lyratechnologies.attendance"
 *   APPLE_TEAM_ID            - Your Apple Developer team ID
 *
 * For local development, you can generate a self-signed certificate for testing.
 * The pass will not install on real devices without a valid Apple certificate.
 *
 * @param employee   Employee name and email to display on the pass.
 * @param qrToken    The token encoded in the pass barcode (same as Tag.tagId).
 * @returns          The .pkpass file as a Buffer.
 */
export async function generatePkpass(
  employee: PassEmployee,
  qrToken: string,
): Promise<Buffer> {
  const {
    APPLE_WWDR_CERT_PATH,
    APPLE_SIGNER_CERT_PATH,
    APPLE_SIGNER_KEY_PATH,
    APPLE_SIGNER_KEY_PASS,
    APPLE_PASS_TYPE_ID,
    APPLE_TEAM_ID,
  } = process.env;

  if (!APPLE_WWDR_CERT_PATH || !APPLE_SIGNER_CERT_PATH || !APPLE_SIGNER_KEY_PATH || !APPLE_PASS_TYPE_ID || !APPLE_TEAM_ID) {
    throw new Error(
      "Apple Wallet configuration is incomplete. Set APPLE_WWDR_CERT_PATH, APPLE_SIGNER_CERT_PATH, APPLE_SIGNER_KEY_PATH, APPLE_PASS_TYPE_ID, and APPLE_TEAM_ID.",
    );
  }

  const pass = await PKPass.from(
    {
      model: path.resolve(process.cwd(), "assets/pass-model"),
      certificates: {
        wwdr: fs.readFileSync(APPLE_WWDR_CERT_PATH),
        signerCert: fs.readFileSync(APPLE_SIGNER_CERT_PATH),
        signerKey: fs.readFileSync(APPLE_SIGNER_KEY_PATH),
        signerKeyPassphrase: APPLE_SIGNER_KEY_PASS,
      },
    },
    {
      passTypeIdentifier: APPLE_PASS_TYPE_ID,
      teamIdentifier: APPLE_TEAM_ID,
      serialNumber: qrToken,
      description: "Office Attendance Pass",
      organizationName: "Lyra Technologies",
    },
  );

  pass.primaryFields.push({ key: "name", label: "Employee", value: employee.name });
  if (employee.email) {
    pass.secondaryFields.push({ key: "email", label: "Email", value: employee.email });
  }

  pass.setBarcodes({
    message: qrToken,
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
  });

  return pass.getAsBuffer();
}
