import jwt from "jsonwebtoken";

export interface PassEmployee {
  name: string;
  email?: string | null;
}

/**
 * Generate a Google Wallet pass save URL for an employee.
 *
 * Required environment variables:
 *   GOOGLE_WALLET_ISSUER_ID       - Your Google Pay & Wallet issuer ID (long number)
 *   GOOGLE_WALLET_CLASS_ID        - The generic class ID (just the suffix, e.g. "ENG")
 *   GOOGLE_SERVICE_ACCOUNT_JSON   - Full contents of the service account JSON key file
 *
 * @param employee   Employee name and email for the pass object.
 * @param qrToken    The token encoded in the pass barcode (same as Tag.tagId).
 * @returns          A URL the user can open to add the pass to their Google Wallet.
 */
export async function generateGoogleWalletSaveUrl(
  employee: PassEmployee,
  qrToken: string,
): Promise<string> {
  const { GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_CLASS_ID, GOOGLE_SERVICE_ACCOUNT_JSON } = process.env;

  if (!GOOGLE_WALLET_ISSUER_ID || !GOOGLE_WALLET_CLASS_ID || !GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error(
      "Google Wallet configuration is incomplete. Set GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_CLASS_ID, and GOOGLE_SERVICE_ACCOUNT_JSON.",
    );
  }

  const serviceAccount = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON) as {
    client_email: string;
    private_key: string;
  };

  const issuerId = GOOGLE_WALLET_ISSUER_ID;
  const classId = `${issuerId}.${GOOGLE_WALLET_CLASS_ID}`;
  const objectId = `${issuerId}.${qrToken}`;

  const genericObject = {
    id: objectId,
    classId,
    state: "ACTIVE",
    cardTitle: {
      defaultValue: { language: "en-AU", value: "Office Attendance" },
    },
    subheader: {
      defaultValue: { language: "en-AU", value: "Employee" },
    },
    header: {
      defaultValue: { language: "en-AU", value: employee.name },
    },
    barcode: {
      type: "QR_CODE",
      value: qrToken,
      alternateText: employee.name,
    },
    textModulesData: [
      ...(employee.email
        ? [{ id: "email", header: "Email", body: employee.email }]
        : []),
    ],
  };

  const claims = {
    iss: serviceAccount.client_email,
    aud: "google",
    origins: ["http://localhost:3000", "http://localhost:3001"],
    typ: "savetowallet",
    payload: {
      genericObjects: [genericObject],
    },
  };

  const token = jwt.sign(claims, serviceAccount.private_key, { algorithm: "RS256" });

  return `https://pay.google.com/gp/v/save/${token}`;
}
