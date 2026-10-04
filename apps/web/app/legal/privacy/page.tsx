import { Metadata } from "next";
import { LegalPage, LegalSection } from "../../../components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — SORT NOW",
  description: "How SORT NOW collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="10 September 2026">
      <LegalSection title="1. What we collect">
        <p>
          As a shopper: your pincode or location (to show nearby stores), items you sort or wishlist, and reservation
          details (name, phone, pickup time) needed for a store to identify you when you arrive.
        </p>
        <p>
          As a merchant: your store's details, catalog, and a password (stored as a salted hash — we never see or
          store your password in plain text) used to sign in to the Seller Portal.
        </p>
      </LegalSection>

      <LegalSection title="2. How we use it">
        <p>
          To show you relevant nearby stores and products, to let a merchant fulfill your reservation, and to keep
          the Seller Portal restricted to the merchant who owns each store. We don't sell personal data to third parties.
        </p>
      </LegalSection>

      <LegalSection title="3. What stores see">
        <p>
          A store only sees the reservation details for its own shoppers — name, phone, and what was reserved — never
          your full browsing activity across the platform or other stores.
        </p>
      </LegalSection>

      <LegalSection title="4. Cookies and sessions">
        <p>
          We use a session cookie to keep merchants signed in to the Seller Portal. It's required for the portal to
          function and isn't used for cross-site tracking or advertising.
        </p>
      </LegalSection>

      <LegalSection title="5. Data retention and deletion">
        <p>
          Reservation history is kept to help stores and shoppers track pickups. You can ask us to delete your
          account data at any time through the contact address listed on the site.
        </p>
      </LegalSection>

      <LegalSection title="6. Security">
        <p>
          Passwords are hashed, not stored in plain text. Seller sessions are signed and expire after 7 days. As with
          any platform, no method of storage or transmission is 100% secure, but we take reasonable steps to protect
          your data.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>For privacy questions or data-deletion requests, contact the platform operator's support address listed on the site.</p>
      </LegalSection>
    </LegalPage>
  );
}
