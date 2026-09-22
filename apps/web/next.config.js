/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.sortitout.in" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // camera/microphone were blocked outright here before the QR
          // scanner (getUserMedia video) and voice search (SpeechRecognition,
          // which also requests mic access under the hood) existed - that
          // made both silently fail everywhere, since the browser refuses to
          // even show a permission prompt when the site's own policy forbids
          // it. Scoped to same-origin only, same as the existing geolocation
          // rule, not opened up to third parties.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
