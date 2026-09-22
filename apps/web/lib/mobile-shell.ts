// Shared route rule for the app-style mobile header/bottom nav
// (MobileAppHeader, MobileBottomNav) and for SiteHeader hiding itself to
// make room for them - kept in one place so the three components can never
// disagree about which pages get which header.
//
// Every shopper page except the product detail page gets the app shell:
// its image-heavy, single-product layout already has its own back
// navigation (the breadcrumb) and doesn't need a second location/search bar
// competing for space above the fold. The seller portal is excluded
// entirely - it already has its own dedicated "Seller Portal" nav bar built
// for a merchant managing their store, and a shopper-facing Home/Category/
// Reservations/Account bar underneath it would just be confusing there.
export function isMobileAppShellPage(pathname: string): boolean {
  if (pathname.startsWith("/seller")) return false;
  if (pathname.startsWith("/product/")) return false;
  return true;
}
