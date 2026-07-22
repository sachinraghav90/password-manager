import { cryptoUtils } from '../src/lib/crypto/cryptoService.ts';

// Polyfill for Node.js environment
if (typeof globalThis.crypto === 'undefined') {
  const { webcrypto } = await import('node:crypto');
  // @ts-ignore
  globalThis.crypto = webcrypto;
}

async function runTests() {
  console.log("Running Crypto Tests...");
  
  try {
    // 1. Generate Salt
    const salt = cryptoUtils.generateSalt();
    console.log("✓ generateSalt: ", salt);

    // 2. Derive Master Key
    const password = "mySuperSecretPassword123!";
    const masterKey = await cryptoUtils.deriveMasterKey(password, salt);
    console.log("✓ deriveMasterKey: Success");

    // 3. Generate Vault Key
    const vaultKey = await cryptoUtils.generateVaultKey();
    console.log("✓ generateVaultKey: Success");

    // 4. Wrap & Unwrap Vault Key
    const { wrappedKeyBase64, nonceBase64 } = await cryptoUtils.wrapVaultKey(vaultKey, masterKey);
    console.log("✓ wrapVaultKey: Success");
    
    const unwrappedVaultKey = await cryptoUtils.unwrapVaultKey(wrappedKeyBase64, nonceBase64, masterKey);
    console.log("✓ unwrapVaultKey: Success");

    // 5. Encrypt & Decrypt Data
    const plaintext = "This is a highly sensitive secret note!";
    const { ciphertextBase64, nonceBase64: dataNonce } = await cryptoUtils.encryptData(plaintext, unwrappedVaultKey);
    console.log("✓ encryptData: Success");

    const decryptedPlaintext = await cryptoUtils.decryptData(ciphertextBase64, dataNonce, unwrappedVaultKey);
    console.log("✓ decryptData: Success");

    if (plaintext === decryptedPlaintext) {
      console.log("✓ Encrypt -> Decrypt matches perfectly!");
    } else {
      throw new Error("Decrypted data does not match original plaintext.");
    }

    // 6. Test Wrong Password (Simulate by deriving a different Master Key)
    const wrongMasterKey = await cryptoUtils.deriveMasterKey("wrongPassword", salt);
    let wrongUnwrapFailed = false;
    try {
      await cryptoUtils.unwrapVaultKey(wrappedKeyBase64, nonceBase64, wrongMasterKey);
    } catch (e) {
      wrongUnwrapFailed = true;
    }
    if (wrongUnwrapFailed) {
      console.log("✓ unwrapVaultKey fails safely with wrong master key (expected)");
    } else {
      throw new Error("unwrapVaultKey succeeded with wrong master key!");
    }

    console.log("\nAll crypto tests passed successfully!");
  } catch (error) {
    console.error("\nCrypto tests failed:", error);
    process.exit(1);
  }
}

runTests();
