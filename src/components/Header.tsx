import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Animated,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";

interface HeaderProps {
  onCartPress?: () => void;
  cartCount?: number;
}

export function Header({ onCartPress, cartCount = 0 }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const anim = useRef(new Animated.Value(0)).current;

  const openSearch = () => {
    setSearchOpen(true);
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: false }).start(() => {
      inputRef.current?.focus();
    });
  };

  const closeSearch = () => {
    Keyboard.dismiss();
    setSearchText("");
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => {
      setSearchOpen(false);
    });
  };

  const searchBarHeight = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 48] });
  const searchBarOpacity = anim;

  return (
    <View style={{ backgroundColor: Colors.bgCard, borderBottomColor: Colors.bgBorder, borderBottomWidth: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgCard} />

      {/* Main row */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12, gap: 10 }}>
        {/* Logo */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
          <View style={{ backgroundColor: Colors.cyan, borderRadius: 6, width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: Colors.bg, fontSize: 11, fontWeight: "900" }}>3D</Text>
          </View>
          <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "800", letterSpacing: -0.5 }}>
            MERCADO<Text style={{ color: Colors.cyan }}>3D</Text>
          </Text>
        </View>

        {/* Search icon */}
        <TouchableOpacity onPress={openSearch} activeOpacity={0.7} style={{ padding: 6 }}>
          <Ionicons name="search-outline" size={22} color={Colors.textGray} />
        </TouchableOpacity>

        {/* Favorite */}
        <TouchableOpacity activeOpacity={0.7} style={{ padding: 6 }}>
          <Ionicons name="heart-outline" size={22} color={Colors.textGray} />
        </TouchableOpacity>

        {/* Cart */}
        <TouchableOpacity onPress={onCartPress} activeOpacity={0.7} style={{ padding: 6, position: "relative" }}>
          <Ionicons name="cart-outline" size={22} color={Colors.textGray} />
          {cartCount > 0 && (
            <View style={{ position: "absolute", top: 2, right: 2, backgroundColor: Colors.orange, borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Perfil */}
        <TouchableOpacity activeOpacity={0.7} style={{ padding: 6 }}>
          <Ionicons name="person-circle-outline" size={26} color={Colors.textGray} />
        </TouchableOpacity>
      </View>

      {/* Expandable search bar */}
      {searchOpen && (
        <Animated.View style={{ height: searchBarHeight, opacity: searchBarOpacity, paddingHorizontal: 16, paddingBottom: 10, overflow: "hidden" }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: Colors.bgCardAlt, borderRadius: 10, borderWidth: 1, borderColor: Colors.bgBorder, paddingHorizontal: 12, gap: 8 }}>
            <Ionicons name="search" size={16} color={Colors.textMuted} />
            <TextInput
              ref={inputRef}
              style={{ flex: 1, color: Colors.white, fontSize: 14, height: "100%" }}
              placeholder="Buscar impressoras, filamentos..."
              placeholderTextColor={Colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />
            <TouchableOpacity onPress={closeSearch}>
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
