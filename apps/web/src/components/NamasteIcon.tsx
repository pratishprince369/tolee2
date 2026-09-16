import React from 'react';

/**
 * Namaste / Folded Hands (Pranam) Icon for Tolee Live Darshan
 * Styled to perfectly match the traditional Namaskar / Anjali Mudra silhouette
 * with transparent cut-outs so it seamlessly adapts to any background or theme.
 */
export function NamasteIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Left Hand with cut-out thumb groove */}
      <path
        d="M11.3 2.1c-.2-.05-.4.1-.5.3C9.7 4.9 8.1 8.3 6.6 11.2c-.9 1.7-1.7 3.3-2.3 4.9-.7 1.8-.7 3.5.2 4.7.7.9 1.8 1.3 3 1.2 1.1-.1 2.2-.7 3.1-1.6 1-1 1.9-2.5 2.5-4.4.2-.6.4-1.3.5-2V2.5c0-.3-.2-.5-.5-.4zM10 11.5c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v4.2c0 .4.3.8.8.8s.8-.4.8-.8v-4.2c0-.2.2-.4.4-.4s.4.2.4.4v4.2c0 .3.2.5.5.5.3 0 .5-.2.5-.5v-4.2z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />

      {/* Right Hand with symmetrical cut-out thumb groove */}
      <path
        d="M12.7 2.1c.2-.05.4.1.5.3 1.1 2.5 2.7 5.9 4.2 8.8.9 1.7 1.7 3.3 2.3 4.9.7 1.8.7 3.5-.2 4.7-.7.9-1.8 1.3-3 1.2-1.1-.1-2.2-.7-3.1-1.6-1-1-1.9-2.5-2.5-4.4-.2-.6-.4-1.3-.5-2V2.5c0-.3.2-.5.5-.4zM14 11.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v4.2c0 .4-.3.8-.8.8s-.8-.4-.8-.8v-4.2c0-.2-.2-.4-.4-.4s-.4.2-.4.4v4.2c0 .3-.2.5-.5.5-.3 0-.5-.2-.5-.5v-4.2z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default NamasteIcon;
