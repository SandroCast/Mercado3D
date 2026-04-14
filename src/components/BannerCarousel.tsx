import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../constants/colors";

const { width: SCREEN_W } = Dimensions.get("window");

interface BannerItem {
  id: string;
  badge?: string;
  title: string;
  titleAccent?: string;
  subtitle: string;
  cta: string;
  gradient: readonly [string, string, ...string[]];
  accentColor: string;
  imageUri: string;
}

const banners: BannerItem[] = [
  {
    id: "1",
    badge: "OFERTAS DA SEMANA",
    title: "Lançamentos em",
    titleAccent: "Impressão 3D",
    subtitle: "As melhores impressoras e suprimentos premium para transformar suas ideias em realidade.",
    cta: "Ver Impressoras",
    gradient: ["#0d1117", "#111827"],
    accentColor: Colors.cyan,
    imageUri: "https://placehold.co/400x220/0d1117/22d3ee?text=Impressoras+3D",
  },
  {
    id: "2",
    badge: "MAIS VENDIDOS",
    title: "Filamentos",
    titleAccent: "Premium",
    subtitle: "PLA, PETG, ABS, TPU e muito mais. Qualidade garantida para suas impressões.",
    cta: "Ver Filamentos",
    gradient: ["#0f172a", "#1e1b4b"],
    accentColor: "#a78bfa",
    imageUri: "https://placehold.co/400x220/0f172a/a78bfa?text=Filamentos",
  },
  {
    id: "3",
    badge: "NOVO",
    title: "Arquivos",
    titleAccent: "STL Exclusivos",
    subtitle: "Miniaturas, peças técnicas e modelos decorativos prontos para imprimir.",
    cta: "Explorar STL",
    gradient: ["#1e1b4b", "#312e81"],
    accentColor: Colors.cyan,
    imageUri: "https://placehold.co/400x220/1e1b4b/22d3ee?text=STL+Universe",
  },
  {
    id: "4",
    badge: "DESTAQUE",
    title: "Peças &",
    titleAccent: "Componentes",
    subtitle: "Bicos, extrusoras, camas aquecidas e tudo que sua impressora precisa.",
    cta: "Ver Peças",
    gradient: ["#0d1117", "#0c1a2e"],
    accentColor: Colors.orange,
    imageUri: "https://placehold.co/400x220/0d1117/f97316?text=Peças",
  },
];

export function BannerCarousel() {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => {
      const next = (prev + 1) % banners.length;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      return next;
    });
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(goToNext, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [goToNext]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== activeIndex) {
      setActiveIndex(idx);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(goToNext, 4000);
    }
  };

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={banners}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => (
          <LinearGradient
            colors={item.gradient}
            style={{ width: SCREEN_W, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 }}
          >
            {/* Badge */}
            {item.badge && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <View style={{ backgroundColor: item.accentColor + "22", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.accentColor }} />
                  <Text style={{ color: item.accentColor, fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>
                    {item.badge}
                  </Text>
                </View>
              </View>
            )}

            {/* Title */}
            <Text style={{ color: Colors.white, fontSize: 30, fontWeight: "800", lineHeight: 36 }}>
              {item.title}
            </Text>
            <Text style={{ color: item.accentColor, fontSize: 30, fontWeight: "800", lineHeight: 36, marginBottom: 12 }}>
              {item.titleAccent}
            </Text>

            {/* Subtitle */}
            <Text style={{ color: Colors.textGray, fontSize: 13, lineHeight: 20, maxWidth: SCREEN_W * 0.75 }}>
              {item.subtitle}
            </Text>
          </LinearGradient>
        )}
      />

      {/* Dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 12, backgroundColor: Colors.bg }}>
        {banners.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => {
              flatListRef.current?.scrollToIndex({ index: i, animated: true });
              setActiveIndex(i);
            }}
          >
            <View style={{
              width: i === activeIndex ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === activeIndex ? Colors.cyan : Colors.bgBorder,
            }} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
