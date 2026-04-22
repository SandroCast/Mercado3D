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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { useColors } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  useDigitalProducts,
  CreateDigitalProductInput,
  DBDigitalProduct,
} from "../contexts/DigitalProductsContext";
import { pickImages, uploadImages, pickFile, uploadFile, PickedFile } from "../services/imageUpload";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "stl",    label: "STL",    icon: "layers-outline"        as const },
  { id: "obj",    label: "OBJ",    icon: "cube-outline"          as const },
  { id: "step",   label: "STEP",   icon: "git-branch-outline"    as const },
  { id: "gcode",  label: "G-Code", icon: "code-slash-outline"    as const },
  { id: "bundle", label: "Bundle", icon: "archive-outline"       as const },
  { id: "outros", label: "Outros", icon: "grid-outline"          as const },
];

const FORMAT_OPTIONS = ["STL", "OBJ", "STEP", "AMF", "3MF", "G-Code", "BLEND", "FBX"];

const LICENSE_OPTIONS = [
  { id: "cc0",       label: "CC0 — Domínio Público",                  icon: "🌐" },
  { id: "cc-by",     label: "CC BY — Atribuição",                     icon: "✍️" },
  { id: "cc-by-sa",  label: "CC BY-SA — Compartilha Igual",           icon: "🔄" },
  { id: "cc-by-nc",  label: "CC BY-NC — Não Comercial",               icon: "🚫" },
  { id: "personal",  label: "Uso Pessoal Apenas",                     icon: "👤" },
  { id: "commercial",label: "Uso Comercial Permitido",                 icon: "💼" },
  { id: "all-rights",label: "Todos os Direitos Reservados",           icon: "©️" },
] as const;

const FORMAT_EXTENSIONS: Record<string, string[]> = {
  "STL":    ["stl"],
  "OBJ":    ["obj"],
  "STEP":   ["step", "stp"],
  "AMF":    ["amf"],
  "3MF":    ["3mf"],
  "G-Code": ["gcode", "gc", "ngc", "gco"],
  "BLEND":  ["blend"],
  "FBX":    ["fbx"],
};

const DIFFICULTIES = [
  { id: "easy",   label: "Fácil",   color: "#22c55e", icon: "🟢" },
  { id: "medium", label: "Médio",   color: "#f59e0b", icon: "🟡" },
  { id: "hard",   label: "Difícil", color: "#f97316", icon: "🟠" },
  { id: "expert", label: "Expert",  color: "#ef4444", icon: "🔴" },
] as const;

const TOTAL_STEPS = 5;

const STEP_TITLES: Record<number, string> = {
  1: "Categoria",
  2: "Fotos",
  3: "Detalhes",
  4: "Especificações",
  5: "Revisar",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateDigitalListingScreenProps {
  visible:       boolean;
  onClose:       () => void;
  editProduct?:  DBDigitalProduct;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CreateDigitalListingScreen({
  visible,
  onClose,
  editProduct,
}: CreateDigitalListingScreenProps) {
  const Colors = useColors();
  const { user } = useAuth();
  const { createDigitalProduct, updateDigitalProduct } = useDigitalProducts();

  const isEdit = !!editProduct;

  const [step,      setStep]      = useState(1);
  const [saving,    setSaving]    = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [extError,  setExtError]  = useState<string | null>(null);

  // Form state
  const [category,        setCategory]        = useState("");
  const [price,           setPrice]           = useState("");
  const [originalPrice,   setOriginalPrice]   = useState("");
  const [isFree,          setIsFree]          = useState(false);
  const [previewImages,   setPreviewImages]   = useState<string[]>([]);
  const [title,           setTitle]           = useState("");
  const [description,     setDescription]     = useState("");
  const [formats,         setFormats]         = useState<string[]>([]);
  const [formatFiles,     setFormatFiles]     = useState<Record<string, PickedFile | string>>({});
  const [printDifficulty, setPrintDifficulty] = useState<"easy" | "medium" | "hard" | "expert">("easy");
  const [supportRequired, setSupportRequired] = useState(false);
  const [license,         setLicense]         = useState("");

  // Load edit data
  useEffect(() => {
    if (!editProduct || !visible) return;
    setStep(1);
    setCategory(editProduct.category);
    const free = editProduct.price === 0;
    setIsFree(free);
    setPrice(free ? "" : editProduct.price.toFixed(2));
    setOriginalPrice(editProduct.originalPrice?.toFixed(2) ?? "");
    setTitle(editProduct.title);
    setDescription(editProduct.description);
    setFormats(editProduct.formats ?? []);
    setFormatFiles(editProduct.formatFiles ?? {});
    setLicense(editProduct.license ?? "");
    setPrintDifficulty(editProduct.printDifficulty);
    setSupportRequired(editProduct.supportRequired);
    // Garante que o thumbnail está incluído como primeira prévia
    const previews = editProduct.previewImages ?? [];
    const thumb    = editProduct.thumbnail;
    if (thumb && !previews.includes(thumb)) {
      setPreviewImages([thumb, ...previews]);
    } else {
      setPreviewImages(previews);
    }
  }, [editProduct?.id, visible]);

  const handleClose = () => {
    setStep(1);
    setCategory(""); setPrice(""); setOriginalPrice(""); setIsFree(false);
    setPreviewImages([]);
    setTitle(""); setDescription("");
    setFormats([]); setFormatFiles({}); setPrintDifficulty("easy"); setSupportRequired(false); setLicense("");
    setSaving(false); setSaveLabel("");
    onClose();
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return !!category && (isFree || parseFloat(price) > 0);
      case 2: return previewImages.length > 0;
      case 3: return title.trim().length >= 3 && description.trim().length >= 10;
      case 4: return formats.length > 0 && formats.every((fmt) => !!formatFiles[fmt]) && !!license;
      default: return true;
    }
  };

  const handleNext = () => { if (step < TOTAL_STEPS) setStep((s) => s + 1); };
  const handleBack = () => { if (step > 1)           setStep((s) => s - 1); };

  // Step 4: toggle de formato remove o arquivo associado se desmarcado
  const toggleFormat = (fmt: string) => {
    if (formats.includes(fmt)) {
      setFormats((prev) => prev.filter((f) => f !== fmt));
      setFormatFiles((prev) => { const n = { ...prev }; delete n[fmt]; return n; });
    } else {
      setFormats((prev) => [...prev, fmt]);
    }
  };

  const pickFormatFile = async (fmt: string) => {
    const file = await pickFile();
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const allowed = FORMAT_EXTENSIONS[fmt] ?? [];
    if (allowed.length > 0 && !allowed.includes(ext)) {
      setExtError(`O formato ${fmt} aceita apenas: .${allowed.join(", .")}`);
      return;
    }
    setFormatFiles((prev) => ({ ...prev, [fmt]: file }));
  };

  const removeFormatFile = (fmt: string) => {
    setFormatFiles((prev) => { const n = { ...prev }; delete n[fmt]; return n; });
  };

  // Step 2: foto handlers (inline no pai para o Image renderizar na árvore do pai)
  const pickPhotos = async () => {
    const remaining = 5 - previewImages.length;
    if (remaining <= 0) return;
    const uris = await pickImages(remaining);
    if (uris.length) setPreviewImages((prev) => [...prev, ...uris].slice(0, 5));
  };

  const removePhoto = (idx: number) => {
    setPreviewImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      setSaveLabel("Enviando imagens...");

      // Faz upload das imagens locais preservando a ordem
      const uploadedMap = new Map<string, string>();
      const localUris = previewImages.filter((u) => !u.startsWith("http"));
      if (localUris.length > 0) {
        const uploaded = await uploadImages(user.id, localUris);
        localUris.forEach((uri, i) => uploadedMap.set(uri, uploaded[i] ?? uri));
      }
      const allPreviews = previewImages.map((u) =>
        u.startsWith("http") ? u : (uploadedMap.get(u) ?? u)
      );

      // Upload arquivos de formato (os que são locais — PickedFile; os remotos são strings http)
      setSaveLabel("Enviando arquivos...");
      const uploadedFormatFiles: Record<string, string> = {};
      for (const fmt of Object.keys(formatFiles)) {
        const entry = formatFiles[fmt];
        if (typeof entry === "string") {
          uploadedFormatFiles[fmt] = entry; // já é URL remota
        } else {
          const url = await uploadFile(user.id, entry as PickedFile);
          if (url) uploadedFormatFiles[fmt] = url;
        }
      }

      setSaveLabel("Publicando...");

      const input: CreateDigitalProductInput = {
        title:           title.trim(),
        description:     description.trim(),
        price:           isFree ? 0 : parseFloat(price),
        originalPrice:   originalPrice ? parseFloat(originalPrice) : undefined,
        category,
        thumbnail:       allPreviews[0] ?? "",
        previewImages:   allPreviews,
        formats,
        formatFiles:     uploadedFormatFiles,
        printDifficulty,
        supportRequired,
        license:         license || undefined,
      };

      if (isEdit) {
        await updateDigitalProduct(editProduct!.id, input);
      } else {
        await createDigitalProduct(input);
      }

      handleClose();
    } catch (err) {
      console.warn("CreateDigitalListing save error:", err);
    } finally {
      setSaving(false);
      setSaveLabel("");
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1: return (
        <Step1Category
          category={category}           setCategory={setCategory}
          price={price}                 setPrice={setPrice}
          originalPrice={originalPrice} setOriginalPrice={setOriginalPrice}
          isFree={isFree}               setIsFree={setIsFree}
        />
      );

      case 2: return (
        <View style={{ gap: 16 }}>
          <Text style={{ color: Colors.textMuted, fontSize: 13, lineHeight: 18 }}>
            Adicione até 5 fotos do seu modelo. A{" "}
            <Text style={{ color: Colors.purple, fontWeight: "700" }}>primeira foto será a capa</Text>
            {" "}exibida nos resultados de busca.
          </Text>

          {/* Grade de fotos */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {previewImages.map((uri, idx) => (
              <View
                key={`${uri}-${idx}`}
                style={{ width: "30%", aspectRatio: 1, borderRadius: 12, overflow: "hidden" }}
              >
                <Image
                  source={{ uri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
                {/* Badge CAPA na primeira */}
                {idx === 0 && (
                  <View style={{
                    position: "absolute", top: 5, left: 5,
                    backgroundColor: Colors.purple,
                    borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
                  }}>
                    <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>CAPA</Text>
                  </View>
                )}
                {/* Botão remover */}
                <TouchableOpacity
                  onPress={() => removePhoto(idx)}
                  style={{
                    position: "absolute", top: 4, right: 4,
                    backgroundColor: "#000000bb", borderRadius: 10,
                    width: 22, height: 22, alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={13} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Botão adicionar */}
            {previewImages.length < 5 && (
              <TouchableOpacity
                onPress={pickPhotos}
                activeOpacity={0.7}
                style={{
                  width: "30%", aspectRatio: 1, borderRadius: 12,
                  backgroundColor: Colors.purple + "10",
                  borderWidth: 2, borderColor: Colors.purple + "44", borderStyle: "dashed",
                  alignItems: "center", justifyContent: "center", gap: 4,
                }}
              >
                <Ionicons name="add" size={28} color={Colors.purple} />
                <Text style={{ color: Colors.purple, fontSize: 11, fontWeight: "600" }}>
                  {previewImages.length}/5
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Placeholder quando vazio */}
          {previewImages.length === 0 && (
            <TouchableOpacity
              onPress={pickPhotos}
              activeOpacity={0.75}
              style={{
                borderWidth: 2, borderColor: Colors.purple + "55", borderStyle: "dashed",
                borderRadius: 16, paddingVertical: 52,
                alignItems: "center", gap: 12,
                backgroundColor: Colors.purple + "08",
              }}
            >
              <Ionicons name="images-outline" size={48} color={Colors.purple} />
              <Text style={{ color: Colors.purple, fontSize: 16, fontWeight: "700" }}>
                Adicionar fotos
              </Text>
              <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
                Toque para selecionar da galeria
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );

      case 3: return (
        <Step3Details
          title={title}             setTitle={setTitle}
          description={description} setDescription={setDescription}
        />
      );
      case 4: return (
        <Step4Specs
          formats={formats}                 toggleFormat={toggleFormat}
          formatFiles={formatFiles}
          onPickFile={pickFormatFile}       onRemoveFile={removeFormatFile}
          printDifficulty={printDifficulty} setPrintDifficulty={setPrintDifficulty}
          supportRequired={supportRequired} setSupportRequired={setSupportRequired}
          license={license}                 setLicense={setLicense}
        />
      );
      case 5: return (
        <Step5Review
          title={title}             category={category}
          price={price}             originalPrice={originalPrice}
          isFree={isFree}           previewImages={previewImages}
          formats={formats}         printDifficulty={printDifficulty}
          supportRequired={supportRequired} license={license}
        />
      );
    }
  };

  const isLastStep = step === TOTAL_STEPS;
  const btnEnabled = isLastStep ? !saving : canProceed();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top"]}>

        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 12,
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: Colors.bgCard,
          borderBottomWidth: 1, borderBottomColor: Colors.bgBorder,
        }}>
          <TouchableOpacity onPress={handleClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "700" }}>
              {isEdit ? "Editar modelo 3D" : "Publicar modelo 3D"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
              <Ionicons name="layers-outline" size={11} color={Colors.purple} />
              <Text style={{ color: Colors.purple, fontSize: 11, fontWeight: "700" }}>DIGITAL</Text>
            </View>
          </View>
          <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
            {step}/{TOTAL_STEPS}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={{ height: 3, backgroundColor: Colors.bgBorder }}>
          <View style={{
            width: `${(step / TOTAL_STEPS) * 100}%`,
            height: "100%",
            backgroundColor: Colors.purple,
            borderRadius: 2,
          }} />
        </View>

        {/* Step label */}
        <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 4 }}>
          <Text style={{
            color: Colors.purple, fontSize: 11, fontWeight: "700",
            letterSpacing: 1.2, textTransform: "uppercase",
          }}>
            Etapa {step} de {TOTAL_STEPS}
          </Text>
          <Text style={{ color: Colors.white, fontSize: 24, fontWeight: "900", marginTop: 2 }}>
            {STEP_TITLES[step]}
          </Text>
        </View>

        {/* Content */}
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={80}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        >
          {renderStep()}
        </KeyboardAwareScrollView>

        {/* Footer */}
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
                  : ["#7c3aed", "#a855f7"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                height: 50,
                alignItems: "center", justifyContent: "center",
                flexDirection: "row", gap: 8,
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.textMuted} />
              ) : (
                <Ionicons
                  name={isLastStep ? "checkmark-circle-outline" : "arrow-forward"}
                  size={18}
                  color={btnEnabled ? "#fff" : Colors.textMuted}
                />
              )}
              <Text style={{
                color: btnEnabled ? "#fff" : Colors.textMuted,
                fontSize: 15, fontWeight: "800",
              }}>
                {saving
                  ? (saveLabel || "Publicando...")
                  : isLastStep
                  ? (isEdit ? "Salvar alterações" : "Publicar modelo")
                  : "Próximo"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <ConfirmDialog
          visible={!!extError}
          title="Extensão inválida"
          message={extError ?? ""}
          icon="alert-circle-outline"
          confirmLabel="OK"
          cancelLabel=""
          onConfirm={() => setExtError(null)}
          onCancel={() => setExtError(null)}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Step 1: Categoria e Preço ────────────────────────────────────────────────

function Step1Category({
  category, setCategory, price, setPrice,
  originalPrice, setOriginalPrice, isFree, setIsFree,
}: {
  category: string;       setCategory:      (v: string) => void;
  price: string;          setPrice:         (v: string) => void;
  originalPrice: string;  setOriginalPrice: (v: string) => void;
  isFree: boolean;        setIsFree:        (v: boolean) => void;
}) {
  const Colors = useColors();
  const clean = (v: string) => v.replace(/[^\d.,]/g, "").replace(",", ".");

  return (
    <View style={{ gap: 24 }}>
      {/* Categoria */}
      <View>
        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 12 }}>
          Formato do arquivo *
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
                  backgroundColor: sel ? Colors.purple + "20" : Colors.bgCard,
                  borderWidth: 1.5,
                  borderColor: sel ? Colors.purple : Colors.bgBorder,
                }}
              >
                <Ionicons name={cat.icon} size={17} color={sel ? Colors.purple : Colors.textGray} />
                <Text style={{
                  color: sel ? Colors.purple : Colors.white,
                  fontSize: 13, fontWeight: sel ? "700" : "500",
                }}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Preço */}
      <View style={{ gap: 14 }}>
        <View style={{
          flexDirection: "row", alignItems: "center",
          backgroundColor: Colors.bgCard,
          borderRadius: 12, borderWidth: 1, borderColor: Colors.bgBorder,
          paddingHorizontal: 14, paddingVertical: 12, gap: 12,
        }}>
          <Ionicons name="gift-outline" size={18} color={isFree ? Colors.success : Colors.textGray} />
          <Text style={{ flex: 1, color: Colors.white, fontSize: 14 }}>Disponibilizar gratuitamente</Text>
          <Switch
            value={isFree}
            onValueChange={(v) => { setIsFree(v); if (v) { setPrice(""); setOriginalPrice(""); } }}
            trackColor={{ false: Colors.bgBorder, true: Colors.success + "88" }}
            thumbColor={isFree ? Colors.success : Colors.textMuted}
          />
        </View>

        {!isFree && (
          <>
            <View>
              <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
                Preço *
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ color: Colors.textGray, fontSize: 18, fontWeight: "700" }}>R$</Text>
                <TextInput
                  value={price}
                  onChangeText={(v) => setPrice(clean(v))}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  placeholderTextColor={Colors.textMuted}
                  style={{
                    flex: 1,
                    backgroundColor: Colors.bgCard, borderRadius: 12,
                    borderWidth: 1, borderColor: Colors.bgBorder,
                    color: Colors.white, fontSize: 18, fontWeight: "700",
                    paddingHorizontal: 14, paddingVertical: 14,
                  }}
                />
              </View>
            </View>

            <View>
              <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
                Preço original <Text style={{ color: Colors.textMuted, fontWeight: "400" }}>(opcional — aparece riscado)</Text>
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ color: Colors.textGray, fontSize: 18, fontWeight: "700" }}>R$</Text>
                <TextInput
                  value={originalPrice}
                  onChangeText={(v) => setOriginalPrice(clean(v))}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  placeholderTextColor={Colors.textMuted}
                  style={{
                    flex: 1,
                    backgroundColor: Colors.bgCard, borderRadius: 12,
                    borderWidth: 1, borderColor: Colors.bgBorder,
                    color: Colors.white, fontSize: 18, fontWeight: "700",
                    paddingHorizontal: 14, paddingVertical: 14,
                  }}
                />
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Step 3: Título e Descrição ───────────────────────────────────────────────

function Step3Details({
  title, setTitle, description, setDescription,
}: {
  title: string;       setTitle:       (v: string) => void;
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
          Título *
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ex: Suporte articulado para câmera GoPro"
          placeholderTextColor={Colors.textMuted}
          style={[inputStyle, {
            borderColor: title.trim().length > 0 && title.trim().length < 3 ? "#ef4444" : Colors.bgBorder,
          }]}
          maxLength={120}
        />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          {title.trim().length > 0 && title.trim().length < 3
            ? <Text style={{ color: "#ef4444", fontSize: 11 }}>Mínimo 3 caracteres</Text>
            : <View />}
          <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{title.length}/120</Text>
        </View>
      </View>

      <View>
        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
          Descrição *
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Descreva o modelo: dimensões, materiais recomendados, configurações de impressão, aplicações..."
          placeholderTextColor={Colors.textMuted}
          style={[inputStyle, { minHeight: 160, textAlignVertical: "top" }]}
          multiline
          maxLength={3000}
        />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          {description.trim().length > 0 && description.trim().length < 10
            ? <Text style={{ color: "#ef4444", fontSize: 11 }}>Mínimo 10 caracteres</Text>
            : <View />}
          <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{description.length}/3000</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Step 4: Especificações ───────────────────────────────────────────────────

function Step4Specs({
  formats, toggleFormat, formatFiles, onPickFile, onRemoveFile,
  printDifficulty, setPrintDifficulty, supportRequired, setSupportRequired,
  license, setLicense,
}: {
  formats: string[];
  toggleFormat: (fmt: string) => void;
  formatFiles: Record<string, PickedFile | string>;
  onPickFile: (fmt: string) => void;
  onRemoveFile: (fmt: string) => void;
  printDifficulty: "easy" | "medium" | "hard" | "expert";
  setPrintDifficulty: (v: "easy" | "medium" | "hard" | "expert") => void;
  supportRequired: boolean;
  setSupportRequired: (v: boolean) => void;
  license: string;
  setLicense: (v: string) => void;
}) {
  const Colors = useColors();

  return (
    <View style={{ gap: 24 }}>
      {/* Formatos + upload de arquivo */}
      <View>
        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 4 }}>
          Formatos incluídos *
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 12 }}>
          Selecione os formatos e anexe 1 arquivo por formato.
        </Text>

        {/* Chips de seleção */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {FORMAT_OPTIONS.map((fmt) => {
            const sel = formats.includes(fmt);
            return (
              <TouchableOpacity
                key={fmt}
                onPress={() => toggleFormat(fmt)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
                  backgroundColor: sel ? Colors.purple + "20" : Colors.bgCard,
                  borderWidth: 1.5,
                  borderColor: sel ? Colors.purple : Colors.bgBorder,
                  flexDirection: "row", alignItems: "center", gap: 6,
                }}
              >
                {sel && <Ionicons name="checkmark" size={13} color={Colors.purple} />}
                <Text style={{
                  color: sel ? Colors.purple : Colors.white,
                  fontSize: 13, fontWeight: sel ? "700" : "500",
                }}>
                  {fmt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Upload de arquivo por formato selecionado */}
        {formats.length > 0 && (
          <View style={{ gap: 8 }}>
            {formats.map((fmt) => {
              const file = formatFiles[fmt];
              const fileName = file
                ? typeof file === "string"
                  ? file.split("/").pop() ?? "arquivo remoto"
                  : (file as PickedFile).name
                : null;
              return (
                <View
                  key={fmt}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 10,
                    backgroundColor: Colors.bgCard,
                    borderRadius: 12, borderWidth: 1,
                    borderColor: file ? Colors.purple + "66" : Colors.bgBorder,
                    paddingHorizontal: 14, paddingVertical: 12,
                  }}
                >
                  <View style={{
                    width: 32, height: 32, borderRadius: 8,
                    backgroundColor: Colors.purple + "20",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ color: Colors.purple, fontSize: 10, fontWeight: "800" }}>{fmt}</Text>
                  </View>

                  {file ? (
                    <>
                      <Text style={{ flex: 1, color: Colors.white, fontSize: 13 }} numberOfLines={1}>
                        {fileName}
                      </Text>
                      <TouchableOpacity onPress={() => onRemoveFile(fmt)}>
                        <Ionicons name="close-circle" size={20} color={Colors.error} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={{ flex: 1, color: Colors.textMuted, fontSize: 13 }}>
                        Nenhum arquivo anexado
                      </Text>
                      <TouchableOpacity
                        onPress={() => onPickFile(fmt)}
                        style={{
                          flexDirection: "row", alignItems: "center", gap: 4,
                          backgroundColor: Colors.purple + "20",
                          borderRadius: 8, borderWidth: 1, borderColor: Colors.purple + "55",
                          paddingHorizontal: 10, paddingVertical: 6,
                        }}
                      >
                        <Ionicons name="attach-outline" size={14} color={Colors.purple} />
                        <Text style={{ color: Colors.purple, fontSize: 12, fontWeight: "700" }}>Anexar</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Dificuldade de impressão */}
      <View>
        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 12 }}>
          Dificuldade de impressão
        </Text>
        <View style={{ gap: 8 }}>
          {DIFFICULTIES.map((d) => {
            const sel = printDifficulty === d.id;
            return (
              <TouchableOpacity
                key={d.id}
                onPress={() => setPrintDifficulty(d.id)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 12,
                  paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
                  backgroundColor: sel ? d.color + "15" : Colors.bgCard,
                  borderWidth: 1.5,
                  borderColor: sel ? d.color : Colors.bgBorder,
                }}
              >
                <Text style={{ fontSize: 18 }}>{d.icon}</Text>
                <Text style={{
                  flex: 1, color: sel ? d.color : Colors.white,
                  fontSize: 14, fontWeight: sel ? "700" : "500",
                }}>
                  {d.label}
                </Text>
                {sel && <Ionicons name="checkmark-circle" size={18} color={d.color} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Licença */}
      <View>
        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 4 }}>
          Licença *
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 12 }}>
          Define como outros podem usar seus arquivos.
        </Text>
        <View style={{ gap: 8 }}>
          {LICENSE_OPTIONS.map((opt) => {
            const sel = license === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setLicense(opt.id)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 12,
                  paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
                  backgroundColor: sel ? Colors.purple + "15" : Colors.bgCard,
                  borderWidth: 1.5,
                  borderColor: sel ? Colors.purple : Colors.bgBorder,
                }}
              >
                <Text style={{ fontSize: 16 }}>{opt.icon}</Text>
                <Text style={{
                  flex: 1,
                  color: sel ? Colors.purple : Colors.white,
                  fontSize: 13, fontWeight: sel ? "700" : "500",
                }}>
                  {opt.label}
                </Text>
                {sel && <Ionicons name="checkmark-circle" size={18} color={Colors.purple} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Suporte */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        backgroundColor: Colors.bgCard,
        borderRadius: 12, borderWidth: 1, borderColor: Colors.bgBorder,
        paddingHorizontal: 14, paddingVertical: 12, gap: 12,
      }}>
        <Ionicons name="construct-outline" size={18} color={supportRequired ? Colors.warning : Colors.textGray} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.white, fontSize: 14 }}>Requer suporte de impressão</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>
            O modelo precisa de suportes durante a impressão
          </Text>
        </View>
        <Switch
          value={supportRequired}
          onValueChange={setSupportRequired}
          trackColor={{ false: Colors.bgBorder, true: Colors.warning + "88" }}
          thumbColor={supportRequired ? Colors.warning : Colors.textMuted}
        />
      </View>
    </View>
  );
}

// ─── Step 5: Revisar ──────────────────────────────────────────────────────────

function Step5Review({
  title, category, price, originalPrice, isFree,
  previewImages, formats, printDifficulty, supportRequired, license,
}: {
  title: string;       category: string;
  price: string;       originalPrice: string;
  isFree: boolean;     previewImages: string[];
  formats: string[];   printDifficulty: string;
  supportRequired: boolean; license: string;
}) {
  const Colors = useColors();
  const catLabel  = CATEGORIES.find((c) => c.id === category)?.label ?? category;
  const diffLabel = DIFFICULTIES.find((d) => d.id === printDifficulty)?.label ?? "";
  const p  = parseFloat(price) || 0;
  const op = parseFloat(originalPrice) || 0;
  const discount = !isFree && op > p && p > 0
    ? Math.round(((op - p) / op) * 100) : null;

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
      {/* Capa (primeira prévia) */}
      {previewImages[0] && (
        <View style={{ width: "100%", height: 200, borderRadius: 14, overflow: "hidden" }}>
          <Image
            source={{ uri: previewImages[0] }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
          <View style={{
            position: "absolute", top: 8, left: 8,
            backgroundColor: Colors.purple, borderRadius: 5,
            paddingHorizontal: 7, paddingVertical: 3,
          }}>
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>CAPA</Text>
          </View>
        </View>
      )}

      {/* Demais prévias */}
      {previewImages.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {previewImages.slice(1).map((uri, i) => (
              <View key={i} style={{ width: 80, height: 80, borderRadius: 8, overflow: "hidden" }}>
                <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <View style={{
        backgroundColor: Colors.bgCard, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.bgBorder, padding: 16,
      }}>
        <Text style={{ color: Colors.white, fontSize: 17, fontWeight: "800", marginBottom: 14 }}>
          {title}
        </Text>
        <Row label="Categoria"   value={catLabel} />
        <Row label="Preço"       value={isFree ? "GRÁTIS" : fmt(p)} />
        {discount !== null && <Row label="Desconto" value={`${discount}% off`} />}
        <Row label="Formatos"    value={formats.join(", ")} />
        <Row label="Dificuldade" value={diffLabel} />
        <Row label="Fotos"       value={`${previewImages.length} foto${previewImages.length !== 1 ? "s" : ""}`} />
        <Row label="Suporte"     value={supportRequired ? "Sim" : "Não"} />
        {license && <Row label="Licença" value={LICENSE_OPTIONS.find(l => l.id === license)?.label ?? license} />}
      </View>
    </View>
  );
}
