'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function IntroPage() {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Listen for the EXPERIENCE_COMPLETE message from the iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'EXPERIENCE_COMPLETE') {
        // Automatically transition to the dashboard
        router.push('/');
      }
    };
    window.addEventListener('message', handleMessage);
    
    // Cleanup listener on unmount
    return () => window.removeEventListener('message', handleMessage);
  }, [router]);

  return (
    <div className="w-full h-screen overflow-hidden bg-black flex items-center justify-center">
      <iframe 
        ref={iframeRef}
        src="/experience.html" 
        className="w-full h-full border-none outline-none bg-black"
        title="3D Space Adventure"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}
