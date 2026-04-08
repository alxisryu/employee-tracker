import { GoogleAuth } from "google-auth-library";

export interface PassEmployee {
  name: string;
  email?: string | null;
}

/**
 * Generate a Google Wallet pass save URL for an employee.
 *
 * Required environment variables:
 *   GOOGLE_WALLET_ISSUER_ID         - Your Google Pay & Wallet issuer ID
 *   GOOGLE_WALLET_CLASS_ID          - The loyalty class ID (pre-created in Google Wallet console)
 *   GOOGLE_APPLICATION_CREDENTIALS  - Path to Google service account JSON key file
 *                                     (or set GOOGLE_SERVICE_ACCOUNT_JSON as raw JSON)
 *
 * @param employee   Employee name and email for the pass object.
 * @param qrToken    The token encoded in the pass barcode (same as Tag.tagId).
 * @returns          A URL the user can open to add the pass to their Google Wallet.
 */
export async function generateGoogleWalletSaveUrl(
  employee: PassEmployee,
  qrToken: string,
): Promise<string> {
  const { GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_CLASS_ID } = process.env;

  if (!GOOGLE_WALLET_ISSUER_ID || !GOOGLE_WALLET_CLASS_ID) {
    throw new Error(
      "Google Wallet configuration is incomplete. Set GOOGLE_WALLET_ISSUER_ID and GOOGLE_WALLET_CLASS_ID.",
    );
  }

  // Resolve credentials — support both file path and inline JSON.
  let credentials: object | undefined;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) as object;
  }

  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
  });
  const client = await auth.getClient();

  const objectId = `${GOOGLE_WALLET_ISSUER_ID}.${qrToken}`;
  const classId = `${GOOGLE_WALLET_ISSUER_ID}.${GOOGLE_WALLET_CLASS_ID}`;

  const passObject = {
    id: objectId,
    classId,
    state: "ACTIVE",
    barcode: {
      type: "QR_CODE",
      value: qrToken,
      alternateText: employee.name,
    },
    textModulesData: [
      {
        header: "Employee",
        body: employee.name,
        id: "employee_name",
      },
      ...(employee.email
        ? [
            {
              header: "Email",
              body: employee.email,
              id: "employee_email",
            },
          ]
        : []),
    ],
    cardTitle: {
      defaultValue: {
        language: "en-AU",
        value: "Office Attendance",
      },
    },
    header: {
      defaultValue: {
        language: "en-AU",
        value: employee.name,
      },
    },
  };

  // Sign a JWT containing the pass object so the user can save it directly.
  const tokenPayload = {
    iss: (credentials as { client_email?: string } | undefined)?.client_email ??
         (await auth.getCredentials()).client_email,
    aud: "google",
    origins: [],
    typ: "savetowallet",
    payload: {
      loyaltyObjects: [passObject],
    },
  };

  const token = await (client as { sign?: (payload: object) => Promise<string> }).sign?.(tokenPayload);
  if (!token) {
    // Fallback: sign manually using the auth client's key
    const jwt = await auth.sign(JSON.stringify(tokenPayload));
    return `https://pay.google.com/gp/v/save/${jwt}`;
  }

  return `https://pay.google.com/gp/v/save/${token}`;
}
