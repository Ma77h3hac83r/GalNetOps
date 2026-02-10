/** Content-Security-Policy for the default session. */
import { session } from 'electron';
import { logInfo } from './logger';

export function setupCSP(isDev: boolean): void {
  if (isDev) {
    logInfo('Main', 'CSP disabled in development');
    return;
  }

  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    responseHeaders['content-security-policy'] = [csp];
    callback({ responseHeaders });
  });
}
