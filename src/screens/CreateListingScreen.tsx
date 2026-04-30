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
import { supabase } from "../lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES_EQUIPMENT = [
  { id: "impressoras",  label: "Impressoras 3D",  icon: "print-outline"          as const },
  { id: "filamentos",   label: "Filamentos",       icon: "color-palette-outline"  as const },
  { id: "pecas",        label: "Peças",            icon: "construct-outline"      as const },
  { id: "ferramentas",  label: "Ferramentas",      icon: "hammer-outline"         as const },
  { id: "eletronicos",  label: "Eletrônicos",      icon: "hardware-chip-outline"  as const },
  { id: "acessorios",   label: "Acessórios",       icon: "bag-outline"            as const },
  { id: "outros",       label: "Outros",           icon: "grid-outline"           as const },
];

const CATEGORIES_PRINTED = [
  { id: "miniaturas",    label: "Miniaturas",        icon: "person-outline"         as const },
  { id: "decoracao",     label: "Decoração",         icon: "home-outline"           as const },
  { id: "utilidades",    label: "Utilidades",        icon: "bulb-outline"           as const },
  { id: "prototipos",    label: "Protótipos",        icon: "flask-outline"          as const },
  { id: "pecas_custom",  label: "Peças Customizadas",icon: "construct-outline"      as const },
  { id: "joias",         label: "Joias e Bijuterias",icon: "diamond-outline"        as const },
  { id: "educacao",      label: "Educação",          icon: "school-outline"         as const },
  { id: "games",         label: "Games e Geek",      icon: "game-controller-outline"as const },
  { id: "outros",        label: "Outros",            icon: "grid-outline"           as const },
];

const TOTAL_STEPS = 5;

const STEP_TITLES: Record<number, string> = {
  1: "Categoria",
  2: "Detalhes",
  3: "Variantes",
  4: "Dados de Envio",
  5: "Revisar",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface VariantRow {
  localId:       string;
  attributes:    Record<string, string>;
  stock:         string;
  price:         string;
  originalPrice: string;
  images:        string[];
}

function makeVariant(): VariantRow {
  return {
    localId:       Math.random().toString(36).slice(2),
    attributes:    {},
    stock:         "1",
    price:         "",
    originalPrice: "",
    images:        [],
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateListingScreenProps {
  visible:       boolean;
  onClose:       () => void;
  editProduct?:  DBProduct;
  listingType?:  "printed" | "equipment";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CreateListingScreen({
  visible,
  onClose,
  editProduct,
  listingType = "equipment",
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
  const [attributeKeys,       setAttributeKeys]       = useState<string[]>([]);
  const [attributeSuggestions, setAttributeSuggestions] = useState<Record<string, string[]>>({});
  const [aiSuggestionUsed,    setAiSuggestionUsed]    = useState(false);
  const [variants,      setVariants]      = useState<VariantRow[]>([makeVariant()]);
  const [freeShipping,  setFreeShipping]  = useState(false);
  const [weightKg,      setWeightKg]      = useState("");
  const [lengthCm,      setLengthCm]      = useState("");
  const [widthCm,       setWidthCm]       = useState("");
  const [heightCm,      setHeightCm]      = useState("");

  // Load edit data
  useEffect(() => {
    if (!editProduct || !visible) return;
    setStep(1);
    setCategory(editProduct.category);
    setCondition(editProduct.condition);
    setTitle(editProduct.title);
    setBrand(editProduct.brand ?? "");
    setDescription(editProduct.description);
    setFreeShipping(editProduct.freeShipping);
    setAiSuggestionUsed(true);
    setWeightKg(editProduct.weightKg?.toString() ?? "");
    setLengthCm(editProduct.lengthCm?.toString() ?? "");
    setWidthCm(editProduct.widthCm?.toString()   ?? "");
    setHeightCm(editProduct.heightCm?.toString() ?? "");

    fetchVariants(editProduct.id).then((dbV) => {
      if (dbV.length > 0) {
        const keys = [...new Set(dbV.flatMap((v) => Object.keys(v.attributes)))];
        setAttributeKeys(keys);
        setVariants(dbV.map((v, i) => ({
          localId:       v.id,
          attributes:    v.attributes,
          stock:         v.stock.toString(),
          price:         v.price?.toFixed(2) ?? (i === 0 ? editProduct!.price.toFixed(2) : ""),
          originalPrice: i === 0 ? (editProduct!.originalPrice?.toFixed(2) ?? "") : "",
          images:        v.images,
        })));
      } else {
        setAttributeKeys([]);
        setVariants([makeVariant()]);
      }
    });
  }, [editProduct?.id, visible]);

  const handleClose = () => {
    setStep(1);
    setCategory(""); setCondition("new");
    setTitle(""); setBrand(""); setDescription("");
    setAttributeKeys([]); setAttributeSuggestions({}); setAiSuggestionUsed(false);
    setVariants([makeVariant()]);
    setFreeShipping(false);
    setWeightKg(""); setLengthCm(""); setWidthCm(""); setHeightCm("");
    setSaving(false);
    onClose();
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return !!category;
      case 2: return title.trim().length >= 3 && description.trim().length >= 3;
      case 3: return (
        variants.length > 0 &&
        parseFloat(variants[0].price) > 0 &&
        variants.every((v) => {
          const s  = parseInt(v.stock);
          const p  = parseFloat(v.price) || 0;
          const op = parseFloat(v.originalPrice) || 0;
          return !isNaN(s) && s >= 0 && v.images.length > 0 && (!v.originalPrice || op > p);
        })
      );
      case 4: return (
        parseFloat(weightKg) > 0 &&
        parseFloat(lengthCm) > 0 &&
        parseFloat(widthCm)  > 0 &&
        parseFloat(heightCm) > 0
      );
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
        for (const key of attributeKeys) {
          const val = v.attributes[key]?.trim();
          if (val) attrs[key] = val;
        }
        const localImgs  = v.images.filter((u) => !u.startsWith("http"));
        const remoteImgs = v.images.filter((u) =>  u.startsWith("http"));
        const uploaded   = localImgs.length > 0 ? await uploadImages(user.id, localImgs) : [];
        return {
          attributes:    attrs,
          stock:         Math.max(0, parseInt(v.stock) || 0),
          price:         v.price ? parseFloat(v.price) : undefined,
          originalPrice: v.originalPrice ? parseFloat(v.originalPrice) : undefined,
          images:        [...remoteImgs, ...uploaded],
        };
      }));

      // Product-level images are derived from the first photo of each variant
      const allImages = variantInputs
        .map((v) => v.images?.[0])
        .filter((url): url is string => !!url);

      const variantAttributes = [
        ...new Set(variantInputs.flatMap((v) => Object.keys(v.attributes))),
      ];

      const v0 = variantInputs[0];
      const input: CreateProductInput = {
        title:             title.trim(),
        description:       description.trim(),
        price:             v0.price ?? 0,
        originalPrice:     v0.originalPrice,
        brand:             brand.trim() || undefined,
        category,
        condition,
        images:            allImages,
        inStock:           variantInputs.some((v) => v.stock > 0),
        freeShipping,
        variantAttributes,
        weightKg:  parseFloat(weightKg) || undefined,
        lengthCm:  parseFloat(lengthCm) || undefined,
        widthCm:   parseFloat(widthCm)  || undefined,
        heightCm:  parseFloat(heightCm) || undefined,
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
          categories={listingType === "printed" ? CATEGORIES_PRINTED : CATEGORIES_EQUIPMENT}
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
        <Step4Variants
          title={title} brand={brand} category={category}
          attributeKeys={attributeKeys}               setAttributeKeys={setAttributeKeys}
          attributeSuggestions={attributeSuggestions} setAttributeSuggestions={setAttributeSuggestions}
          aiSuggestionUsed={aiSuggestionUsed}         setAiSuggestionUsed={setAiSuggestionUsed}
          variants={variants}                         setVariants={setVariants}
        />
      );
      case 4: return (
        <Step5Shipping
          weightKg={weightKg}     setWeightKg={setWeightKg}
          lengthCm={lengthCm}     setLengthCm={setLengthCm}
          widthCm={widthCm}       setWidthCm={setWidthCm}
          heightCm={heightCm}     setHeightCm={setHeightCm}
          freeShipping={freeShipping} setFreeShipping={setFreeShipping}
        />
      );
      case 5: return (
        <Step6Review
          title={title}           brand={brand}
          category={category}     condition={condition}
          attributeKeys={attributeKeys}
          variants={variants}
          freeShipping={freeShipping}
          weightKg={weightKg}     lengthCm={lengthCm}
          widthCm={widthCm}       heightCm={heightCm}
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
  category, setCategory, condition, setCondition, categories,
}: {
  category: string;          setCategory:  (v: string) => void;
  condition: "new" | "used"; setCondition: (v: "new" | "used") => void;
  categories: { id: string; label: string; icon: any }[];
}) {
  const Colors = useColors();
  return (
    <View style={{ gap: 24 }}>
      <View>
        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 12 }}>
          Selecione a categoria *
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {categories.map((cat) => {
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
  title, brand, category,
  attributeKeys, setAttributeKeys,
  attributeSuggestions, setAttributeSuggestions,
  aiSuggestionUsed, setAiSuggestionUsed,
  variants, setVariants,
}: {
  title: string; brand: string; category: string;
  attributeKeys:    string[];
  setAttributeKeys: React.Dispatch<React.SetStateAction<string[]>>;
  attributeSuggestions:    Record<string, string[]>;
  setAttributeSuggestions: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  aiSuggestionUsed:    boolean;
  setAiSuggestionUsed: React.Dispatch<React.SetStateAction<boolean>>;
  variants:    VariantRow[];
  setVariants: React.Dispatch<React.SetStateAction<VariantRow[]>>;
}) {
  const Colors = useColors();
  const [newAttrName, setNewAttrName] = useState("");
  const [addingAttr,  setAddingAttr]  = useState(false);
  const [aiLoading,   setAiLoading]   = useState(false);

  const updateAttr = (localId: string, key: string, val: string) =>
    setVariants((prev) => prev.map((v) =>
      v.localId === localId ? { ...v, attributes: { ...v.attributes, [key]: val } } : v
    ));

  const updateImages = (localId: string, imgs: string[]) =>
    setVariants((prev) => prev.map((v) => v.localId === localId ? { ...v, images: imgs } : v));

  const updateField = (localId: string, field: "stock" | "price" | "originalPrice", val: string) =>
    setVariants((prev) => prev.map((v) => v.localId === localId ? { ...v, [field]: val } : v));

  const removeVariant = (localId: string) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((v) => v.localId !== localId));
  };

  const addAttrKey = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || attributeKeys.includes(trimmed)) return;
    setAttributeKeys((prev) => [...prev, trimmed]);
    setNewAttrName("");
    setAddingAttr(false);
  };

  const removeAttrKey = (key: string) => {
    setAttributeKeys((prev) => prev.filter((k) => k !== key));
    setAttributeSuggestions((prev) => { const n = { ...prev }; delete n[key]; return n; });
    setVariants((prev) => prev.map((v) => {
      const attrs = { ...v.attributes };
      delete attrs[key];
      return { ...v, attributes: attrs };
    }));
  };

  const suggestWithAI = async () => {
    if (!title.trim() || aiLoading || aiSuggestionUsed) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-variants", {
        body: { title: title.trim(), brand: brand.trim() || undefined, category },
      });
      if (error) throw error;
      const attrs: Array<{ name: string; values: string[] }> = data?.attributes ?? [];
      if (attrs.length === 0) return;
      const newKeys = attrs.map((a) => a.name);
      const newSuggestions: Record<string, string[]> = {};
      for (const a of attrs) newSuggestions[a.name] = a.values;
      setAttributeKeys(newKeys);
      setAttributeSuggestions(newSuggestions);
      setAiSuggestionUsed(true);
      setVariants((prev) => prev.map((v) => ({ ...v, attributes: {} })));
    } catch (err) {
      console.warn("suggestWithAI error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      {/* Info */}
      <View style={{
        flexDirection: "row", gap: 10, padding: 12,
        backgroundColor: Colors.purple + "15", borderRadius: 10,
        borderWidth: 1, borderColor: Colors.purple + "44",
      }}>
        <Ionicons name="information-circle-outline" size={18} color={Colors.purple} />
        <Text style={{ flex: 1, color: Colors.textGray, fontSize: 13, lineHeight: 19 }}>
          Todo produto precisa de ao menos uma variante. Se não houver variações, deixe as características em branco e preencha apenas o estoque.
        </Text>
      </View>

      {/* Características (atributos) */}
      <View style={{
        backgroundColor: Colors.bgCard, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.bgBorder, padding: 14, gap: 12,
      }}>
        <Text style={{ color: Colors.white, fontSize: 14, fontWeight: "700" }}>
          Características
        </Text>

        {/* Chips dos atributos adicionados */}
        {attributeKeys.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {attributeKeys.map((key) => (
              <View key={key} style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                backgroundColor: Colors.cyan + "20",
                borderWidth: 1, borderColor: Colors.cyan + "55",
              }}>
                <Text style={{ color: Colors.cyan, fontSize: 13, fontWeight: "700" }}>{key}</Text>
                <TouchableOpacity onPress={() => removeAttrKey(key)} hitSlop={6}>
                  <Ionicons name="close-circle" size={16} color={Colors.cyan} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Adicionar característica manualmente */}
        {addingAttr ? (
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TextInput
              value={newAttrName}
              onChangeText={setNewAttrName}
              placeholder="Ex: Cor, Modelo, Voltagem..."
              placeholderTextColor={Colors.textMuted}
              autoFocus
              style={{
                flex: 1,
                backgroundColor: Colors.bg,
                borderRadius: 10, borderWidth: 1, borderColor: Colors.cyan,
                color: Colors.white, fontSize: 14,
                paddingHorizontal: 12, paddingVertical: 9,
              }}
              onSubmitEditing={() => addAttrKey(newAttrName)}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={() => addAttrKey(newAttrName)}
              style={{
                backgroundColor: Colors.cyan, borderRadius: 10,
                paddingHorizontal: 14, paddingVertical: 10,
              }}
            >
              <Text style={{ color: Colors.bg, fontWeight: "800", fontSize: 13 }}>OK</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setAddingAttr(false); setNewAttrName(""); }} hitSlop={6}>
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => setAddingAttr(true)}
              style={{
                flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                paddingVertical: 10, borderRadius: 10,
                borderWidth: 1.5, borderStyle: "dashed", borderColor: Colors.bgBorder,
                backgroundColor: Colors.bg,
              }}
            >
              <Ionicons name="add" size={18} color={Colors.textGray} />
              <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600" }}>
                Nova característica
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={suggestWithAI}
              disabled={aiLoading || !title.trim() || aiSuggestionUsed}
              style={{
                flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                paddingVertical: 10, borderRadius: 10,
                backgroundColor: aiSuggestionUsed ? Colors.bgCard : (!title.trim() || aiLoading) ? Colors.bgCard : Colors.purple + "22",
                borderWidth: 1.5, borderColor: aiSuggestionUsed ? Colors.bgBorder : (!title.trim() || aiLoading) ? Colors.bgBorder : Colors.purple + "88",
              }}
            >
              {aiLoading ? (
                <ActivityIndicator size="small" color={Colors.purple} />
              ) : (
                <Ionicons name="sparkles" size={16} color={aiSuggestionUsed || !title.trim() ? Colors.textMuted : Colors.purple} />
              )}
              <Text style={{
                color: aiSuggestionUsed || !title.trim() ? Colors.textMuted : Colors.purple,
                fontSize: 13, fontWeight: "700",
              }}>
                {aiSuggestionUsed ? "Sugerir com IA (1/1)" : "Sugerir com IA (1)"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Variantes */}
      {variants.map((v, idx) => (
        <VariantCard
          key={v.localId}
          variant={v}
          index={idx}
          attributeKeys={attributeKeys}
          attributeSuggestions={attributeSuggestions}
          canDelete={variants.length > 1}
          onUpdateAttr={(key, val) => updateAttr(v.localId, key, val)}
          onUpdateField={(field, val) => updateField(v.localId, field, val)}
          onUpdateImages={(imgs) => updateImages(v.localId, imgs)}
          onDelete={() => removeVariant(v.localId)}
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
  variant, index, attributeKeys, attributeSuggestions, canDelete,
  onUpdateAttr, onUpdateField, onUpdateImages, onDelete,
}: {
  variant:              VariantRow;
  index:                number;
  attributeKeys:        string[];
  attributeSuggestions: Record<string, string[]>;
  canDelete:            boolean;
  onUpdateAttr:         (key: string, val: string) => void;
  onUpdateField:        (field: "stock" | "price" | "originalPrice", val: string) => void;
  onUpdateImages:       (images: string[]) => void;
  onDelete:             () => void;
}) {
  const Colors = useColors();

  const fieldStyle = {
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

      {/* Campos dinâmicos por atributo */}
      {attributeKeys.length > 0 ? (
        attributeKeys.map((key) => {
          const suggestions = attributeSuggestions[key] ?? [];
          const currentVal  = variant.attributes[key] ?? "";
          return (
            <View key={key}>
              <Text style={{ color: Colors.textGray, fontSize: 12, fontWeight: "600" }}>{key}</Text>
              {suggestions.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {suggestions.map((s) => {
                    const sel = currentVal === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => onUpdateAttr(key, sel ? "" : s)}
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
                          {s}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <TextInput
                value={currentVal}
                onChangeText={(val) => onUpdateAttr(key, val)}
                placeholder={suggestions.length > 0 ? `Ou digite outro valor...` : `Digite o valor de "${key}"...`}
                placeholderTextColor={Colors.textMuted}
                style={fieldStyle}
              />
            </View>
          );
        })
      ) : (
        <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 8 }}>
          Adicione características acima para diferenciá-la das demais.
        </Text>
      )}

      {/* Stock + Price */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.textGray, fontSize: 12, fontWeight: "600", marginBottom: 6 }}>
            Estoque *
          </Text>
          <TextInput
            value={variant.stock}
            onChangeText={(val) => onUpdateField("stock", val.replace(/\D/g, ""))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            style={fieldStyle}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.textGray, fontSize: 12, fontWeight: "600", marginBottom: 6 }}>
            {index === 0 ? "Preço *" : "Preço"}
          </Text>
          <TextInput
            value={variant.price}
            onChangeText={(val) => onUpdateField("price", val.replace(/[^\d.,]/g, "").replace(",", "."))}
            keyboardType="decimal-pad"
            placeholder={index === 0 ? "0,00" : "Padrão"}
            placeholderTextColor={Colors.textMuted}
            style={fieldStyle}
          />
        </View>
      </View>

      {/* Original Price — for variants 2+, only show if price is filled */}
      {(index === 0 || parseFloat(variant.price) > 0) && (() => {
        const p  = parseFloat(variant.price)         || 0;
        const op = parseFloat(variant.originalPrice) || 0;
        const discount = op > p && p > 0 ? Math.round(((op - p) / op) * 100) : null;
        const hasError = !!variant.originalPrice && op > 0 && op <= p;
        return (
          <View style={{ gap: 4 }}>
            <Text style={{ color: Colors.textGray, fontSize: 12, fontWeight: "600" }}>
              Preço original <Text style={{ color: Colors.textMuted, fontWeight: "400" }}>(opcional — riscado)</Text>
            </Text>
            <TextInput
              value={variant.originalPrice}
              onChangeText={(val) => onUpdateField("originalPrice", val.replace(/[^\d.,]/g, "").replace(",", "."))}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={Colors.textMuted}
              style={[fieldStyle, hasError ? { borderColor: Colors.error } : {}]}
            />
            {hasError && (
              <Text style={{ color: Colors.error, fontSize: 11 }}>
                Preço original deve ser maior que o preço base
              </Text>
            )}
            {discount !== null && (
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                backgroundColor: Colors.success + "15", borderRadius: 8, padding: 8,
                borderWidth: 1, borderColor: Colors.success + "44",
              }}>
                <Ionicons name="pricetag-outline" size={14} color={Colors.success} />
                <Text style={{ color: Colors.success, fontSize: 12, fontWeight: "600" }}>
                  {discount}% de desconto será exibido
                </Text>
              </View>
            )}
          </View>
        );
      })()}

      {/* Fotos da variante */}
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 6 }}>
          <Text style={{ color: variant.images.length === 0 ? Colors.error : Colors.textGray, fontSize: 12, fontWeight: "600" }}>
            Fotos *{" "}
            <Text style={{ color: Colors.textMuted, fontWeight: "400" }}>
              ({variant.images.length}/6)
            </Text>
          </Text>
          {variant.images.length === 0 && (
            <Text style={{ color: Colors.error, fontSize: 11 }}>Obrigatório</Text>
          )}
        </View>
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
                  borderWidth: 1.5, borderStyle: "dashed",
                  borderColor: variant.images.length === 0 ? Colors.error + "99" : Colors.cyan + "55",
                  backgroundColor: variant.images.length === 0 ? Colors.error + "10" : Colors.cyan + "08",
                  alignItems: "center", justifyContent: "center", gap: 4,
                }}
              >
                <Ionicons name="camera-outline" size={22} color={variant.images.length === 0 ? Colors.error : Colors.cyan} />
                <Text style={{ color: variant.images.length === 0 ? Colors.error : Colors.cyan, fontSize: 10, fontWeight: "600" }}>Fotos</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Step 4: Preço ───────────────────────────────────────────────────────────

function Step4Pricing({
  price, setPrice, originalPrice, setOriginalPrice,
}: {
  price: string;         setPrice:         (v: string) => void;
  originalPrice: string; setOriginalPrice: (v: string) => void;
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
  const discount = op > p && p > 0 ? Math.round(((op - p) / op) * 100) : null;

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
            style={[inputStyle, originalPrice && op > 0 && op <= p ? { borderColor: Colors.error } : {}]}
          />
        </View>
        {!!originalPrice && op > 0 && op <= p && (
          <Text style={{ color: Colors.error, fontSize: 12, marginTop: 4 }}>
            Preço original deve ser maior que o preço base
          </Text>
        )}
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
    </View>
  );
}

// ─── Step 5: Dados de Envio ───────────────────────────────────────────────────

function Step5Shipping({
  weightKg, setWeightKg, lengthCm, setLengthCm,
  widthCm,  setWidthCm,  heightCm, setHeightCm,
  freeShipping, setFreeShipping,
}: {
  weightKg: string; setWeightKg: (v: string) => void;
  lengthCm: string; setLengthCm: (v: string) => void;
  widthCm:  string; setWidthCm:  (v: string) => void;
  heightCm: string; setHeightCm: (v: string) => void;
  freeShipping: boolean; setFreeShipping: (v: boolean) => void;
}) {
  const Colors = useColors();
  const cleanNum = (v: string) => v.replace(/[^\d.,]/g, "").replace(",", ".");

  const fieldStyle = {
    backgroundColor: Colors.bgCard,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.bgBorder,
    color: Colors.white as string, fontSize: 15, fontWeight: "600" as const,
    paddingHorizontal: 14, paddingVertical: 13,
    flex: 1,
  };

  return (
    <View style={{ gap: 24 }}>
      {/* Info */}
      <View style={{
        flexDirection: "row", gap: 10, padding: 12,
        backgroundColor: Colors.cyan + "12", borderRadius: 10,
        borderWidth: 1, borderColor: Colors.cyan + "33",
      }}>
        <Ionicons name="information-circle-outline" size={18} color={Colors.cyan} />
        <Text style={{ flex: 1, color: Colors.textGray, fontSize: 13, lineHeight: 19 }}>
          Preencha com as dimensões e peso da embalagem pronta para envio. Esses dados são usados para calcular o frete para o comprador.
        </Text>
      </View>

      {/* Peso */}
      <View>
        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
          Peso *
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TextInput
            value={weightKg}
            onChangeText={(v) => setWeightKg(cleanNum(v))}
            keyboardType="decimal-pad"
            placeholder="0,000"
            placeholderTextColor={Colors.textMuted}
            style={fieldStyle}
          />
          <Text style={{ color: Colors.textMuted, fontSize: 14, fontWeight: "600", width: 36 }}>kg</Text>
        </View>
      </View>

      {/* Dimensões */}
      <View>
        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
          Dimensões da embalagem *
        </Text>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 13, width: 80 }}>Comprimento</Text>
            <TextInput
              value={lengthCm}
              onChangeText={(v) => setLengthCm(cleanNum(v))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              style={fieldStyle}
            />
            <Text style={{ color: Colors.textMuted, fontSize: 14, fontWeight: "600", width: 36 }}>cm</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 13, width: 80 }}>Largura</Text>
            <TextInput
              value={widthCm}
              onChangeText={(v) => setWidthCm(cleanNum(v))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              style={fieldStyle}
            />
            <Text style={{ color: Colors.textMuted, fontSize: 14, fontWeight: "600", width: 36 }}>cm</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 13, width: 80 }}>Altura</Text>
            <TextInput
              value={heightCm}
              onChangeText={(v) => setHeightCm(cleanNum(v))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              style={fieldStyle}
            />
            <Text style={{ color: Colors.textMuted, fontSize: 14, fontWeight: "600", width: 36 }}>cm</Text>
          </View>
        </View>
      </View>

      {/* Frete grátis */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        backgroundColor: Colors.bgCard, borderRadius: 12,
        borderWidth: 1, borderColor: Colors.bgBorder,
        padding: 16, gap: 12,
      }}>
        <Ionicons name="car-outline" size={22} color={freeShipping ? Colors.success : Colors.textGray} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.white, fontSize: 14, fontWeight: "700" }}>Frete grátis</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>
            Você arca com o custo do frete. Produtos com frete grátis vendem mais.
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

// ─── Step 6: Revisar ──────────────────────────────────────────────────────────

function Step6Review({
  title, brand, category, condition, attributeKeys, variants, freeShipping,
  weightKg, lengthCm, widthCm, heightCm,
}: {
  title: string;        brand: string;
  category: string;     condition: "new" | "used";
  attributeKeys: string[];
  variants: VariantRow[];
  freeShipping: boolean;
  weightKg: string;     lengthCm: string;
  widthCm: string;      heightCm: string;
}) {
  const Colors      = useColors();
  const cover       = variants[0]?.images[0];
  const totalStock  = variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
  const totalPhotos = variants.reduce((sum, v) => sum + v.images.length, 0);
  const catLabel    = [...CATEGORIES_EQUIPMENT, ...CATEGORIES_PRINTED].find((c) => c.id === category)?.label ?? category;
  const p           = parseFloat(variants[0]?.price) || 0;
  const op          = parseFloat(variants[0]?.originalPrice) || 0;
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
        <Row label="Peso"          value={weightKg ? `${weightKg} kg` : "-"} />
        <Row label="Embalagem"     value={lengthCm && widthCm && heightCm ? `${lengthCm} × ${widthCm} × ${heightCm} cm` : "-"} />
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
              {attributeKeys.map((k) => v.attributes[k]).filter(Boolean).join(" · ") || "Sem variação"}
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
