"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface OrderItem {
  productId: string;
  title: string;
  storeName: string;
  size: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt: string;
}

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/orders/${orderId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setOrder)
      .catch(() => setNotFound(true));
  }, [orderId]);

  if (notFound) {
    return (
      <main style={{ maxWidth: 600, margin: "60px auto", padding: 16, textAlign: "center" }}>
        <p>Order not found. It may have been created before the server last restarted (orders are in-memory in this demo).</p>
        <Link href="/orders" style={{ color: "#2563eb" }}>
          View order history
        </Link>
      </main>
    );
  }

  if (!order) {
    return <main style={{ maxWidth: 600, margin: "60px auto", padding: 16, textAlign: "center" }}>Loading…</main>;
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "40px 16px" }}>
      <div className="sio-fade-in" style={{ textAlign: "center", marginBottom: 32 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#dcfce7",
            color: "#16a34a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: 28,
          }}
        >
          ✓
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Order confirmed</h1>
        <p style={{ color: "#64748b", fontSize: 14 }}>
          Order <strong>{order.id}</strong> · placed {new Date(order.createdAt).toLocaleString("en-IN")}
        </p>
        <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>
          No real payment was taken — this demo stands in for the Razorpay/Cashfree checkout in{" "}
          <code>docs/04-monetization-and-billing.md</code>.
        </p>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 16 }}>
        {order.items.map((item) => (
          <div key={`${item.productId}-${item.size}`} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: "1px solid #f8fafc" }}>
            <img src={item.imageUrl} alt={item.title} style={{ width: 60, height: 76, objectFit: "cover", borderRadius: 8 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {item.storeName} · Size {item.size} · Qty {item.quantity}
              </div>
            </div>
            <div style={{ fontWeight: 700 }}>₹{item.price * item.quantity}</div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 16, fontSize: 18, fontWeight: 700 }}>
          <span>Total</span>
          <span>₹{order.total}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "center" }}>
        <Link
          href="/orders"
          style={{ padding: "10px 20px", borderRadius: 999, border: "1px solid #e2e8f0", color: "#0f172a", textDecoration: "none", fontSize: 14 }}
        >
          View order history
        </Link>
        <Link
          href="/"
          style={{ padding: "10px 20px", borderRadius: 999, background: "#0f172a", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}
        >
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
