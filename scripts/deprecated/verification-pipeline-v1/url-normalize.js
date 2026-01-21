/**
 * url-normalize.js - URL canonicalization for consistent comparison
 *
 * Ensures URLs that point to the same resource are considered equal
 * even if they have minor formatting differences.
 *
 * Normalizations applied:
 * - Lowercase scheme and host
 * - Remove default ports (80, 443)
 * - Remove trailing slash (except for root path)
 * - Sort query parameters alphabetically
 * - Remove empty query string
 * - Decode percent-encoded characters where safe
 * - Remove fragment (hash)
 */

'use strict';

/**
 * Normalize a URL for consistent comparison
 * @param {string} url - The URL to normalize
 * @returns {string} - Normalized URL
 */
function normalizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return url;
  }

  // Handle special cases
  if (url === 'multiple_sources_synthesis' || url.startsWith('synthesis:')) {
    return url; // Invalid URL marker - return as-is for detection
  }

  try {
    const parsed = new URL(url);

    // Start with lowercase scheme
    let normalized = parsed.protocol.toLowerCase() + '//';

    // Lowercase host
    normalized += parsed.hostname.toLowerCase();

    // Remove default ports
    if (parsed.port) {
      const isDefaultPort =
        (parsed.protocol === 'http:' && parsed.port === '80') ||
        (parsed.protocol === 'https:' && parsed.port === '443');

      if (!isDefaultPort) {
        normalized += ':' + parsed.port;
      }
    }

    // Normalize path
    let pathname = parsed.pathname;

    // Decode percent-encoded characters that don't need encoding
    pathname = decodeURIComponentSafe(pathname);

    // Remove trailing slash unless root
    if (pathname !== '/' && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    // Ensure path starts with /
    if (!pathname.startsWith('/')) {
      pathname = '/' + pathname;
    }

    normalized += pathname;

    // Sort query parameters alphabetically
    if (parsed.search) {
      const params = new URLSearchParams(parsed.search);
      const sortedEntries = [...params.entries()].sort((a, b) => {
        // Sort by key first, then by value
        const keyCompare = a[0].localeCompare(b[0]);
        if (keyCompare !== 0) return keyCompare;
        return a[1].localeCompare(b[1]);
      });

      if (sortedEntries.length > 0) {
        const sortedParams = new URLSearchParams(sortedEntries);
        normalized += '?' + sortedParams.toString();
      }
    }

    // Fragment (hash) is intentionally ignored - it's client-side only

    return normalized;
  } catch (e) {
    // If URL parsing fails, return original for string comparison
    // This handles malformed URLs or non-URL strings
    return url;
  }
}

/**
 * Safely decode URI components, returning original on error
 * @param {string} str - String to decode
 * @returns {string} - Decoded string or original
 */
function decodeURIComponentSafe(str) {
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str;
  }
}

/**
 * Compare two URLs for equality after normalization
 * @param {string} url1 - First URL
 * @param {string} url2 - Second URL
 * @returns {boolean} - True if URLs are equivalent
 */
function urlsEqual(url1, url2) {
  return normalizeUrl(url1) === normalizeUrl(url2);
}

/**
 * Extract the domain from a URL
 * @param {string} url - The URL
 * @returns {string|null} - Domain or null if invalid
 */
function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch (e) {
    return null;
  }
}

/**
 * Check if URL is a homepage (no specific path)
 * @param {string} url - The URL to check
 * @returns {boolean} - True if homepage URL
 */
function isHomepage(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    return path === '/' || path === '';
  } catch (e) {
    return false;
  }
}

/**
 * Check if URL appears to be valid
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid URL format
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Known invalid markers
  if (url === 'multiple_sources_synthesis' || url.startsWith('synthesis:')) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

/**
 * Get a display-friendly version of URL (truncated if long)
 * @param {string} url - The URL
 * @param {number} maxLength - Maximum length (default 60)
 * @returns {string} - Truncated URL
 */
function truncateUrl(url, maxLength = 60) {
  if (!url || url.length <= maxLength) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    const path = parsed.pathname;

    // Try domain + truncated path
    const available = maxLength - domain.length - 3; // 3 for "..."
    if (available > 10 && path.length > available) {
      return domain + path.substring(0, available) + '...';
    }

    return url.substring(0, maxLength - 3) + '...';
  } catch (e) {
    return url.substring(0, maxLength - 3) + '...';
  }
}

module.exports = {
  normalizeUrl,
  urlsEqual,
  extractDomain,
  isHomepage,
  isValidUrl,
  truncateUrl
};
