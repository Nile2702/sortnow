import { Metadata } from "next";
import { LegalPage, LegalSection } from "../../../components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use — SORT NOW",
  description: "Terms of use for the SORT NOW fashion discovery and store-reservation platform.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="10 September 2026">
      <LegalSection title="1. What SORT NOW is">
        <p>
          SORT NOW is an online-to-offline (O2O) discovery platform that lets shoppers browse apparel listed by
          local retail stores and reserve items to try on or buy in person. We do not sell products directly, and we
          do not process payments for merchandise — every purchase happens at the store, between you and the merchant.
        </p>
      </LegalSection>

      <LegalSection title="2. Reservations, not orders">
        <p>
          When you "sort" (add to bag) and reserve an item, you're asking a store to hold that item for you until the
          end of the reservation window shown at checkout. A reservation is not a purchase, is not paid for through
          this site, and does not guarantee price, stock, or fit until you inspect the item in store. Stores may
          decline or adjust reservations if stock changes before you arrive.
        </p>
      </LegalSection>

      <LegalSection title="3. Store accounts">
        <p>
          Merchants who list products on SORT NOW are responsible for the accuracy of their own listings, prices,
          and stock levels, and for honoring reservations made in good faith. Merchant accounts are for the exclusive
          use of the store that owns them; sharing credentials or accessing another merchant's account without
          authorization is prohibited.
        </p>
      </LegalSection>

      <LegalSection title="4. Acceptable use">
        <p>
          Don't scrape, resell, or republish store or product data without permission; don't attempt to bypass
          account security; don't use the platform to harass merchants or other shoppers.
        </p>
      </LegalSection>

      <LegalSection title="5. Liability">
        <p>
          SORT NOW connects shoppers and stores but is not a party to the sale that happens in store. We aren't
          liable for the quality, safety, or legality of products, or for a store's failure to honor a reservation.
        </p>
      </LegalSection>

      <LegalSection title="6. Changes">
        <p>We may update these terms as the platform evolves. Continued use after an update means you accept the revised terms.</p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>Questions about these terms can be sent to the platform operator's support address listed on the site.</p>
      </LegalSection>
    </LegalPage>
  );
}
