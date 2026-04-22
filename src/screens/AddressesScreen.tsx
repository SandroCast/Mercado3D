import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "../contexts/ThemeContext";
import { useAddress } from "../contexts/AddressContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { AddressScreen } from "./AddressScreen";
import { UserAddress } from "../types";

// ─── AddressCard ──────────────────────────────────────────────────────────────

function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  deletable,
}: {
  address: UserAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  deletable: boolean;
}) {
  const Colors = useColors();

  return (
    <View style={{
      backgroundColor: Colors.bgCard,
      borderRadius: 14,
      borderWidth: address.isDefault ? 1.5 : 1,
      borderColor: address.isDefault ? Colors.cyan + "88" : Colors.bgBorder,
      padding: 14,
      gap: 10,
    }}>
      {/* Header row */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: Colors.white, fontSize: 14, fontWeight: "700" }}>
              {address.recipientName}
            </Text>
            {address.isDefault && (
              <View style={{
                backgroundColor: Colors.cyan + "22",
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: Colors.cyan + "55",
              }}>
                <Text style={{ color: Colors.cyan, fontSize: 10, fontWeight: "800" }}>PADRÃO</Text>
              </View>
            )}
          </View>
          <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
            {address.phone.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3")}
          </Text>
        </View>
      </View>

      {/* Address details */}
      <View style={{ gap: 2 }}>
        <Text style={{ color: Colors.textGray, fontSize: 13 }}>
          {address.street}, {address.number}
          {address.complement ? ` — ${address.complement}` : ""}
        </Text>
        <Text style={{ color: Colors.textGray, fontSize: 13 }}>
          {address.neighborhood} · {address.city}/{address.state}
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
          CEP {address.postalCode.replace(/(\d{5})(\d{3})/, "$1-$2")}
        </Text>
      </View>

      {/* Actions */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
        {!address.isDefault && (
          <TouchableOpacity
            onPress={onSetDefault}
            activeOpacity={0.8}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: Colors.cyan + "55",
              backgroundColor: Colors.cyan + "10",
            }}
          >
            <Ionicons name="star-outline" size={13} color={Colors.cyan} />
            <Text style={{ color: Colors.cyan, fontSize: 12, fontWeight: "700" }}>
              Definir padrão
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onEdit}
          activeOpacity={0.8}
          style={{
            flex: address.isDefault ? 2 : 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            paddingVertical: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: Colors.bgBorder,
            backgroundColor: Colors.bgCardAlt,
          }}
        >
          <Ionicons name="pencil-outline" size={13} color={Colors.textGray} />
          <Text style={{ color: Colors.textGray, fontSize: 12, fontWeight: "700" }}>Editar</Text>
        </TouchableOpacity>

        {deletable && (
          <TouchableOpacity
            onPress={onDelete}
            activeOpacity={0.8}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: Colors.error + "44",
              backgroundColor: Colors.error + "10",
            }}
          >
            <Ionicons name="trash-outline" size={15} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── AddressesScreen ──────────────────────────────────────────────────────────

interface AddressesScreenProps {
  visible: boolean;
  onClose: () => void;
}

export function AddressesScreen({ visible, onClose }: AddressesScreenProps) {
  const Colors = useColors();
  const { addresses, loading, fetchAddresses, deleteAddress, setDefaultAddress } = useAddress();

  const [addFormVisible, setAddFormVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserAddress | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // id of address being actioned

  const handleSetDefault = async (address: UserAddress) => {
    setActionLoading(address.id);
    try {
      await setDefaultAddress(address.id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    try {
      await deleteAddress(deleteTarget.id);
    } finally {
      setActionLoading(null);
      setDeleteTarget(null);
    }
  };

  const handleEdit = (address: UserAddress) => {
    setEditingAddress(address);
  };

  const handleFormClose = () => {
    setAddFormVisible(false);
    setEditingAddress(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: 16, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: Colors.bgBorder, gap: 12,
        }}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.white, fontSize: 18, fontWeight: "800" }}>
              Meus Endereços
            </Text>
            {addresses.length > 0 && (
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 1 }}>
                {addresses.length} {addresses.length === 1 ? "endereço" : "endereços"} cadastrado{addresses.length !== 1 ? "s" : ""}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setAddFormVisible(true)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 6,
              backgroundColor: Colors.cyan + "18",
              borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
              borderWidth: 1, borderColor: Colors.cyan + "44",
            }}
          >
            <Ionicons name="add" size={16} color={Colors.cyan} />
            <Text style={{ color: Colors.cyan, fontSize: 13, fontWeight: "700" }}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {/* Body */}
        {loading && addresses.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
            <ActivityIndicator size="large" color={Colors.cyan} />
            <Text style={{ color: Colors.textMuted, fontSize: 14 }}>Carregando endereços...</Text>
          </View>
        ) : addresses.length === 0 ? (
          /* Empty state */
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 16 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: Colors.bgCard,
              borderWidth: 1, borderColor: Colors.bgBorder,
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="location-outline" size={36} color={Colors.textMuted} />
            </View>
            <Text style={{ color: Colors.white, fontSize: 17, fontWeight: "800", textAlign: "center" }}>
              Nenhum endereço cadastrado
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              Adicione um endereço para receber seus pedidos e calcular o frete automaticamente.
            </Text>
            <TouchableOpacity
              onPress={() => setAddFormVisible(true)}
              style={{
                marginTop: 8,
                backgroundColor: Colors.cyan,
                borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13,
                flexDirection: "row", alignItems: "center", gap: 8,
              }}
            >
              <Ionicons name="add" size={18} color={Colors.bg} />
              <Text style={{ color: Colors.bg, fontSize: 14, fontWeight: "900" }}>Adicionar endereço</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={fetchAddresses}
                tintColor={Colors.cyan}
              />
            }
          >
            {addresses.map((address) => (
              <View key={address.id} style={{ opacity: actionLoading === address.id ? 0.5 : 1 }}>
                <AddressCard
                  address={address}
                  onEdit={() => handleEdit(address)}
                  onDelete={() => setDeleteTarget(address)}
                  onSetDefault={() => handleSetDefault(address)}
                  deletable={addresses.length > 1}
                />
                {actionLoading === address.id && (
                  <View style={{
                    position: "absolute", inset: 0,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <ActivityIndicator size="small" color={Colors.cyan} />
                  </View>
                )}
              </View>
            ))}

            {/* Info tip */}
            <View style={{
              flexDirection: "row", alignItems: "flex-start", gap: 8,
              backgroundColor: Colors.bgCard,
              borderRadius: 10, padding: 12,
              borderWidth: 1, borderColor: Colors.bgBorder,
            }}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} style={{ marginTop: 1 }} />
              <Text style={{ color: Colors.textMuted, fontSize: 12, flex: 1, lineHeight: 18 }}>
                O endereço padrão é pré-selecionado automaticamente no checkout. Você pode alterá-lo durante a compra.
              </Text>
            </View>
          </ScrollView>
        )}

        {/* Address form modal */}
        <AddressScreen
          visible={addFormVisible || editingAddress !== null}
          onClose={handleFormClose}
          editingAddress={editingAddress}
          onSaved={handleFormClose}
        />

        {/* Delete confirm dialog */}
        <ConfirmDialog
          visible={deleteTarget !== null}
          title="Remover endereço"
          message={`Remover o endereço de "${deleteTarget?.recipientName}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Remover"
          cancelLabel="Cancelar"
          destructive
          icon="trash-outline"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      </SafeAreaView>
    </Modal>
  );
}
