import path from "path";
import { fileURLToPath } from "url";
import { GoogleAuth } from "google-auth-library";

// Helper to resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construct the absolute path to your service account key file
const keyFilePath = path.resolve(
  __dirname,
  "../services/vertex-service-account.json"
);

/**
 * Generates an OAuth 2.0 access token from a service account key file.
 * @returns {Promise<string>} The access token.
 */
export default async function getAccessToken() {
  const auth = new GoogleAuth({
    keyFile: keyFilePath,
    // ✅ FIX: Added the scope for the Generative Language API
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/generative-language",
    ],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();

  if (!tokenResponse.token) {
    throw new Error("Failed to retrieve access token.");
  }

  return tokenResponse.token;
}
