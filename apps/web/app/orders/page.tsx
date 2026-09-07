"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyOrderIds } from "../../lib/orders";

interface Order {
  id: string;
  items: { title: string; quantity: number }[];
  total: number;
  createdAt: string;
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getMyOrderIds();
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(
      ids.map((id) =>
        fetch(`/api/v1/orders/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      setOrders(results.filter(Boolean) as Order[]);
      setLoading(false);
    });
  }, []);

  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: "8px 16px 40px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20, fontWeight: 700 }}>Order History</h1>

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading…</p>
      ) : orders.length === 0 ? (
        <p style={{ color: "#64748b" }}>
          No orders yet.{" "}
          <Link href="/" style={{ color: "#2563eb" }}>
            Start shopping
          </Link>
          .
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="sio-card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#fff",
                borderRadius: 14,
                border: "1px solid #f1f5f9",
                padding: 16,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{order.id}</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  {order.items.length} item{order.items.length > 1 ? "s" : ""} · {new Date(order.createdAt).toLocaleDateString("en-IN")}
                </div>
              </div>
              <div style={{ fontWeight: 700 }}>₹{order.total}</div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
