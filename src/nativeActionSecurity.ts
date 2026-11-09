const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

type HeaderValue = string | string[] | undefined;

/**
 * Allow the legacy native bridge only for same-origin HTTP loopback requests.
 * Hosted previews are explicitly denied even if clients forge loopback headers.
 */
export function isTrustedLocalNativeOrigin(
  originHeader: HeaderValue,
  requestHostHeader: HeaderValue,
  isHostedPreview: boolean
): boolean {
  if (isHostedPreview || !originHeader || !requestHostHeader) return false;

  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  const requestHost = Array.isArray(requestHostHeader)
    ? requestHostHeader[0]
    : requestHostHeader;
  if (!origin || !requestHost) return false;

  try {
    const parsedOrigin = new URL(origin);
    return (
      parsedOrigin.protocol === 'http:' &&
      !parsedOrigin.username &&
      !parsedOrigin.password &&
      LOOPBACK_HOSTS.has(parsedOrigin.hostname.toLowerCase()) &&
      parsedOrigin.host.toLowerCase() === requestHost.trim().toLowerCase()
    );
  } catch {
    return false;
  }
}
