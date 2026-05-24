/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

interface SponsorAdBannerProps {
  onNavigateToStore?: () => void;
  placement: 'path-map' | 'insights' | 'store';
}

export default function SponsorAdBanner({ onNavigateToStore, placement }: SponsorAdBannerProps) {
  const adRef = useRef<boolean>(false);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (adRef.current) return;
    adRef.current = true;

    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch (e: any) {
      if (e.message && e.message.includes('already have ads')) {
        // Safe to ignore, caused by component re-rendering
      } else {
        console.error("AdSense error", e);
      }
    }
  }, []);

  return (
    <div className="w-full relative my-4 flex items-center justify-center overflow-hidden" style={{ minWidth: '250px', minHeight: '100px' }}>
      {/* Google AdSense */}
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", minWidth: "250px" }}
        data-ad-client="ca-pub-6831110002882596"
        data-ad-slot="auto"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
}
