import React from 'react';

interface JsonLdProps {
  data: Record<string, any> | Array<Record<string, any>>;
}

/**
 * Injects a sanitized JSON-LD script tag into the HTML document for search and AI crawlers
 */
export const JsonLd: React.FC<JsonLdProps> = ({ data }) => {
  if (!data) return null;

  // Prevent XSS or corrupted JSON strings
  const jsonString = JSON.stringify(data).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  );
};
