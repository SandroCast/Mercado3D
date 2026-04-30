import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Share,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ActivityIndicator,
  TextInput,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useCart, SelectedVariant } from "../contexts/CartContext";
import { useFavorites } from "../contexts/FavoritesContext";
import { useProducts, ProductVariant } from "../contexts/ProductsContext";
import { useDigitalPurchases } from "../contexts/DigitalPurchasesContext";
import { useReviews } from "../contexts/ReviewsContext";
import { useQuestions } from "../contexts/QuestionsContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { ShippingCalculator } from "../components/ShippingCalculator";
import { ThreeDPreviewButton } from "../components/ThreeDPreview";
import { SellerProfileScreen } from "./SellerProfileScreen";
import { Product, DigitalProduct, Seller, Review, ProductQuestion } from "../types";

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SW } = Dimensions.get("window");

const DIFFICULTY_MAP = {
  easy:   { label: "Fácil",    color: "#22c55e" },
  medium: { label: "Médio",    color: "#f59e0b" },
  hard:   { label: "Difícil",  color: "#f97316" },
  expert: { label: "Expert",   color: "#ef4444" },
};


// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Validates that a URI is safe to pass to an Image source.
 * Only allows http/https schemes to prevent javascript: or data: URI injection.
 */
function safeUri(uri: string | undefined): string {
  const fallback =
    "https://placehold.co/400x400/1e293b/f97316?text=Sem+Imagem";
  if (!uri || typeof uri !== "string") return fallback;
  const trimmed = uri.trim();
  if (
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://")
  )
    return fallback;
  return trimmed;
}

function formatPrice(price: unknown): string {
  const n = Number(price);
  if (!isFinite(n) || n < 0) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcDiscount(
  price: number,
  originalPrice: number | undefined
): number | null {
  if (!originalPrice || originalPrice <= price) return null;
  const d = Math.round(((originalPrice - price) / originalPrice) * 100);
  return d > 0 ? d : null;
}

function isDigital(p: Product | DigitalProduct): p is DigitalProduct {
  return "downloadCount" in p;
}

function clampText(text: string, max = 500): string {
  if (typeof text !== "string") return "";
  return text.slice(0, max);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  const Colors = useColors();
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {stars.map((s) => (
        <Ionicons
          key={s}
          name={s <= Math.round(rating) ? "star" : "star-outline"}
          size={size}
          color={Colors.warning}
        />
      ))}
    </View>
  );
}

function SellerCard({ seller, onPress }: { seller: Seller; onPress?: () => void }) {
  const Colors = useColors();
  const initial = seller.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        backgroundColor: Colors.bgCardAlt,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.bgBorder,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* Avatar */}
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: Colors.purple + "33",
          borderWidth: 1.5,
          borderColor: Colors.purple,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: Colors.purple, fontSize: 18, fontWeight: "800" }}>
          {initial}
        </Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text
            style={{ color: Colors.white, fontSize: 14, fontWeight: "700" }}
            numberOfLines={1}
          >
            {clampText(seller.name, 60)}
          </Text>
          {seller.verified && (
            <Ionicons
              name="checkmark-circle"
              size={15}
              color={Colors.cyan}
            />
          )}
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Ionicons name="star" size={11} color={Colors.warning} />
            <Text style={{ color: Colors.textGray, fontSize: 12 }}>
              {Number(seller.rating).toFixed(1)}
            </Text>
          </View>
          <Text style={{ color: Colors.textMuted, fontSize: 11 }}>•</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
            {Number(seller.totalSales).toLocaleString("pt-BR")} vendas
          </Text>
        </View>
      </View>

      {/* Ver perfil */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Text style={{ color: Colors.cyan, fontSize: 12, fontWeight: "700" }}>Ver perfil</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.cyan} />
      </View>
    </TouchableOpacity>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const Colors = useColors();
  const date = new Date(review.createdAt).toLocaleDateString("pt-BR");
  return (
    <View style={{
      backgroundColor: Colors.bgCardAlt,
      borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: Colors.bgBorder,
      marginBottom: 10,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: Colors.blue + "33",
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ color: Colors.blue, fontSize: 13, fontWeight: "700" }}>
              {review.authorName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "600" }}>
            {review.authorName}
          </Text>
        </View>
        <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{date}</Text>
      </View>
      <StarRow rating={review.rating} size={12} />
      {!!review.text && (
        <Text style={{ color: Colors.textGray, fontSize: 13, lineHeight: 19, marginTop: 8 }}>
          {clampText(review.text, 300)}
        </Text>
      )}
    </View>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const Colors = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onChange(s)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Ionicons
            name={s <= value ? "star" : "star-outline"}
            size={28}
            color={s <= value ? Colors.warning : Colors.textMuted}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function QuestionCard({
  question,
  isSeller,
  onAnswer,
}: {
  question: ProductQuestion;
  isSeller: boolean;
  onAnswer: (q: ProductQuestion) => void;
}) {
  const Colors = useColors();
  const date = new Date(question.createdAt).toLocaleDateString("pt-BR");
  return (
    <View style={{
      backgroundColor: Colors.bgCardAlt, borderRadius: 12,
      borderWidth: 1, borderColor: Colors.bgBorder,
      padding: 14, marginBottom: 10,
    }}>
      {/* Question */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: question.answer ? 12 : 0 }}>
        <View style={{
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: Colors.cyan + "33",
          alignItems: "center", justifyContent: "center", marginTop: 1,
        }}>
          <Ionicons name="help-outline" size={14} color={Colors.cyan} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "600" }}>
              {question.askerName}
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{date}</Text>
          </View>
          <Text style={{ color: Colors.white, fontSize: 14, lineHeight: 20 }}>
            {question.question}
          </Text>
        </View>
      </View>

      {/* Answer */}
      {question.answer ? (
        <View style={{
          flexDirection: "row", gap: 8,
          paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.bgBorder,
        }}>
          <View style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: Colors.success + "33",
            alignItems: "center", justifyContent: "center", marginTop: 1,
          }}>
            <Ionicons name="chatbubble-outline" size={13} color={Colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.success, fontSize: 11, fontWeight: "700", marginBottom: 3 }}>
              Vendedor
            </Text>
            <Text style={{ color: Colors.textGray, fontSize: 14, lineHeight: 20 }}>
              {question.answer}
            </Text>
          </View>
        </View>
      ) : isSeller ? (
        <TouchableOpacity
          onPress={() => onAnswer(question)}
          style={{
            marginTop: 10, paddingVertical: 8, borderRadius: 8,
            backgroundColor: Colors.success + "18",
            borderWidth: 1, borderColor: Colors.success + "44",
            alignItems: "center",
          }}
        >
          <Text style={{ color: Colors.success, fontSize: 12, fontWeight: "700" }}>
            Responder pergunta
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 8, fontStyle: "italic" }}>
          Aguardando resposta do vendedor...
        </Text>
      )}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export type ProductDetailItem = Product | DigitalProduct;

interface ProductDetailScreenProps {
  visible: boolean;
  product: ProductDetailItem | null;
  onClose: () => void;
  /** Chamado quando usuário não logado tenta adicionar ao carrinho */
  onLoginRequired?: () => void;
}

export function ProductDetailScreen({
  visible,
  product,
  onClose,
  onLoginRequired,
}: ProductDetailScreenProps) {
  const Colors = useColors();
  const { session } = useAuth();
  const { addItem, isInCart, getQuantity } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { fetchVariants } = useProducts();
  const { acquire, hasPurchased } = useDigitalPurchases();
  const { fetchReviews, submitReview, hasReviewed, canReview, reviewsByProduct } = useReviews();
  const { fetchQuestions, askQuestion, answerQuestion, questionsByProduct } = useQuestions();
  const { sendPush } = useNotifications();

  const [imageIndex, setImageIndex]           = useState(0);
  const imageScrollRef = useRef<ScrollView>(null);
  const [descExpanded, setDescExpanded]       = useState(false);
  const [addedFeedback, setAddedFeedback]     = useState(false);
  const [acquiring, setAcquiring]             = useState(false);
  const [acquiredFeedback, setAcquiredFeedback] = useState(false);
  const [sellerProfileVisible, setSellerProfileVisible] = useState(false);
  const [nestedProduct, setNestedProduct]     = useState<ProductDetailItem | null>(null);
  const [modalReady, setModalReady]           = useState(false);

  const [variants,           setVariants]           = useState<ProductVariant[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  // Reviews
  const [reviewsLoading, setReviewsLoading]     = useState(false);
  const [canWriteReview, setCanWriteReview]     = useState(false);
  const [reviewFormVisible, setReviewFormVisible] = useState(false);
  const [reviewRating, setReviewRating]         = useState(5);
  const [reviewText, setReviewText]             = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Q&A
  const [questionsLoading, setQuestionsLoading]   = useState(false);
  const [questionText, setQuestionText]           = useState("");
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [answeringQuestion, setAnsweringQuestion] = useState<ProductQuestion | null>(null);
  const [answerText, setAnswerText]               = useState("");
  const [submittingAnswer, setSubmittingAnswer]   = useState(false);

  // Reset state when product changes
  useEffect(() => {
    setImageIndex(0);
    setDescExpanded(false);
    setAddedFeedback(false);
    setAcquiredFeedback(false);
    setAcquiring(false);
    setModalReady(false);
    setVariants([]);
    setSelectedAttributes({});
    setReviewFormVisible(false);
    setReviewRating(5);
    setReviewText("");
    setCanWriteReview(false);
    setQuestionText("");
    setAnsweringQuestion(null);
    setAnswerText("");
  }, [product?.id]);

  // Fetch reviews + questions + check canReview when product opens
  useEffect(() => {
    if (!product?.id || !visible) return;
    setReviewsLoading(true);
    setQuestionsLoading(true);
    fetchReviews(product.id).finally(() => setReviewsLoading(false));
    fetchQuestions(product.id).finally(() => setQuestionsLoading(false));
    canReview(product.id).then(setCanWriteReview).catch(() => {});
  }, [product?.id, visible]);

  // Fetch variants and auto-select the first one
  useEffect(() => {
    if (!product || isDigital(product)) return;
    fetchVariants(product.id).then((fetched) => {
      setVariants(fetched);
      if (fetched.length > 0) setSelectedAttributes(fetched[0].attributes);
    }).catch(() => {});
  }, [product?.id]);

  // Reset image carousel when variant selection changes
  useEffect(() => {
    setImageIndex(0);
    imageScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [JSON.stringify(selectedAttributes)]);

  const handleImageScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    setImageIndex(idx);
  };

  if (!product) return null;

  const digital = isDigital(product);

  // Derive variant selection first — needed for image logic below
  const attrNames = variants.length > 0
    ? [...new Set(variants.flatMap((v) => Object.keys(v.attributes)))]
    : [];

  const attrValues: Record<string, string[]> = {};
  for (let i = 0; i < attrNames.length; i++) {
    const name = attrNames[i];
    const priorAttrs = attrNames.slice(0, i);
    const compatibleVariants = variants.filter((v) =>
      priorAttrs.every((a) => !selectedAttributes[a] || v.attributes[a] === selectedAttributes[a])
    );
    attrValues[name] = [...new Set(compatibleVariants.map((v) => v.attributes[name]).filter(Boolean))];
  }

  const selectedVariant: ProductVariant | null = variants.length > 0
    ? variants.find((v) =>
        attrNames.every((n) => v.attributes[n] === selectedAttributes[n])
      ) ?? null
    : null;

  const handleAttrSelect = (attrName: string, val: string) => {
    const attrIdx = attrNames.indexOf(attrName);
    const newSel: Record<string, string> = {};
    for (let i = 0; i < attrIdx; i++) {
      const a = attrNames[i];
      if (selectedAttributes[a]) newSel[a] = selectedAttributes[a];
    }
    newSel[attrName] = val;
    for (let i = attrIdx + 1; i < attrNames.length; i++) {
      const nextName = attrNames[i];
      const compatible = variants.filter((v) =>
        Object.entries(newSel).every(([k, va]) => v.attributes[k] === va)
      );
      const available = [...new Set(compatible.map((v) => v.attributes[nextName]).filter(Boolean))];
      if (available.length === 1) newSel[nextName] = available[0];
    }
    setSelectedAttributes(newSel);
  };

  // Images: always use selected variant's photos; fall back to product images for digital
  const images: string[] = (() => {
    if (selectedVariant && selectedVariant.images.length > 0)
      return selectedVariant.images.map(safeUri);
    if (digital)
      return ((product as DigitalProduct).previewImages ?? []).map(safeUri).filter(Boolean);
    return ((product as Product).images ?? []).map(safeUri).filter(Boolean);
  })();

  const safeImages = images.length > 0 ? images : [safeUri(undefined)];

  const selectionComplete = attrNames.length === 0 || attrNames.every((n) => selectedAttributes[n]);

  const effectivePrice = selectedVariant?.price ?? product.price;
  const discount = calcDiscount(effectivePrice, (product as Product).originalPrice);
  const alreadyInCart = isInCart(product.id, selectedVariant?.id);
  const cartQty = getQuantity(product.id, selectedVariant?.id);

  const handleShare = async () => {
    try {
      const price = formatPrice(product.price);
      const type = digital ? "digital" : "physical";

      // HTTPS para WhatsApp/Instagram reconhecerem como link clicável.
      // Troque pelo domínio real quando o deploy da página web estiver feito.
      const WEB_BASE = "https://mercado3d.app";
      const shareUrl = `${WEB_BASE}/product?type=${type}&id=${product.id}`;

      const text = `${clampText(product.title, 80)} — ${price}\nVeja no Mercado3D 👇`;

      await Share.share(
        Platform.OS === "ios"
          ? { message: text, url: shareUrl, title: "Mercado3D" }
          : { message: `${text}\n${shareUrl}`, title: "Mercado3D" }
      );
    } catch {
      // User dismissed share sheet — no action needed
    }
  };

  const isFreeDigital = digital && product.price === 0;
  const alreadyOwned  = digital && hasPurchased(product.id);

  const handleAddToCart = () => {
    if (!session) {
      onClose();
      onLoginRequired?.();
      return;
    }
    const cartVariant: SelectedVariant | undefined = selectedVariant
      ? { id: selectedVariant.id, attributes: selectedVariant.attributes, price: selectedVariant.price, stock: selectedVariant.stock, images: selectedVariant.images }
      : undefined;
    addItem(product, digital ? "digital" : "physical", cartVariant);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2000);
  };

  const handleGetFree = async () => {
    if (!session) {
      onClose();
      onLoginRequired?.();
      return;
    }
    if (alreadyOwned || acquiring) return;
    setAcquiring(true);
    try {
      const dp = product as DigitalProduct;
      await acquire({
        productId:   dp.id,
        title:       dp.title,
        thumbnail:   dp.thumbnail,
        formats:     dp.formats ?? [],
        formatFiles: dp.formatFiles ?? {},
        pricePaid:   0,
      });
      setAcquiredFeedback(true);
    } catch (err) {
      console.warn("handleGetFree error:", err);
    } finally {
      setAcquiring(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!product || submittingReview) return;
    setSubmittingReview(true);
    try {
      await submitReview({
        productId: product.id,
        productType: digital ? "digital" : "physical",
        rating: reviewRating,
        text: reviewText,
      });
      setReviewFormVisible(false);
      setReviewText("");
      setReviewRating(5);
    } catch (err) {
      console.warn("submitReview error:", err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!product || !questionText.trim() || submittingQuestion) return;
    setSubmittingQuestion(true);
    try {
      await askQuestion({
        productId: product.id,
        productType: digital ? "digital" : "physical",
        question: questionText,
      });
      // Notify seller about new question (skip if user is the seller)
      if (product.seller.id && product.seller.id !== session?.user.id) {
        await sendPush({
          toUserId: product.seller.id,
          title: "❓ Nova pergunta",
          body: `Alguém perguntou sobre "${product.title}".`,
          data: { type: "question", productId: product.id, productType: digital ? "digital" : "physical" },
        });
      }
      setQuestionText("");
    } catch (err) {
      console.warn("askQuestion error:", err);
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answeringQuestion || !answerText.trim() || submittingAnswer) return;
    setSubmittingAnswer(true);
    try {
      await answerQuestion(answeringQuestion.id, answerText, {
        askerId: answeringQuestion.askerId,
        productId: answeringQuestion.productId,
        productType: answeringQuestion.productType,
      });
      setAnsweringQuestion(null);
      setAnswerText("");
    } catch (err) {
      console.warn("answerQuestion error:", err);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Physical-only fields
  const physicalProduct = digital ? null : (product as Product);
  const difficultyInfo = digital
    ? DIFFICULTY_MAP[(product as DigitalProduct).printDifficulty] ??
      DIFFICULTY_MAP.easy
    : null;
  const isSeller = !!session && session.user.id === product.seller.id;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      onShow={() => setModalReady(true)}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Colors.bg }}
        edges={["top", "bottom"]}
      >
        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: Colors.bgCard,
            borderBottomWidth: 1,
            borderBottomColor: Colors.bgBorder,
            gap: 8,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={{ padding: 6 }}
            accessibilityLabel="Voltar"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>

          <Text
            style={{
              flex: 1,
              color: Colors.white,
              fontSize: 15,
              fontWeight: "700",
            }}
            numberOfLines={1}
          >
            {clampText(product.title, 60)}
          </Text>

          {/* Favorite — only when logged in */}
          {session && <TouchableOpacity
            onPress={() => {
              const isDigitalProduct = isDigital(product);
              const image = isDigitalProduct
                ? (product as DigitalProduct).thumbnail
                : (product as Product).images?.[0];
              toggleFavorite({
                productId:   product.id,
                productType: isDigitalProduct ? "digital" : "physical",
                title:       product.title,
                price:       product.price,
                imageUrl:    image,
                sellerName:  product.seller.name,
              });
            }}
            activeOpacity={0.7}
            style={{ padding: 6 }}
            accessibilityLabel={isFavorite(product.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            accessibilityRole="button"
          >
            <Ionicons
              name={isFavorite(product.id) ? "heart" : "heart-outline"}
              size={22}
              color={isFavorite(product.id) ? Colors.error : Colors.textGray}
            />
          </TouchableOpacity>}

          {/* Share */}
          <TouchableOpacity
            onPress={handleShare}
            activeOpacity={0.7}
            style={{ padding: 6 }}
            accessibilityLabel="Compartilhar produto"
            accessibilityRole="button"
          >
            <Ionicons
              name="share-social-outline"
              size={22}
              color={Colors.textGray}
            />
          </TouchableOpacity>
        </View>

        {/* ── Conteúdo: montado só após onShow (corrige layout congelado no Android) ── */}
        {modalReady ? (
        <>
        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Image carousel — ScrollView horizontal (evita FlatList aninhada) */}
          <View style={{ backgroundColor: Colors.bgCard }}>
            <ScrollView
              ref={imageScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleImageScroll}
              scrollEventThrottle={16}
            >
              {safeImages.map((img, i) => (
                <Image
                  key={i}
                  source={{ uri: img }}
                  style={{ width: SW, height: SW * 0.85 }}
                  resizeMode="contain"
                />
              ))}
            </ScrollView>
            {/* Pagination dots */}
            {safeImages.length > 1 && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 10,
                }}
              >
                {safeImages.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: i === imageIndex ? 18 : 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor:
                        i === imageIndex ? Colors.cyan : Colors.bgBorder,
                    }}
                  />
                ))}
              </View>
            )}
          </View>

          {/* ── Preview 3D (logo abaixo das fotos, somente digital) ──────── */}
          {digital && (
            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              <ThreeDPreviewButton
                formatFiles={(product as DigitalProduct).formatFiles ?? {}}
                title={product.title}
              />
            </View>
          )}

          <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>
            {/* ── Price block ─────────────────────────────────────────────── */}
            <View>
              {/* Badges row */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                {physicalProduct?.freeShipping && (
                  <View
                    style={{
                      backgroundColor: Colors.blue + "22",
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: Colors.blue + "55",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons name="cube-outline" size={11} color={Colors.blue} />
                    <Text
                      style={{
                        color: Colors.blue,
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      FRETE GRÁTIS
                    </Text>
                  </View>
                )}
                {discount && (
                  <View
                    style={{
                      backgroundColor: Colors.orange,
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: "800",
                      }}
                    >
                      -{discount}% OFF
                    </Text>
                  </View>
                )}
                {physicalProduct && !physicalProduct.inStock && (
                  <View
                    style={{
                      backgroundColor: Colors.error + "22",
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: Colors.error + "55",
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.error,
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      SEM ESTOQUE
                    </Text>
                  </View>
                )}
                {physicalProduct?.condition === "used" && (
                  <View
                    style={{
                      backgroundColor: Colors.warning + "22",
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: Colors.warning + "55",
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.warning,
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      USADO
                    </Text>
                  </View>
                )}
                {digital && (
                  <View
                    style={{
                      backgroundColor: Colors.purple + "22",
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: Colors.purple + "55",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons
                      name="download-outline"
                      size={11}
                      color={Colors.purple}
                    />
                    <Text
                      style={{
                        color: Colors.purple,
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      {(() => {
                          const lic = (product as DigitalProduct).license;
                          const MAP: Record<string, string> = {
                            "cc0":        "CC0 — Domínio Público",
                            "cc-by":      "CC BY",
                            "cc-by-sa":   "CC BY-SA",
                            "cc-by-nc":   "CC BY-NC",
                            "personal":   "Uso Pessoal",
                            "commercial": "Uso Comercial",
                            "all-rights": "© Reservados",
                          };
                          return lic ? (MAP[lic] ?? lic.toUpperCase()) : "ARQUIVO DIGITAL";
                        })()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Title */}
              <Text
                style={{
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: "800",
                  lineHeight: 28,
                  marginBottom: 12,
                }}
              >
                {clampText(product.title, 200)}
              </Text>

              {/* Price */}
              <View>
                {(product as Product).originalPrice && (
                  <Text
                    style={{
                      color: Colors.textMuted,
                      fontSize: 14,
                      textDecorationLine: "line-through",
                    }}
                  >
                    {formatPrice((product as Product).originalPrice)}
                  </Text>
                )}
                <Text
                  style={{
                    color: Colors.cyan,
                    fontSize: 30,
                    fontWeight: "900",
                    letterSpacing: -0.5,
                  }}
                >
                  {formatPrice(effectivePrice)}
                </Text>
              </View>

              {/* Rating row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <StarRow rating={product.rating} />
                <Text
                  style={{
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  {Number(product.rating).toFixed(1)}
                </Text>
                <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
                  ({Number(product.reviewCount).toLocaleString("pt-BR")}{" "}
                  avaliações)
                </Text>
                {digital && (
                  <>
                    <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
                      •
                    </Text>
                    <Ionicons
                      name="download-outline"
                      size={13}
                      color={Colors.textMuted}
                    />
                    <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
                      {Number(
                        (product as DigitalProduct).downloadCount
                      ).toLocaleString("pt-BR")}
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* ── Variantes (antes da descrição) ──────────────────────────── */}
            {attrNames.length > 0 && (
              <>
                <View style={{ height: 1, backgroundColor: Colors.bgBorder }} />
                <View>
                  <Text style={{ color: Colors.white, fontSize: 15, fontWeight: "700", marginBottom: 12 }}>
                    Variantes
                  </Text>
                  {attrNames.map((attrName, attrIdx) => {
                    const priorAttrs = attrNames.slice(0, attrIdx);
                    const compatibleVariants = variants.filter((v) =>
                      priorAttrs.every((a) => !selectedAttributes[a] || v.attributes[a] === selectedAttributes[a])
                    );
                    return (
                    <View key={attrName} style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600" }}>
                          {attrName}:
                        </Text>
                        {selectedAttributes[attrName] && (
                          <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "700" }}>
                            {selectedAttributes[attrName]}
                          </Text>
                        )}
                      </View>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {(attrValues[attrName] ?? []).map((val) => {
                          const isSelected = selectedAttributes[attrName] === val;
                          const hasStock = compatibleVariants.some(
                            (v) => v.attributes[attrName] === val && v.stock > 0
                          );
                          return (
                            <TouchableOpacity
                              key={val}
                              onPress={() => {
                                if (!hasStock) return;
                                handleAttrSelect(attrName, val);
                              }}
                              activeOpacity={0.7}
                              style={{
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 10,
                                borderWidth: 1.5,
                                borderColor: isSelected ? Colors.cyan : Colors.bgBorder,
                                backgroundColor: isSelected ? Colors.cyan + "22" : Colors.bgCardAlt,
                                opacity: hasStock ? 1 : 0.4,
                              }}
                            >
                              <Text style={{
                                color: isSelected ? Colors.cyan : Colors.white,
                                fontSize: 13,
                                fontWeight: isSelected ? "700" : "500",
                                textDecorationLine: hasStock ? "none" : "line-through",
                              }}>
                                {val}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                  })}
                  {selectedVariant && (
                    <View style={{
                      flexDirection: "row", alignItems: "center", gap: 10,
                      backgroundColor: Colors.success + "15", borderRadius: 10,
                      padding: 10, borderWidth: 1, borderColor: Colors.success + "44",
                    }}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                      <Text style={{ color: Colors.success, fontSize: 13, fontWeight: "600" }}>
                        {selectedVariant.stock} em estoque
                        {selectedVariant.price ? ` · ${formatPrice(selectedVariant.price)}` : ""}
                      </Text>
                    </View>
                  )}
                  {!selectionComplete && (
                    <View style={{
                      flexDirection: "row", alignItems: "center", gap: 8,
                      backgroundColor: Colors.warning + "15", borderRadius: 10,
                      padding: 10, borderWidth: 1, borderColor: Colors.warning + "44", marginTop: 4,
                    }}>
                      <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
                      <Text style={{ color: Colors.warning, fontSize: 13 }}>
                        Selecione todas as opções para continuar
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Divider */}
            <View
              style={{ height: 1, backgroundColor: Colors.bgBorder }}
            />

            {/* ── Description ─────────────────────────────────────────────── */}
            <View>
              <Text
                style={{
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: "700",
                  marginBottom: 8,
                }}
              >
                Descrição
              </Text>
              <Text
                style={{
                  color: Colors.textGray,
                  fontSize: 14,
                  lineHeight: 22,
                }}
                numberOfLines={descExpanded ? undefined : 4}
              >
                {clampText(product.description, 1000)}
              </Text>
              <TouchableOpacity
                onPress={() => setDescExpanded((v) => !v)}
                activeOpacity={0.7}
                style={{ marginTop: 6 }}
              >
                <Text
                  style={{
                    color: Colors.cyan,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  {descExpanded ? "Ver menos ▲" : "Ver mais ▼"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: Colors.bgBorder }} />

            {/* ── Specs ───────────────────────────────────────────────────── */}
            <View>
              <Text
                style={{
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: "700",
                  marginBottom: 12,
                }}
              >
                Especificações
              </Text>

              {/* Physical specs */}
              {physicalProduct && (
                <View style={{ gap: 8 }}>
                  <SpecRow
                    icon="pricetag-outline"
                    label="Categoria"
                    value={physicalProduct.category}
                  />
                  <SpecRow
                    icon="cube-outline"
                    label="Condição"
                    value={
                      physicalProduct.condition === "new" ? "Novo" : "Usado"
                    }
                  />
                  <SpecRow
                    icon="checkmark-circle-outline"
                    label="Estoque"
                    value={physicalProduct.inStock ? "Disponível" : "Indisponível"}
                    valueColor={
                      physicalProduct.inStock ? Colors.success : Colors.error
                    }
                  />
                  <SpecRow
                    icon="car-outline"
                    label="Frete"
                    value={physicalProduct.freeShipping ? "Grátis" : "A calcular"}
                    valueColor={
                      physicalProduct.freeShipping ? Colors.success : undefined
                    }
                  />
                </View>
              )}

              {/* Digital specs */}
              {digital && (
                <View style={{ gap: 8 }}>
                  <SpecRow
                    icon="pricetag-outline"
                    label="Categoria"
                    value={(product as DigitalProduct).category.toUpperCase()}
                  />
                  <SpecRow
                    icon="speedometer-outline"
                    label="Dificuldade"
                    value={difficultyInfo?.label ?? "-"}
                    valueColor={difficultyInfo?.color}
                  />
                  <SpecRow
                    icon="construct-outline"
                    label="Suporte"
                    value={
                      (product as DigitalProduct).supportRequired
                        ? "Necessário"
                        : "Não necessário"
                    }
                    valueColor={
                      (product as DigitalProduct).supportRequired
                        ? Colors.warning
                        : Colors.success
                    }
                  />
                  <SpecRow
                    icon="download-outline"
                    label="Downloads"
                    value={Number(
                      (product as DigitalProduct).downloadCount
                    ).toLocaleString("pt-BR")}
                  />

                  {/* Format badges */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: Colors.bgBorder,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name="document-outline"
                        size={16}
                        color={Colors.textGray}
                      />
                    </View>
                    <Text
                      style={{
                        color: Colors.textMuted,
                        fontSize: 13,
                        width: 90,
                      }}
                    >
                      Formatos
                    </Text>
                    <View
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      {((product as DigitalProduct).formats ?? []).map((fmt) => (
                        <View
                          key={fmt}
                          style={{
                            backgroundColor: Colors.purple + "22",
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderWidth: 1,
                            borderColor: Colors.purple + "55",
                          }}
                        >
                          <Text
                            style={{
                              color: Colors.purple,
                              fontSize: 11,
                              fontWeight: "700",
                            }}
                          >
                            {clampText(fmt, 10)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </View>


            {/* ── Frete (somente produto físico) ──────────────────────────── */}
            {physicalProduct && (
              <>
                <View style={{ height: 1, backgroundColor: Colors.bgBorder }} />
                {product.seller.postalCode ? (
                  <ShippingCalculator
                    sellerPostalCode={product.seller.postalCode}
                    packageInfo={{ weight: 0.5, height: 15, width: 15, length: 20 }}
                  />
                ) : (
                  <ShippingUnavailable />
                )}
              </>
            )}


            {/* Divider */}
            <View style={{ height: 1, backgroundColor: Colors.bgBorder }} />

            {/* ── Seller ──────────────────────────────────────────────────── */}
            <View>
              <Text
                style={{
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: "700",
                  marginBottom: 12,
                }}
              >
                Vendedor
              </Text>
              <SellerCard seller={product.seller} onPress={() => setSellerProfileVisible(true)} />
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: Colors.bgBorder }} />

            {/* ── Reviews ─────────────────────────────────────────────────── */}
            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: "700",
                  }}
                >
                  Avaliações
                </Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text
                    style={{
                      color: Colors.cyan,
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    Ver todas
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Rating summary */}
              <View
                style={{
                  backgroundColor: Colors.bgCardAlt,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: Colors.bgBorder,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 12,
                }}
              >
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      color: Colors.white,
                      fontSize: 40,
                      fontWeight: "900",
                      lineHeight: 44,
                    }}
                  >
                    {Number(product.rating).toFixed(1)}
                  </Text>
                  <StarRow rating={product.rating} size={13} />
                  <Text
                    style={{
                      color: Colors.textMuted,
                      fontSize: 11,
                      marginTop: 4,
                    }}
                  >
                    {Number(product.reviewCount).toLocaleString("pt-BR")} avaliações
                  </Text>
                </View>

                {/* Bar chart */}
                <View style={{ flex: 1, gap: 4 }}>
                  {[5, 4, 3, 2, 1].map((star) => {
                    // Mock distribution
                    const pcts: Record<number, number> = {
                      5: 68,
                      4: 20,
                      3: 7,
                      2: 3,
                      1: 2,
                    };
                    const pct = pcts[star] ?? 0;
                    return (
                      <View
                        key={star}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: Colors.textMuted,
                            fontSize: 11,
                            width: 10,
                          }}
                        >
                          {star}
                        </Text>
                        <Ionicons
                          name="star"
                          size={10}
                          color={Colors.warning}
                        />
                        <View
                          style={{
                            flex: 1,
                            height: 6,
                            backgroundColor: Colors.bgBorder,
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <View
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              backgroundColor:
                                star >= 4 ? Colors.success : Colors.warning,
                              borderRadius: 3,
                            }}
                          />
                        </View>
                        <Text
                          style={{
                            color: Colors.textMuted,
                            fontSize: 10,
                            width: 28,
                          }}
                        >
                          {pct}%
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* ── Write review button ───────────────────────────────── */}
              {session && canWriteReview && !hasReviewed(product.id) && !reviewFormVisible && (
                <TouchableOpacity
                  onPress={() => setReviewFormVisible(true)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: "row", alignItems: "center", justifyContent: "center",
                    gap: 8, paddingVertical: 12, marginBottom: 4,
                    borderRadius: 12, borderWidth: 1, borderColor: Colors.cyan + "55",
                    backgroundColor: Colors.cyan + "11",
                  }}
                >
                  <Ionicons name="create-outline" size={16} color={Colors.cyan} />
                  <Text style={{ color: Colors.cyan, fontSize: 13, fontWeight: "700" }}>
                    Escrever avaliação
                  </Text>
                </TouchableOpacity>
              )}

              {/* ── Review form ───────────────────────────────────────── */}
              {reviewFormVisible && (
                <View style={{
                  backgroundColor: Colors.bgCardAlt, borderRadius: 14,
                  borderWidth: 1, borderColor: Colors.bgBorder,
                  padding: 16, gap: 14, marginBottom: 4,
                }}>
                  <Text style={{ color: Colors.white, fontSize: 14, fontWeight: "700" }}>
                    Sua avaliação
                  </Text>
                  <StarPicker value={reviewRating} onChange={setReviewRating} />
                  <TextInput
                    value={reviewText}
                    onChangeText={setReviewText}
                    placeholder="Conte sua experiência (opcional)"
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                    style={{
                      backgroundColor: Colors.bgCard,
                      borderWidth: 1, borderColor: Colors.bgBorder,
                      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                      color: Colors.white, fontSize: 14, minHeight: 80,
                      textAlignVertical: "top",
                    }}
                  />
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setReviewFormVisible(false)}
                      style={{
                        flex: 1, paddingVertical: 11, borderRadius: 10,
                        borderWidth: 1, borderColor: Colors.bgBorder,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: Colors.textMuted, fontSize: 13, fontWeight: "700" }}>
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSubmitReview}
                      disabled={submittingReview}
                      style={{
                        flex: 2, paddingVertical: 11, borderRadius: 10,
                        backgroundColor: Colors.cyan, alignItems: "center",
                        opacity: submittingReview ? 0.7 : 1,
                      }}
                    >
                      {submittingReview
                        ? <ActivityIndicator size="small" color={Colors.bg} />
                        : <Text style={{ color: Colors.bg, fontSize: 13, fontWeight: "800" }}>Publicar</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ── Reviews list ──────────────────────────────────────── */}
              {reviewsLoading && (
                <ActivityIndicator size="small" color={Colors.cyan} style={{ marginVertical: 16 }} />
              )}
              {!reviewsLoading && (reviewsByProduct[product.id] ?? []).length === 0 && (
                <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 16 }}>
                  Nenhuma avaliação ainda. Seja o primeiro!
                </Text>
              )}
              {(reviewsByProduct[product.id] ?? []).map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </View>

            {/* ── Q&A ─────────────────────────────────────────────────────── */}
            <View>
              {/* Header */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Ionicons name="chatbubbles-outline" size={18} color={Colors.white} />
                <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "800" }}>
                  Perguntas e Respostas
                </Text>
              </View>

              {/* Ask form — only for non-seller logged-in users */}
              {session && !isSeller && (
                <View style={{
                  backgroundColor: Colors.bgCard,
                  borderRadius: 12, borderWidth: 1, borderColor: Colors.bgBorder,
                  padding: 14, gap: 10, marginBottom: 14,
                }}>
                  <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: "600" }}>
                    Tem alguma dúvida sobre este produto?
                  </Text>
                  <TextInput
                    value={questionText}
                    onChangeText={setQuestionText}
                    placeholder="Digite sua pergunta..."
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    maxLength={400}
                    style={{
                      backgroundColor: Colors.bgCardAlt,
                      borderWidth: 1, borderColor: Colors.bgBorder,
                      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                      color: Colors.white, fontSize: 14, minHeight: 60,
                      textAlignVertical: "top",
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleAskQuestion}
                    disabled={!questionText.trim() || submittingQuestion}
                    style={{
                      backgroundColor: Colors.cyan, borderRadius: 10,
                      paddingVertical: 11, alignItems: "center",
                      opacity: !questionText.trim() || submittingQuestion ? 0.5 : 1,
                    }}
                  >
                    {submittingQuestion
                      ? <ActivityIndicator size="small" color={Colors.bg} />
                      : <Text style={{ color: Colors.bg, fontSize: 13, fontWeight: "800" }}>Enviar Pergunta</Text>
                    }
                  </TouchableOpacity>
                </View>
              )}

              {/* Answer modal-sheet for seller */}
              {answeringQuestion && (
                <View style={{
                  backgroundColor: Colors.bgCard,
                  borderRadius: 12, borderWidth: 1, borderColor: Colors.success + "55",
                  padding: 14, gap: 10, marginBottom: 14,
                }}>
                  <Text style={{ color: Colors.success, fontSize: 12, fontWeight: "700" }}>
                    Respondendo: "{answeringQuestion.question.slice(0, 60)}{answeringQuestion.question.length > 60 ? "…" : ""}"
                  </Text>
                  <TextInput
                    value={answerText}
                    onChangeText={setAnswerText}
                    placeholder="Sua resposta..."
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    maxLength={600}
                    autoFocus
                    style={{
                      backgroundColor: Colors.bgCardAlt,
                      borderWidth: 1, borderColor: Colors.bgBorder,
                      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                      color: Colors.white, fontSize: 14, minHeight: 70,
                      textAlignVertical: "top",
                    }}
                  />
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => { setAnsweringQuestion(null); setAnswerText(""); }}
                      style={{
                        flex: 1, paddingVertical: 10, borderRadius: 10,
                        borderWidth: 1, borderColor: Colors.bgBorder, alignItems: "center",
                      }}
                    >
                      <Text style={{ color: Colors.textMuted, fontSize: 13, fontWeight: "700" }}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSubmitAnswer}
                      disabled={!answerText.trim() || submittingAnswer}
                      style={{
                        flex: 2, paddingVertical: 10, borderRadius: 10,
                        backgroundColor: Colors.success, alignItems: "center",
                        opacity: !answerText.trim() || submittingAnswer ? 0.6 : 1,
                      }}
                    >
                      {submittingAnswer
                        ? <ActivityIndicator size="small" color={Colors.bg} />
                        : <Text style={{ color: Colors.bg, fontSize: 13, fontWeight: "800" }}>Publicar Resposta</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Questions list */}
              {questionsLoading && (
                <ActivityIndicator size="small" color={Colors.cyan} style={{ marginVertical: 16 }} />
              )}
              {!questionsLoading && (questionsByProduct[product.id] ?? []).length === 0 && (
                <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 12 }}>
                  Nenhuma pergunta ainda. Seja o primeiro a perguntar!
                </Text>
              )}
              {(questionsByProduct[product.id] ?? []).map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  isSeller={isSeller}
                  onAnswer={(question) => {
                    setAnsweringQuestion(question);
                    setAnswerText("");
                  }}
                />
              ))}
            </View>

            {/* ── Report link ─────────────────────────────────────────────── */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 12,
              }}
            >
              <Ionicons name="flag-outline" size={14} color={Colors.textMuted} />
              <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                Reportar este anúncio
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>

        {/* ── CTA bar — footer fixo via flex, não absolute ─────────────────── */}
        <View
          style={{
            backgroundColor: Colors.bgCard,
            borderTopWidth: 1,
            borderTopColor: Colors.bgBorder,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: Platform.OS === "ios" ? 28 : 14,
            gap: 8,
          }}
        >
          {/* In-cart indicator */}
          {alreadyInCart && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                backgroundColor: Colors.success + "18",
                borderRadius: 8,
                paddingVertical: 5,
                borderWidth: 1,
                borderColor: Colors.success + "44",
              }}
            >
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={{ color: Colors.success, fontSize: 12, fontWeight: "700" }}>
                {cartQty}x já no carrinho
              </Text>
            </View>
          )}

          {/* Trust badges */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 20,
            }}
          >
            {[
              { icon: "shield-checkmark-outline" as const, label: "Compra segura" },
              { icon: "refresh-outline" as const,          label: "7 dias para troca" },
              { icon: "headset-outline" as const,          label: "Suporte incluso" },
            ].map(({ icon, label }) => (
              <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name={icon} size={12} color={Colors.textMuted} />
                <Text style={{ color: Colors.textMuted, fontSize: 10 }}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Main CTA button — full width */}
          {isSeller ? (
            <View style={{
              paddingVertical: 15, borderRadius: 14,
              backgroundColor: Colors.bgCardAlt,
              borderWidth: 1, borderColor: Colors.bgBorder,
              flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <Ionicons name="storefront-outline" size={18} color={Colors.textMuted} />
              <Text style={{ color: Colors.textMuted, fontSize: 14, fontWeight: "700" }}>
                Este é o seu anúncio
              </Text>
            </View>
          ) : isFreeDigital ? (
            /* Free digital: Obter Grátis / Na biblioteca */
            <TouchableOpacity
              onPress={handleGetFree}
              activeOpacity={0.85}
              disabled={alreadyOwned || acquiredFeedback || acquiring}
              style={{ borderRadius: 14, overflow: "hidden" }}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={
                  alreadyOwned || acquiredFeedback
                    ? ["#22c55e", "#16a34a"]
                    : !session
                    ? ["#7c3aed", "#6d28d9"]
                    : ["#22d3ee", "#0891b2"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}
              >
                {acquiring ? (
                  <ActivityIndicator size="small" color="#0d1117" />
                ) : (
                  <Ionicons
                    name={
                      alreadyOwned || acquiredFeedback
                        ? "checkmark-circle-outline"
                        : !session
                        ? "log-in-outline"
                        : "cloud-download-outline"
                    }
                    size={19}
                    color="#0d1117"
                  />
                )}
                <Text style={{ color: "#0d1117", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 }}>
                  {alreadyOwned || acquiredFeedback
                    ? "Na sua biblioteca"
                    : !session
                    ? "Entrar para Obter"
                    : acquiring
                    ? "Obtendo..."
                    : "Obter Grátis"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            /* Paid / physical: Add to cart */
            <TouchableOpacity
              onPress={handleAddToCart}
              activeOpacity={0.85}
              disabled={(physicalProduct != null && !physicalProduct.inStock) || !selectionComplete}
              style={{ borderRadius: 14, overflow: "hidden" }}
              accessibilityLabel={
                !session
                  ? "Entrar para adicionar ao carrinho"
                  : digital
                  ? "Adicionar arquivo ao carrinho"
                  : "Adicionar ao carrinho"
              }
              accessibilityRole="button"
            >
              <LinearGradient
                colors={
                  (physicalProduct && !physicalProduct.inStock) || !selectionComplete
                    ? [Colors.bgBorder, Colors.bgBorder]
                    : addedFeedback
                    ? ["#22c55e", "#16a34a"]
                    : !session
                    ? ["#7c3aed", "#6d28d9"]
                    : ["#22d3ee", "#0891b2"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}
              >
                <Ionicons
                  name={
                    physicalProduct && !physicalProduct.inStock
                      ? "ban-outline"
                      : !selectionComplete
                      ? "options-outline"
                      : addedFeedback
                      ? "checkmark-circle-outline"
                      : !session
                      ? "log-in-outline"
                      : digital
                      ? "download-outline"
                      : "cart-outline"
                  }
                  size={19}
                  color={
                    (physicalProduct && !physicalProduct.inStock) || !selectionComplete
                      ? Colors.textMuted
                      : "#0d1117"
                  }
                />
                <Text
                  style={{
                    color:
                      (physicalProduct && !physicalProduct.inStock) || !selectionComplete
                        ? Colors.textMuted
                        : "#0d1117",
                    fontSize: 16,
                    fontWeight: "800",
                    letterSpacing: 0.2,
                  }}
                >
                  {physicalProduct && !physicalProduct.inStock
                    ? "Produto Indisponível"
                    : !selectionComplete
                    ? "Selecione as opções"
                    : addedFeedback
                    ? "Adicionado ao Carrinho!"
                    : !session
                    ? "Entrar para Comprar"
                    : digital
                    ? "Adicionar Arquivo ao Carrinho"
                    : "Adicionar ao Carrinho"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
        </> ) : (
          /* Placeholder durante a animação de abertura */
          <View style={{ flex: 1, backgroundColor: Colors.bg }} />
        )}
      </SafeAreaView>

      <SellerProfileScreen
        visible={sellerProfileVisible}
        seller={product?.seller ?? null}
        onClose={() => setSellerProfileVisible(false)}
        onLoginRequired={onLoginRequired}
        onProductPress={(p) => { setSellerProfileVisible(false); setNestedProduct(p); }}
      />

      <ProductDetailScreen
        visible={nestedProduct !== null}
        product={nestedProduct}
        onClose={() => setNestedProduct(null)}
        onLoginRequired={onLoginRequired}
      />
    </Modal>
  );
}

// ─── ShippingUnavailable ──────────────────────────────────────────────────────

function ShippingUnavailable() {
  const Colors = useColors();
  return (
    <View>
      <Text style={{ color: Colors.white, fontSize: 15, fontWeight: "700", marginBottom: 12 }}>
        Calcular Frete
      </Text>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: Colors.bgCardAlt,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.bgBorder,
      }}>
        <Ionicons name="information-circle-outline" size={20} color={Colors.textMuted} />
        <Text style={{ color: Colors.textMuted, fontSize: 13, flex: 1, lineHeight: 19 }}>
          Frete a combinar com o vendedor.{"\n"}O valor será calculado no checkout.
        </Text>
      </View>
    </View>
  );
}

// ─── SpecRow helper ───────────────────────────────────────────────────────────

function SpecRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  const Colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: Colors.bgBorder,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={16} color={Colors.textGray} />
      </View>
      <Text style={{ color: Colors.textMuted, fontSize: 13, width: 90 }}>
        {label}
      </Text>
      <Text
        style={{
          color: valueColor ?? Colors.white,
          fontSize: 13,
          fontWeight: "600",
          flex: 1,
        }}
      >
        {clampText(value, 80)}
      </Text>
    </View>
  );
}
