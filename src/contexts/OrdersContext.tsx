import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { Order, OrderStatus, PaymentMethod, OrderItem } from "../types";

// ─── DB ↔ TS mapper ───────────────────────────────────────────────────────────

function fromRow(row: Record<string, any>): Order {
  return {
    id:               row.id,
    status:           row.status as OrderStatus,
    items:            row.items as OrderItem[],
    subtotal:         row.subtotal,
    shippingCost:     row.shipping_cost,
    total:            row.total,
    paymentMethod:    row.payment_method as PaymentMethod,
    shippingAddress:  row.shipping_address ?? undefined,
    selectedShipping: row.selected_shipping ?? undefined,
    mpPreferenceId:   row.mp_preference_id ?? undefined,
    mpPaymentId:      row.mp_payment_id ?? undefined,
    createdAt:        row.created_at,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface OrdersContextValue {
  orders: Order[];
  loading: boolean;
  fetchOrders: () => Promise<void>;
  createOrder: (order: Order) => Promise<Order>;
}

const OrdersContext = createContext<OrdersContextValue>({
  orders:       [],
  loading:      false,
  fetchOrders:  async () => {},
  createOrder:  async () => { throw new Error("not ready"); },
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders((data ?? []).map(fromRow));
    } catch (err) {
      console.warn("fetchOrders error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchOrders();
    else setOrders([]);
  }, [user?.id]);

  const createOrder = useCallback(async (order: Order): Promise<Order> => {
    if (!user) throw new Error("Usuário não autenticado");

    const { error } = await supabase.from("orders").insert({
      id:               order.id,
      user_id:          user.id,
      status:           order.status,
      items:            order.items,
      subtotal:         order.subtotal,
      shipping_cost:    order.shippingCost,
      total:            order.total,
      payment_method:   order.paymentMethod,
      shipping_address: order.shippingAddress ?? null,
      selected_shipping: order.selectedShipping ?? null,
      mp_preference_id: order.mpPreferenceId ?? null,
      mp_payment_id:    order.mpPaymentId ?? null,
    });

    if (error) throw error;

    setOrders((prev) => [order, ...prev]);
    return order;
  }, [user]);

  return (
    <OrdersContext.Provider value={{ orders, loading, fetchOrders, createOrder }}>
      {children}
    </OrdersContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOrders() {
  return useContext(OrdersContext);
}
