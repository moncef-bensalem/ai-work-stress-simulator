export async function isBiometricAvailable(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

export async function registerBiometric(email: string): Promise<Record<string, string>> {
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'AI Work Stress Simulator', id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(email),
        name: email,
        displayName: email,
      },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null

  if (!credential) throw new Error('Enregistrement biométrique annulé')

  const response = credential.response as AuthenticatorAttestationResponse
  return {
    id: credential.id,
    rawId: bufferToBase64(credential.rawId),
    type: credential.type,
    clientDataJSON: bufferToBase64(response.clientDataJSON),
    attestationObject: bufferToBase64(response.attestationObject),
  }
}

export async function loginWithBiometric(_email: string): Promise<{
  credential_id: string
  authenticator_data: string
  client_data_json: string
  signature: string
}> {
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      userVerification: 'required',
      timeout: 60000,
    },
  })) as PublicKeyCredential | null

  if (!assertion) throw new Error('Authentification biométrique annulée')

  const response = assertion.response as AuthenticatorAssertionResponse
  return {
    credential_id: assertion.id,
    authenticator_data: bufferToBase64(response.authenticatorData),
    client_data_json: bufferToBase64(response.clientDataJSON),
    signature: bufferToBase64(response.signature),
  }
}
