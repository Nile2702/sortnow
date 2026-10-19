import { LoadingScreen } from "../components/LoadingSpinner";

// Next's automatic fallback for any server-rendered route segment that
// doesn't define its own loading.tsx - without this, navigating to a page
// that awaits data server-side (store/[slug], for one) showed nothing at
// all while it loaded, instead of the funnel spinner every client-fetched
// page already got.
export default function Loading() {
  return <LoadingScreen maxWidth={1440} />;
}
