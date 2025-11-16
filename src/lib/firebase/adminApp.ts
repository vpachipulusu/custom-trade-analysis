import * as admin from "firebase-admin";

interface FirebaseAdminAppParams {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function formatPrivateKey(key: string): string {
  return key.replace(/\\n/g, "\n");
}

function createFirebaseAdminApp(params: FirebaseAdminAppParams): admin.app.App {
  const privateKey = formatPrivateKey(params.privateKey);

  if (admin.apps.length > 0) {
    return admin.app();
  }

  const cert = admin.credential.cert({
    projectId: params.projectId,
    clientEmail: params.clientEmail,
    privateKey,
  });

  return admin.initializeApp({
    credential: cert,
    projectId: params.projectId,
  });
}

function initAdmin(): admin.app.App {
  const params: FirebaseAdminAppParams = {
    projectId: process.env.FIREBASE_PROJECT_ID as string,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL as string,
    privateKey: process.env.FIREBASE_PRIVATE_KEY as string,
  };

  return createFirebaseAdminApp(params);
}

const adminApp = initAdmin();

export async function verifyIdToken(
  token: string
): Promise<admin.auth.DecodedIdToken> {
  try {
    return await adminApp.auth().verifyIdToken(token);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

export { adminApp };
export default adminApp;
