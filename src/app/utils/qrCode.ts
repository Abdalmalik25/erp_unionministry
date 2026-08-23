/**
 * QR Code Generator for certificates and documents
 * Uses a simple canvas-based QR code renderer
 */

export function generateQRCodeData(text: string): string {
  // Simple hash-based QR representation for demo
  // In production, use a library like 'qrcode' or 'qr-code-styling'
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
}

export function getVerificationUrl(entityId: string, entityType: string): string {
  const baseUrl = 'https://verify.unionsphere.ye';
  return `${baseUrl}/${entityType}/${entityId}`;
}

export function generateCertificateId(type: string, year: number): string {
  const prefix = type === 'membership' ? 'U' : type === 'inspection' ? 'I' : type === 'license' ? 'L' : 'C';
  const seq = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `${prefix}-${year}-${seq}`;
}
