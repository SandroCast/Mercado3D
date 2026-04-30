import React, { useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "../contexts/ThemeContext";
import { useProducts, DBProduct } from "../contexts/ProductsContext";
import { useDigitalProducts, DBDigitalProduct } from "../contexts/DigitalProductsContext";
import { useAddress } from "../contexts/AddressContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { ConfirmModal } from "../components/ConfirmModal";
import { CreateListingScreen } from "./CreateListingScreen";
import { CreateDigitalListingScreen } from "./CreateDigitalListingScreen";
import { PersonalDataScreen } from "./PersonalDataScreen";
import { AddressesScreen } from "./AddressesScreen";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── ListingCard ──────────────────────────────────────────────────────────────

function ListingCard({
  item,
  isDigital,
  onEdit,
  onDelete,
}: {
  item: DBProduct | DBDigitalProduct;
  isDigital: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Colors = useColors();
  const imageUrl = isDigital
    ? (item as DBDigitalProduct).thumbnail
    : (item as DBProduct).images?.[0];

  return (
    <View style={{
      backgroundColor: Colors.bgCard,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.bgBorder,
      padding: 12,
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
    }}>
      {/* Thumbnail */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 64, height: 64, borderRadius: 10 }}
          resizeMode="cover"
        />
      ) : (
        <View style={{
          width: 64, height: 64, borderRadius: 10,
          backgroundColor: Colors.bgCardAlt,
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons
            name={isDigital ? "document-outline" : "cube-outline"}
            size={26}
            color={Colors.textMuted}
          />
        </View>
      )}

      {/* Info */}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "600" }} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{
            backgroundColor: isDigital ? "#7c3aed22" : "#f9731622",
            borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
          }}>
            <Text style={{
              color: isDigital ? "#a78bfa" : "#fb923c",
              fontSize: 10, fontWeight: "700",
            }}>
              {isDigital ? "Digital" : "Físico"}
            </Text>
          </View>

          {!isDigital && (
            <View style={{
              backgroundColor: (item as DBProduct).inStock ? "#22c55e22" : "#ef444422",
              borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
            }}>
              <Text style={{
                color: (item as DBProduct).inStock ? "#22c55e" : "#ef4444",
                fontSize: 10, fontWeight: "700",
              }}>
                {(item as DBProduct).inStock ? "Em estoque" : "Sem estoque"}
              </Text>
            </View>
          )}
        </View>

        <Text style={{ color: Colors.cyan, fontSize: 15, fontWeight: "900" }}>
          {formatPrice(item.price)}
        </Text>
      </View>

      {/* Ações */}
      <View style={{ gap: 8 }}>
        <TouchableOpacity
          onPress={onEdit}
          activeOpacity={0.7}
          style={{
            width: 34, height: 34, borderRadius: 17,
            backgroundColor: Colors.cyan + "22",
            borderWidth: 1, borderColor: Colors.cyan + "44",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Ionicons name="pencil-outline" size={15} color={Colors.cyan} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          activeOpacity={0.7}
          style={{
            width: 34, height: 34, borderRadius: 17,
            backgroundColor: "#ef444415",
            borderWidth: 1, borderColor: "#ef444433",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Ionicons name="trash-outline" size={15} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── MyListingsScreen ─────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

type FilterTab = "all" | "physical" | "digital";

export function MyListingsScreen({ visible, onClose }: Props) {
  const Colors = useColors();
  const { user } = useAuth();
  const { myProducts,       deleteProduct,        fetchMyProducts }       = useProducts();
  const { myDigitalProducts, deleteDigitalProduct, fetchMyDigitalProducts } = useDigitalProducts();
  const { addresses } = useAddress();

  const [activeFilter,    setActiveFilter]    = useState<FilterTab>("all");
  const [typePickerVisible,       setTypePickerVisible]       = useState(false);
  const [physicalListingType,     setPhysicalListingType]     = useState<"printed" | "equipment">("equipment");
  const [createPhysicalVisible,   setCreatePhysicalVisible]   = useState(false);
  const [createDigitalVisible,    setCreateDigitalVisible]    = useState(false);
  const [editItem,                setEditItem]                = useState<any>(null);
  const [deleteTarget,    setDeleteTarget]    = useState<{ id: string; digital: boolean } | null>(null);
  const [loading,         setLoading]         = useState(false);
  const [personalDataVisible, setPersonalDataVisible] = useState(false);
  const [addressesVisible,    setAddressesVisible]    = useState(false);
  const [blockModal, setBlockModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const handleAnunciar = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("cpf_cnpj, phone, person_type, birth_date")
      .eq("id", user.id)
      .single();

    const hasPersonalData =
      data?.cpf_cnpj && data?.phone &&
      (data?.person_type === "pj" || data?.birth_date);

    if (!hasPersonalData) {
      setBlockModal({
        title: "Dados pessoais incompletos",
        message: "Para anunciar, preencha seus dados pessoais (CPF/CNPJ, telefone e data de nascimento).",
        onConfirm: () => { setBlockModal(null); setPersonalDataVisible(true); },
      });
      return;
    }

    if (addresses.length === 0) {
      setBlockModal({
        title: "Endereço obrigatório",
        message: "Para anunciar, cadastre pelo menos um endereço de entrega.",
        onConfirm: () => { setBlockModal(null); setAddressesVisible(true); },
      });
      return;
    }

    setEditItem(null);
    setTypePickerVisible(true);
  }, [user, addresses]);

  const onRefresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMyProducts(), fetchMyDigitalProducts()]);
    setLoading(false);
  }, [fetchMyProducts, fetchMyDigitalProducts]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.digital) await deleteDigitalProduct(deleteTarget.id);
      else                      await deleteProduct(deleteTarget.id);
    } catch (e) {
      console.warn("delete error:", e);
    } finally {
      setDeleteTarget(null);
    }
  };

  const allItems: { item: DBProduct | DBDigitalProduct; isDigital: boolean }[] = [
    ...myProducts.map((p) => ({ item: p as DBProduct | DBDigitalProduct, isDigital: false })),
    ...myDigitalProducts.map((p) => ({ item: p as DBProduct | DBDigitalProduct, isDigital: true })),
  ].sort((a, b) => new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime());

  const filtered =
    activeFilter === "physical" ? allItems.filter((x) => !x.isDigital) :
    activeFilter === "digital"  ? allItems.filter((x) =>  x.isDigital) :
    allItems;

  const totalPhysical = myProducts.length;
  const totalDigital  = myDigitalProducts.length;

  return (
    <>
      <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
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
                Meus Anúncios
              </Text>
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 1 }}>
                {allItems.length} {allItems.length === 1 ? "anúncio" : "anúncios"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleAnunciar}
              activeOpacity={0.8}
              style={{
                backgroundColor: Colors.cyan,
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Ionicons name="add" size={18} color={Colors.bg} />
              <Text style={{ color: Colors.bg, fontSize: 13, fontWeight: "800" }}>Anunciar</Text>
            </TouchableOpacity>
          </View>

          {/* Filtros */}
          <View style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            paddingVertical: 10,
            gap: 8,
            borderBottomWidth: 1,
            borderBottomColor: Colors.bgBorder,
          }}>
            {([
              { key: "all",      label: "Todos",   count: allItems.length },
              { key: "physical", label: "Físicos", count: totalPhysical },
              { key: "digital",  label: "Digitais",count: totalDigital },
            ] as const).map((f) => {
              const active = activeFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setActiveFilter(f.key)}
                  activeOpacity={0.75}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: active ? Colors.cyan : Colors.bgBorder,
                    backgroundColor: active ? Colors.cyan + "22" : Colors.bgCard,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Text style={{
                    color: active ? Colors.cyan : Colors.textMuted,
                    fontSize: 12, fontWeight: active ? "700" : "500",
                  }}>
                    {f.label}
                  </Text>
                  <View style={{
                    backgroundColor: active ? Colors.cyan : Colors.bgBorder,
                    borderRadius: 8, minWidth: 16, height: 16,
                    alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
                  }}>
                    <Text style={{
                      color: active ? Colors.bg : Colors.textMuted,
                      fontSize: 10, fontWeight: "800",
                    }}>
                      {f.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Lista */}
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={Colors.cyan} />
            }
          >
            {filtered.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 60, gap: 16 }}>
                <View style={{
                  width: 80, height: 80, borderRadius: 40,
                  backgroundColor: Colors.bgCard,
                  borderWidth: 1, borderColor: Colors.bgBorder,
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Ionicons name="megaphone-outline" size={36} color={Colors.textMuted} />
                </View>
                <Text style={{ color: Colors.white, fontSize: 17, fontWeight: "800" }}>
                  Nenhum anúncio ainda
                </Text>
                <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
                  Toque em "Anunciar" para publicar seu primeiro produto.
                </Text>
              </View>
            ) : (
              filtered.map(({ item, isDigital }) => (
                <ListingCard
                  key={item.id}
                  item={item}
                  isDigital={isDigital}
                  onEdit={() => {
                    setEditItem({ ...item, isDigital });
                    if (isDigital) setCreateDigitalVisible(true);
                    else           setCreatePhysicalVisible(true);
                  }}
                  onDelete={() => setDeleteTarget({ id: item.id, digital: isDigital })}
                />
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal seletor de tipo */}
      <Modal
        visible={typePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTypePickerVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "#000000aa", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setTypePickerVisible(false)}
        >
          <View style={{
            backgroundColor: Colors.bgCard,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, gap: 12,
          }}>
            <Text style={{ color: Colors.white, fontSize: 17, fontWeight: "800", marginBottom: 4 }}>
              O que você quer anunciar?
            </Text>

            <TouchableOpacity
              onPress={() => { setTypePickerVisible(false); setPhysicalListingType("printed"); setCreatePhysicalVisible(true); }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 14,
                backgroundColor: Colors.bgCardAlt, borderRadius: 14,
                padding: 16, borderWidth: 1, borderColor: Colors.bgBorder,
              }}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: Colors.cyan + "20",
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="cube-outline" size={22} color={Colors.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.white, fontSize: 15, fontWeight: "700" }}>Produtos Impressos</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  Miniaturas, decoração, peças customizadas...
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setTypePickerVisible(false); setPhysicalListingType("equipment"); setCreatePhysicalVisible(true); }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 14,
                backgroundColor: Colors.bgCardAlt, borderRadius: 14,
                padding: 16, borderWidth: 1, borderColor: Colors.bgBorder,
              }}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: Colors.orange + "20",
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="print-outline" size={22} color={Colors.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.white, fontSize: 15, fontWeight: "700" }}>Impressoras e Itens</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  Impressoras, filamentos, peças, ferramentas...
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setTypePickerVisible(false); setCreateDigitalVisible(true); }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 14,
                backgroundColor: Colors.bgCardAlt, borderRadius: 14,
                padding: 16, borderWidth: 1, borderColor: Colors.bgBorder,
              }}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: Colors.purple + "20",
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="layers-outline" size={22} color={Colors.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.white, fontSize: 15, fontWeight: "700" }}>Modelo 3D / Digital</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  Arquivos STL, OBJ, STEP, G-Code...
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <CreateListingScreen
        visible={createPhysicalVisible}
        onClose={() => { setCreatePhysicalVisible(false); setEditItem(null); }}
        editProduct={editItem?.isDigital ? undefined : editItem}
        listingType={physicalListingType}
      />

      <CreateDigitalListingScreen
        visible={createDigitalVisible}
        onClose={() => { setCreateDigitalVisible(false); setEditItem(null); }}
        editProduct={editItem?.isDigital ? editItem : undefined}
      />

      <ConfirmModal
        visible={blockModal !== null}
        icon="alert-circle-outline"
        title={blockModal?.title ?? ""}
        message={blockModal?.message ?? ""}
        confirmLabel="Preencher"
        cancelLabel="Agora não"
        onConfirm={blockModal?.onConfirm ?? (() => {})}
        onCancel={() => setBlockModal(null)}
      />

      <PersonalDataScreen
        visible={personalDataVisible}
        onClose={() => setPersonalDataVisible(false)}
      />

      <AddressesScreen
        visible={addressesVisible}
        onClose={() => setAddressesVisible(false)}
      />

      <ConfirmModal
        visible={deleteTarget !== null}
        icon="trash-outline"
        title="Excluir anúncio"
        message="Tem certeza que deseja excluir este anúncio? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
