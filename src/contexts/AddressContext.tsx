import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { Address, UserAddress } from "../types";

// ─── DB ↔ TS mapper ───────────────────────────────────────────────────────────

function fromRow(row: Record<string, any>): UserAddress {
  return {
    id:            row.id,
    userId:        row.user_id,
    recipientName: row.recipient_name,
    phone:         row.phone,
    postalCode:    row.postal_code,
    street:        row.street,
    number:        row.number,
    complement:    row.complement ?? undefined,
    neighborhood:  row.neighborhood,
    city:          row.city,
    state:         row.state,
    isDefault:     row.is_default,
    createdAt:     row.created_at,
  };
}

function toInsert(userId: string, data: Address, isDefault: boolean) {
  return {
    user_id:       userId,
    recipient_name: data.recipientName,
    phone:         data.phone,
    postal_code:   data.postalCode,
    street:        data.street,
    number:        data.number,
    complement:    data.complement ?? null,
    neighborhood:  data.neighborhood,
    city:          data.city,
    state:         data.state,
    is_default:    isDefault,
  };
}

function toUpdate(data: Partial<Address>) {
  const patch: Record<string, any> = {};
  if (data.recipientName !== undefined) patch.recipient_name = data.recipientName;
  if (data.phone         !== undefined) patch.phone          = data.phone;
  if (data.postalCode    !== undefined) patch.postal_code    = data.postalCode;
  if (data.street        !== undefined) patch.street         = data.street;
  if (data.number        !== undefined) patch.number         = data.number;
  if ("complement"       in data)       patch.complement     = data.complement ?? null;
  if (data.neighborhood  !== undefined) patch.neighborhood   = data.neighborhood;
  if (data.city          !== undefined) patch.city           = data.city;
  if (data.state         !== undefined) patch.state          = data.state;
  return patch;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AddressContextValue {
  addresses: UserAddress[];
  defaultAddress: UserAddress | null;
  loading: boolean;
  fetchAddresses: () => Promise<void>;
  createAddress: (data: Address, makeDefault?: boolean) => Promise<UserAddress>;
  updateAddress: (id: string, data: Partial<Address>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
}

const AddressContext = createContext<AddressContextValue>({
  addresses: [],
  defaultAddress: null,
  loading: false,
  fetchAddresses: async () => {},
  createAddress: async () => { throw new Error("not ready"); },
  updateAddress: async () => {},
  deleteAddress: async () => {},
  setDefaultAddress: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AddressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setAddresses((data ?? []).map(fromRow));
    } catch (err) {
      console.warn("fetchAddresses error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Reload when user changes (login / logout)
  useEffect(() => {
    if (user) {
      fetchAddresses();
    } else {
      setAddresses([]);
    }
  }, [user?.id]);

  const createAddress = useCallback(
    async (data: Address, makeDefault = false): Promise<UserAddress> => {
      if (!user) throw new Error("Usuário não autenticado");

      // If this is the first address, force it as default
      const isDefault = makeDefault || addresses.length === 0;

      // If setting as default, clear current default first
      if (isDefault && addresses.some((a) => a.isDefault)) {
        await supabase
          .from("user_addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      const { data: rows, error } = await supabase
        .from("user_addresses")
        .insert(toInsert(user.id, data, isDefault))
        .select()
        .single();

      if (error) throw error;
      const created = fromRow(rows);

      setAddresses((prev) => {
        const updated = isDefault ? prev.map((a) => ({ ...a, isDefault: false })) : prev;
        return [...updated, created].sort((a, b) =>
          a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1
        );
      });

      return created;
    },
    [user, addresses]
  );

  const updateAddress = useCallback(
    async (id: string, data: Partial<Address>): Promise<void> => {
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("user_addresses")
        .update(toUpdate(data))
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setAddresses((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...data } : a))
      );
    },
    [user]
  );

  const deleteAddress = useCallback(
    async (id: string): Promise<void> => {
      if (!user) throw new Error("Usuário não autenticado");

      const target = addresses.find((a) => a.id === id);

      const { error } = await supabase
        .from("user_addresses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      // If we deleted the default, promote the oldest remaining address
      const remaining = addresses.filter((a) => a.id !== id);
      if (target?.isDefault && remaining.length > 0) {
        const next = remaining[0];
        await supabase
          .from("user_addresses")
          .update({ is_default: true })
          .eq("id", next.id);
        setAddresses(remaining.map((a) => ({ ...a, isDefault: a.id === next.id })));
      } else {
        setAddresses(remaining);
      }
    },
    [user, addresses]
  );

  const setDefaultAddress = useCallback(
    async (id: string): Promise<void> => {
      if (!user) throw new Error("Usuário não autenticado");

      // Clear old default
      await supabase
        .from("user_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      // Set new default
      const { error } = await supabase
        .from("user_addresses")
        .update({ is_default: true })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setAddresses((prev) =>
        prev
          .map((a) => ({ ...a, isDefault: a.id === id }))
          .sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1))
      );
    },
    [user]
  );

  const defaultAddress = addresses.find((a) => a.isDefault) ?? null;

  return (
    <AddressContext.Provider
      value={{
        addresses,
        defaultAddress,
        loading,
        fetchAddresses,
        createAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAddress() {
  return useContext(AddressContext);
}
