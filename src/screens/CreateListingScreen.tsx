import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
  StatusBar,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import {
  useProducts,
  CreateProductInput,
  VariantInput,
  DBProduct,
} from "../contexts/ProductsContext";
import { pickImages, uploadImages } from "../services/imageUpload";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "impressoras",  label: "Impressoras 3D",  icon: "print-outline"          as const },
  { id: "filamentos",   label: "Filamentos",       icon: "color-palette-outline"  as const },
  { id: "pecas",        label: "Peças",            icon: "construct-outline"      as const },
  { id: "ferramentas",  label: "Ferramentas",      icon: "hammer-outline"         as const },
  { id: "eletronicos",  label: "Eletrônicos",      icon: "hardware-chip-outline"  as const },
  { id: "acessorios",   label: "Acessórios",       icon: "bag-outline"            as const },
  { id: "outros",       label: "Outros",           icon: "grid-outline"           as const },
];

const PRESET_COLORS = [
  "Preto", "Branco", "Cinza", "Vermelho", "Azul",
  "Verde", "Amarelo", "Laranja", "Rosa", "Roxo",
];

const PRESET_SIZES = ["PP", "P", "M", "G", "GG", "GGG", "Único"];

const TOTAL_STEPS = 5;

const STEP_TITLES: Record<number, string> = {
  1: "Categoria",
  2: "Detalhes",
  3: "Variantes",
  4: "Preço e Envio",
  5: "Revisar",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface VariantRow {
  localId: string;
  color:   string;
  size:    string;
  stock:   string;
  price:   string;
  images:  string[];
}

function makeVariant(): VariantRow {
  return {
    localId: Math.random().toString(36).slice(2),
    color: "",
    size:  "",
    stock: "1",
    price: "",
    images: [],
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateListingScreenProps {
  visible:      boolean;
  onClose:      () => void;
  editProduct?: DBProduct;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CreateListingScreen({
  visible,
  onClose,
  editProduct,
}: CreateListingScreenProps) {
  const Colors = useColors();
  const { user }   = useAuth();
  const { createProduct, updateProduct, fetchVariants } = useProducts();

  const isEdit = !!editProduct;

  const [step,      setStep]      = useState(1);
  const [saving,    setSaving]    = useState(false);
  const [saveLabel, setSaveLabel] = useState("");

  // Form
  const [category,      setCategory]      = useState("");
  const [condition,     setCondition]     = useState<"new" | "used">("new");
  const [title,         setTitle]         = useState("");
  const [brand,         setBrand]         = useState("");
  const [description,   setDescription]   = useState("");
  const [variants,      setVariants]      = useState<VariantRow[]>([makeVariant()]);
  const [price,         setPrice]         = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [freeShipping,  setFreeShipping]  = useState(false);

  // Load edit data
  useEffect(() => {
    if (!editProduct || !visible) return;
    setStep(1);
    setCategory(editProduct.category);
    setCondition(editProduct.condition);
    setTitle(editProduct.title);
    setBrand(editProduct.brand ?? "");
    setDescription(editProduct.description);
    setPrice(editProduct.price.toFixed(2));
    setOriginalPrice(editProduct.originalPrice?.toFixed(2) ?? "");
    setFreeShipping(editProduct.freeShipping);

    fetchVariants(editProduct.id).then((dbV) => {
      setVariants(
        dbV.length > 0
          ? dbV.map((v) => ({
              localId: v.id,
              color:   v.attributes["Cor"]     ?? "",
              size:    v.attributes["Tamanho"] ?? "",
              stock:   v.stock.toString(),
              price:   v.price?.toFixed(2)     ?? "",
              images:  v.images,
            }))
          : [makeVariant()]
      );
    });
  }, [editProduct?.id, visible]);

  const handleClose = () => {
    setStep(1);
    setCategory(""); setCondition("new");
    setTitle(""); setBrand(""); setDescription("");
    setVariants([makeVariant()]);
    setPrice(""); setOriginalPrice(""); setFreeShipping(false);
    setSaving(false);
    onClose();
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return !!category;
      case 2: return title.trim().length >= 3 && description.trim().length >= 3;
      case 3: return (
        variants.length > 0 &&
        variants.every((v) => {
          const s = parseInt(v.stock);
          return !isNaN(s) && s >= 0;
        })
      );
      case 4: return parseFloat(price) > 0;
      default: return true;
    }
  };

  const handleNext = () => { if (step < TOTAL_STEPS) setStep((s) => s + 1); };
  const handleBack = () => { if (step > 1)           setStep((s) => s - 1); };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      setSaveLabel("Enviando fotos das variantes...");
      const variantInputs: VariantInput[] = await Promise.all(variants.map(async (v) => {
        const attrs: Record<string, string> = {};
        if (v.color.trim()) attrs["Cor"]     = v.color.trim();
        if (v.size.trim())  attrs["Tamanho"] = v.size.trim();
        const localImgs  = v.images.filter((u) => !u.startsWith("http"));
        const remoteImgs = v.images.filter((u) =>  u.startsWith("http"));
        const uploaded   = localImgs.length > 0 ? await uploadImages(user.id, localImgs) : [];
        return {
          attributes: attrs,
          stock: Math.max(0, parseInt(v.stock) || 0),
          price: v.price ? parseFloat(v.price) : undefined,
          images: [...remoteImgs, ...uploaded],
        };
      }));

      // Product-level images are derived from the first photo of each variant
      const allImages = variantInputs
        .map((v) => v.images?.[0])
        .filter((url): url is string => !!url);

      const variantAttributes = [
        ...new Set(variantInputs.flatMap((v) => Object.keys(v.attributes))),
      ];

      const input: CreateProductInput = {
        title:             title.trim(),
        description:       description.trim(),
        price:             parseFloat(price),
        originalPrice:     originalPrice ? parseFloat(originalPrice) : undefined,
        brand:             brand.trim() || undefined,
        category,
        condition,
        images:            allImages,
        inStock:           variantInputs.some((v) => v.stock > 0),
        freeShipping,
        variantAttributes,
      };

      setSaveLabel("Publicando...");
      if (isEdit) {
        await updateProduct(editProduct!.id, input, variantInputs);
      } else {
        await createProduct(input, variantInputs);
      }

      handleClose();
    } catch (err) {
      console.warn("CreateListing save error:", err);
    } finally {
      setSaving(false);
      setSaveLabel("");
    }
  };

  // ── Step content ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 1: return (
        <Step1Category
          category={category}   setCategory={setCategory}
          condition={condition} setCondition={setCondition}
        />
      );
      case 2: return (
        <Step3Details
          title={title}             setTitle={setTitle}
          brand={brand}             setBrand={setBrand}
          description={description} setDescription={setDescription}
        />
      );
      case 3: return (
        <Step4Variants variants={variants} setVariants={setVariants} />
      );
      case 4: return (
        <Step5Pricing
          price={price}                 setPrice={setPrice}
          originalPrice={originalPrice} setOriginalPrice={setOriginalPrice}
          freeShipping={freeShipping}   setFreeShipping={setFreeShipping}
        />
      );
      case 5: return (
        <Step5Review
          title={title}           brand={brand}
          category={category}     condition={condition}
          variants={variants}
          price={price}           originalPrice={originalPrice}
          freeShipping={freeShipping}
        />
      );
    }
  };

  const isLastStep = step === TOTAL_STEPS;
  const btnEnabled = isLastStep ? !saving : canProceed();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top"]}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 12,
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: Colors.bgCard,
          borderBottomWidth: 1, borderBottomColor: Colors.bgBorder,
        }}>
          <TouchableOpacity onPress={handleClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={{ flex: 1, color: Colors.white, fontSize: 16, fontWeight: "700" }}>
            {isEdit ? "Editar anúncio" : "Anunciar produto"}
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
            {step}/{TOTAL_STEPS}
          </Text>
        </View>

        {/* ── Progress bar ─────────────────────────────────────────────────── */}
        <View style={{ height: 3, backgroundColor: Colors.bgBorder }}>
          <View style={{
            width: `${(step / TOTAL_STEPS) * 100}%`,
            height: "100%",
            backgroundColor: Colors.cyan,
            borderRadius: 2,
          }} />
        </View>

        {/* ── Step label ───────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 4 }}>
          <Text style={{
            color: Colors.cyan, fontSize: 11, fontWeight: "700",
            letterSpacing: 1.2, textTransform: "uppercase",
          }}>
            Etapa {step} de {TOTAL_STEPS}
          </Text>
          <Text style={{ color: Colors.white, fontSize: 24, fontWeight: "900", marginTop: 2 }}>
            {STEP_TITLES[step]}
          </Text>
        </View>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={80}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        >
          {renderStep()}
        </KeyboardAwareScrollView>

        {/* ── Footer fixo no fundo ──────────────────────────────────────────── */}
        <View style={{
          flexDirection: "row", gap: 10,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: Platform.OS === "ios" ? 28 : 14,
          backgroundColor: Colors.bgCard,
          borderTopWidth: 1, borderTopColor: Colors.bgBorder,
        }}>
          {step > 1 && (
            <TouchableOpacity
              onPress={handleBack}
              disabled={saving}
              style={{
                width: 52, height: 50, borderRadius: 12,
                backgroundColor: Colors.bgCardAlt,
                borderWidth: 1, borderColor: Colors.bgBorder,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.white} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={isLastStep ? handleSave : handleNext}
            disabled={!btnEnabled}
            style={{ flex: 1, borderRadius: 12, overflow: "hidden" }}
          >
            <LinearGradient
              colors={
                !btnEnabled
                  ? [Colors.bgBorder, Colors.bgBorder]
                  : isLastStep
                  ? ["#22c55e", "#16a34a"]
                  : ["#22d3ee", "#0891b2"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                height: 50,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.textMuted} />
              ) : (
                <Ionicons
                  name={isLastStep ? "checkmark-circle-outline" : "arrow-forward"}
                  size={18}
                  color={btnEnabled ? "#0d1117" : Colors.textMuted}
                />
              )}
              <Text style={{
                color: btnEnabled ? "#0d1117" : Colors.textMuted,
                fontSize: 15, fontWeight: "800",
              }}>
                {saving
                  ? (saveLabel || "Publicando...")
                  : isLastStep
                  ? (isEdit ? "Salvar alterações" : "Publicar anúncio")
                  : "Próximo"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Step 1: Categoria ────────────────────────────────────────────────────────

function Step1Category({
  category, setCategory, condition, setCondition,
}: {
  category: string;          setCategory:  (v: string) => void;
  condition: "new" | "used"; setCondition: (v: "new" | "used") => void;
}) {
  const Colors = useColors();
  return (
    <View style={{ gap: 24 }}>
      <View>
        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 12 }}>
          Selecione a categoria *
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {CATEGORIES.map((cat) => {
            const sel = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 8,
                  paddingHorizontal: 14, paddingVertical: 11,
                  borderRadius: 12,
                  backgroundColor: sel ? Colors.cyan + "20" : Colors.bgCard,
                  borderWidth: 1.5,
                  borderColor: sel ? Colors.cyan : Colors.bgBorder,
                }}
              >
                <Ionicons name={cat.icon} size={17} color={sel ? Colors.cyan : Colors.textGray} />
                <Text style={{
                  color: sel ? Colors.cyan : Colors.white,
                  fontSize: 13, fontWeight: sel ? "700" : "500",
                }}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 12 }}>
          Condição do produto *
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {(["new", "used"] as const).map((c) => {
            const sel   = condition === c;
            const label = c === "new" ? "Novo" : "Usado";
            const icon  = c === "new" ? "sparkles-outline" : "refresh-outline";
            const color = c === "new" ? Colors.success : Colors.warning;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setCondition(c)}
                style={{
                  flex: 1, flexDirection: "row", alignItems: "center",
                  justifyContent: "center", gap: 8,
                  paddingVertical: 14, borderRadius: 12,
                  backgroundColor: sel ? color + "20" : Colors.bgCard,
                  borderWidth: 1.5,
                  borderColor: sel ? color : Colors.bgBorder,
                }}
              >
                <Ionicons name={icon as any} size={18} color={sel ? color : Colors.textGray} />
                <Text style={{ color: sel ? color : Colors.white, fontSize: 14, fontWeight: "700" }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Step 3: Detalhes ─────────────────────────────────────────────────────────

function Step3Details({
  title, setTitle, brand, setBrand, description, setDescription,
}: {
  title: string;       setTitle:       (v: string) => void;
  brand: string;       setBrand:       (v: string) => void;
  description: string; setDescription: (v: string) => void;
}) {
  const Colors = useColors();

  const inputStyle = {
    backgroundColor: Colors.bgCard,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.bgBorder,
    color: Colors.white as string, fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 12,
  };

  return (
    <View style={{ gap: 20 }}>
      <View>
        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
          Título do anúncio *
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ex: Roda Dentada GT2 20 dentes para Ender 3"
          placeholderTextColor={Colors.textMuted}
          style={[inputStyle, { borderColor: title.trim().length > 0 && title.trim().length < 3 ? "#ef4444" : Colors.bgBorder }]}
          maxLength={120}
        />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          {title.trim().length > 0 && title.trim().length < 3 ? (
            <Text style={{ color: "#ef4444", fontSize: 11 }}>Mínimo 3 caracteres</Text>
          ) : <View />}
          <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{title.length}/120</Text>
        </View>
      </View>

      <View>
        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
          Marca{" "}
          <Text style={{ color: Colors.textMuted, fontWeight: "400" }}>(opcional)</Text>
        </Text>
        <TextInput
          value={brand}
          onChangeText={setBrand}
          placeholder="Ex: Creality, BambuLab, Prusa..."
          placeholderTextColor={Colors.textMuted}
          style={inputStyle}
          maxLength={60}
        />
      </View>

      <View>
        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
          Descrição *
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Descreva o produto com detalhes: material, dimensões, compatibilidade..."
          placeholderTextColor={Colors.textMuted}
          style={[inputStyle, { minHeight: 140, textAlignVertical: "top" }]}
          multiline
          maxLength={2000}
        />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          {description.trim().length > 0 && description.trim().length < 3 ? (
            <Text style={{ color: "#ef4444", fontSize: 11 }}>Mínimo 3 caracteres</Text>
          ) : <View />}
          <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{description.length}/2000</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Step 4: Variantes ────────────────────────────────────────────────────────

function Step4Variants({
  variants, setVariants,
}: {
  variants:    VariantRow[];
  setVariants: React.Dispatch<React.SetStateAction<VariantRow[]>>;
}) {
  const Colors = useColors();

  const update = (localId: string, field: keyof VariantRow, val: string) =>
    setVariants((prev) => prev.map((v) => v.localId === localId ? { ...v, [field]: val } : v));

  const updateImages = (localId: string, imgs: string[]) =>
    setVariants((prev) => prev.map((v) => v.localId === localId ? { ...v, images: imgs } : v));

  const remove = (localId: string) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((v) => v.localId !== localId));
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={{
        flexDirection: "row", gap: 10, padding: 12,
        backgroundColor: Colors.purple + "15", borderRadius: 10,
        borderWidth: 1, borderColor: Colors.purple + "44",
      }}>
        <Ionicons name="information-circle-outline" size={18} color={Colors.purple} />
        <Text style={{ flex: 1, color: Colors.textGray, fontSize: 13, lineHeight: 19 }}>
          Todo produto precisa de pelo menos uma variante. Se não houver variações, deixe cor e tamanho em branco e preencha apenas o estoque.
        </Text>
      </View>

      {variants.map((v, idx) => (
        <VariantCard
          key={v.localId}
          variant={v}
          index={idx}
          canDelete={variants.length > 1}
          onUpdate={(field, val) => update(v.localId, field, val)}
          onUpdateImages={(imgs) => updateImages(v.localId, imgs)}
          onDelete={() => remove(v.localId)}
        />
      ))}

      <TouchableOpacity
        onPress={() => setVariants((prev) => [...prev, makeVariant()])}
        style={{
          flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
          paddingVertical: 14, borderRadius: 12,
          borderWidth: 2, borderStyle: "dashed", borderColor: Colors.cyan + "55",
          backgroundColor: Colors.cyan + "08",
        }}
      >
        <Ionicons name="add-circle-outline" size={20} color={Colors.cyan} />
        <Text style={{ color: Colors.cyan, fontSize: 14, fontWeight: "700" }}>
          Adicionar variante
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function VariantCard({
  variant, index, canDelete, onUpdate, onUpdateImages, onDelete,
}: {
  variant:         VariantRow;
  index:           number;
  canDelete:       boolean;
  onUpdate:        (field: keyof VariantRow, val: string) => void;
  onUpdateImages:  (images: string[]) => void;
  onDelete:        () => void;
}) {
  const Colors = useColors();

  const chipInput = {
    backgroundColor: Colors.bg,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.bgBorder,
    color: Colors.white as string, fontSize: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    marginTop: 6,
  };

  return (
    <View style={{
      backgroundColor: Colors.bgCard, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.bgBorder,
      padding: 16, gap: 14,
    }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{
          width: 26, height: 26, borderRadius: 13,
          backgroundColor: Colors.cyan + "22",
          alignItems: "center", justifyContent: "center", marginRight: 10,
        }}>
          <Text style={{ color: Colors.cyan, fontSize: 12, fontWeight: "800" }}>{index + 1}</Text>
        </View>
        <Text style={{ flex: 1, color: Colors.white, fontSize: 14, fontWeight: "700" }}>
          Variante {index + 1}
        </Text>
        {canDelete && (
          <TouchableOpacity onPress={onDelete} style={{ padding: 6 }}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* Color */}
      <View>
        <Text style={{ color: Colors.textGray, fontSize: 12, fontWeight: "600" }}>Cor</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {PRESET_COLORS.map((c) => {
            const sel = variant.color === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => onUpdate("color", sel ? "" : c)}
                style={{
                  paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                  backgroundColor: sel ? Colors.cyan + "22" : Colors.bg,
                  borderWidth: 1, borderColor: sel ? Colors.cyan : Colors.bgBorder,
                }}
              >
                <Text style={{
                  color: sel ? Colors.cyan : Colors.white,
                  fontSize: 12, fontWeight: sel ? "700" : "400",
                }}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput
          value={variant.color}
          onChangeText={(val) => onUpdate("color", val)}
          placeholder="Ou digite outra cor..."
          placeholderTextColor={Colors.textMuted}
          style={chipInput}
        />
      </View>

      {/* Size */}
      <View>
        <Text style={{ color: Colors.textGray, fontSize: 12, fontWeight: "600" }}>Tamanho</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {PRESET_SIZES.map((s) => {
            const sel = variant.size === s;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => onUpdate("size", sel ? "" : s)}
                style={{
                  paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                  backgroundColor: sel ? Colors.purple + "22" : Colors.bg,
                  borderWidth: 1, borderColor: sel ? Colors.purple : Colors.bgBorder,
                }}
              >
                <Text style={{
                  color: sel ? Colors.purple : Colors.white,
                  fontSize: 12, fontWeight: sel ? "700" : "400",
                }}>
                  {s}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput
          value={variant.size}
          onChangeText={(val) => onUpdate("size", val)}
          placeholder="Ou digite outro tamanho..."
          placeholderTextColor={Colors.textMuted}
          style={chipInput}
        />
      </View>

      {/* Stock + Price */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.textGray, fontSize: 12, fontWeight: "600", marginBottom: 6 }}>
            Estoque *
          </Text>
          <TextInput
            value={variant.stock}
            onChangeText={(val) => onUpdate("stock", val.replace(/\D/g, ""))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            style={chipInput}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.textGray, fontSize: 12, fontWeight: "600", marginBottom: 6 }}>
            Preço da variante
          </Text>
          <TextInput
            value={variant.price}
            onChangeText={(val) => onUpdate("price", val.replace(/[^\d.,]/g, "").replace(",", "."))}
            keyboardType="decimal-pad"
            placeholder="Padrão"
            placeholderTextColor={Colors.textMuted}
            style={chipInput}
          />
        </View>
      </View>

      {/* Fotos da variante */}
      <View>
        <Text style={{ color: Colors.textGray, fontSize: 12, fontWeight: "600", marginBottom: 8 }}>
          Fotos{" "}
          <Text style={{ color: Colors.textMuted, fontWeight: "400" }}>
            ({variant.images.length}/6)
          </Text>
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {variant.images.map((uri, i) => (
              <View key={i} style={{ position: "relative" }}>
                <Image
                  source={{ uri }}
                  style={{ width: 72, height: 72, borderRadius: 8 }}
                  resizeMode="cover"
                />
                {i === 0 && (
                  <View style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    backgroundColor: "#00000088", borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
                    alignItems: "center", paddingVertical: 2,
                  }}>
                    <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>CAPA</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => onUpdateImages(variant.images.filter((_, j) => j !== i))}
                  style={{
                    position: "absolute", top: -6, right: -6,
                    backgroundColor: Colors.error, borderRadius: 10,
                    width: 20, height: 20, alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {variant.images.length < 6 && (
              <TouchableOpacity
                onPress={async () => {
                  const uris = await pickImages(6 - variant.images.length);
                  if (uris.length) onUpdateImages([...variant.images, ...uris].slice(0, 6));
                }}
                style={{
                  width: 72, height: 72, borderRadius: 8,
                  borderWidth: 1.5, borderStyle: "dashed", borderColor: Colors.cyan + "55",
                  backgroundColor: Colors.cyan + "08",
                  alignItems: "center", justifyContent: "center", gap: 4,
                }}
              >
                <Ionicons name="camera-outline" size={22} color={Colors.cyan} />
                <Text style={{ color: Colors.cyan, fontSize: 10, fontWeight: "600" }}>Fotos</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Step 5: Preço e Envio ────────────────────────────────────────────────────

function Step5Pricing({
  price, setPrice, originalPrice, setOriginalPrice, freeShipping, setFreeShipping,
}: {
  price: string;         setPrice:         (v: string) => void;
  originalPrice: string; setOriginalPrice: (v: string) => void;
  freeShipping: boolean; setFreeShipping:  (v: boolean) => void;
}) {
  const Colors   = useColors();
  const cleanNum = (v: string) => v.replace(/[^\d.,]/g, "").replace(",", ".");

  const inputStyle = {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.bgBorder,
    color: Colors.white as string, fontSize: 18, fontWeight: "700" as const,
    paddingHorizontal: 14, paddingVertical: 14,
  };

  const p  = parseFloat(price)         || 0;
  const op = parseFloat(originalPrice) || 0;
  const discount = op > p && p > 0
    ? Math.round(((op - p) / op) * 100)
    : null;

  return (
    <View style={{ gap: 22 }}>
      <View>
        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 10 }}>
          Preço base *
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: Colors.textGray, fontSize: 18, fontWeight: "700" }}>R$</Text>
          <TextInput
            value={price}
            onChangeText={(v) => setPrice(cleanNum(v))}
            keyboardType="decimal-pad"
            placeholder="0,00"
            placeholderTextColor={Colors.textMuted}
            style={inputStyle}
          />
        </View>
        <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 6 }}>
          Se as variantes tiverem preços diferentes, use este como referência.
        </Text>
      </View>

      <View>
        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 10 }}>
          Preço original{" "}
          <Text style={{ color: Colors.textMuted, fontWeight: "400" }}>(opcional — aparece riscado)</Text>
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: Colors.textGray, fontSize: 18, fontWeight: "700" }}>R$</Text>
          <TextInput
            value={originalPrice}
            onChangeText={(v) => setOriginalPrice(cleanNum(v))}
            keyboardType="decimal-pad"
            placeholder="0,00"
            placeholderTextColor={Colors.textMuted}
            style={inputStyle}
          />
        </View>
      </View>

      {discount !== null && (
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 10,
          backgroundColor: Colors.success + "15", borderRadius: 10, padding: 12,
          borderWidth: 1, borderColor: Colors.success + "44",
        }}>
          <Ionicons name="pricetag-outline" size={18} color={Colors.success} />
          <Text style={{ color: Colors.success, fontSize: 13, fontWeight: "600" }}>
            Desconto de {discount}% será exibido no anúncio
          </Text>
        </View>
      )}

      <View style={{
        flexDirection: "row", alignItems: "center",
        backgroundColor: Colors.bgCard, borderRadius: 12,
        borderWidth: 1, borderColor: Colors.bgBorder,
        padding: 16, gap: 12,
      }}>
        <Ionicons
          name="cube-outline"
          size={22}
          color={freeShipping ? Colors.success : Colors.textGray}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.white, fontSize: 14, fontWeight: "700" }}>Frete grátis</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>
            Produtos com frete grátis vendem mais
          </Text>
        </View>
        <Switch
          value={freeShipping}
          onValueChange={setFreeShipping}
          trackColor={{ false: Colors.bgBorder, true: Colors.success + "88" }}
          thumbColor={freeShipping ? Colors.success : Colors.textMuted}
        />
      </View>
    </View>
  );
}

// ─── Step 5: Revisar ──────────────────────────────────────────────────────────

function Step5Review({
  title, brand, category, condition, variants, price, originalPrice, freeShipping,
}: {
  title: string;        brand: string;
  category: string;     condition: "new" | "used";
  variants: VariantRow[];
  price: string;        originalPrice: string;
  freeShipping: boolean;
}) {
  const Colors      = useColors();
  const cover       = variants[0]?.images[0];
  const totalStock  = variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
  const totalPhotos = variants.reduce((sum, v) => sum + v.images.length, 0);
  const catLabel    = CATEGORIES.find((c) => c.id === category)?.label ?? category;
  const p           = parseFloat(price) || 0;
  const op          = parseFloat(originalPrice) || 0;
  const discount    = op > p && p > 0
    ? Math.round(((op - p) / op) * 100)
    : null;

  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={{
      flexDirection: "row", justifyContent: "space-between",
      paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.bgBorder,
    }}>
      <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "600" }}>{value}</Text>
    </View>
  );

  return (
    <View style={{ gap: 16 }}>
      {cover && (
        <Image
          source={{ uri: cover }}
          style={{ width: "100%", height: 200, borderRadius: 14 }}
          resizeMode="cover"
        />
      )}

      <View style={{
        backgroundColor: Colors.bgCard, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.bgBorder, padding: 16,
      }}>
        <Text style={{ color: Colors.white, fontSize: 17, fontWeight: "800", marginBottom: 14 }}>
          {title}
        </Text>
        <Row label="Categoria"     value={catLabel} />
        <Row label="Condição"      value={condition === "new" ? "Novo" : "Usado"} />
        {brand ? <Row label="Marca" value={brand} /> : null}
        <Row label="Fotos"         value={`${totalPhotos} foto${totalPhotos !== 1 ? "s" : ""} (nas variantes)`} />
        <Row label="Variantes"     value={`${variants.length} variante${variants.length !== 1 ? "s" : ""}`} />
        <Row label="Estoque total" value={`${totalStock} unidade${totalStock !== 1 ? "s" : ""}`} />
        <Row label="Preço"         value={fmt(p)} />
        {discount !== null ? <Row label="Desconto" value={`${discount}% off`} /> : null}
        <Row label="Frete grátis"  value={freeShipping ? "Sim" : "Não"} />
      </View>

      <View style={{
        backgroundColor: Colors.bgCard, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.bgBorder, padding: 16,
      }}>
        <Text style={{ color: Colors.white, fontSize: 14, fontWeight: "700", marginBottom: 12 }}>
          Variantes
        </Text>
        {variants.map((v, i) => (
          <View key={v.localId} style={{
            flexDirection: "row", alignItems: "center", gap: 10,
            paddingVertical: 8,
            borderBottomWidth: i < variants.length - 1 ? 1 : 0,
            borderBottomColor: Colors.bgBorder,
          }}>
            <View style={{
              width: 22, height: 22, borderRadius: 11,
              backgroundColor: Colors.cyan + "22",
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ color: Colors.cyan, fontSize: 10, fontWeight: "800" }}>{i + 1}</Text>
            </View>
            <Text style={{ flex: 1, color: Colors.white, fontSize: 13 }}>
              {[v.color, v.size].filter(Boolean).join(" · ") || "Sem variação"}
            </Text>
            <Text style={{ color: Colors.textGray, fontSize: 13 }}>
              {v.stock} un.
            </Text>
            {v.price ? (
              <Text style={{ color: Colors.cyan, fontSize: 13, fontWeight: "700" }}>
                {fmt(parseFloat(v.price))}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
