import { Metadata } from "next";
import { LegalPage, LegalSection } from "../../../components/LegalPage";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — SORT IT OUT",
  description: "Refund and cancellation policy for shopper reservations and merchant subscriptions on SORT IT OUT.",
};

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund & Cancellation Policy" updated="10 September 2026">
      <LegalSection title="Shopper reservations">
        <p>
          Reserving an item on SORT IT OUT does not involve any payment through this site, so there's nothing to
          refund — you pay the store directly, in person, only if and when you decide to buy. You can cancel a
          reservation any time before its pickup window ends from the "My Reservations" page, at no cost.
        </p>
      </LegalSection>

      <LegalSection title="In-store purchases">
        <p>
          Once you buy an item at the store, that store's own return and exchange policy applies — SORT IT OUT is not
          part of that transaction and can't process a return or refund on the store's behalf. Ask the store staff
          about their return window when you complete a purchase.
        </p>
      </LegalSection>

      <LegalSection title="Merchant subscriptions">
        <p>
          Sellers on a paid plan are billed on a recurring basis for access to the Seller Portal (listings, Theme
          Studio, analytics, and QR marketing tools). You can downgrade to the Free plan at any time from Billing —
          this takes effect at the end of the current billing cycle, and we don't provide partial refunds for the
          remainder of a cycle already paid for.
        </p>
        <p>
          If you believe you were charged in error, contact support within 7 days of the charge and we'll review it.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>For billing disputes or questions, contact the platform operator's support address listed on the site.</p>
      </LegalSection>
    </LegalPage>
  );
}
