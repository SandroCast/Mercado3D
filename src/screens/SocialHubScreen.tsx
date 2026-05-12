import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "../contexts/ThemeContext";
import { ForumScreen } from "./ForumScreen";
import { CommunityScreen } from "./CommunityScreen";
import { ConversationsListScreen } from "./ConversationsListScreen";
import { ForumTopic } from "../contexts/ForumContext";
import { ForumCategory } from "./TopicListScreen";
import { ConversationSummary } from "../contexts/ConversationsContext";

type SocialTab = "forum" | "community" | "conversations";

interface SocialHubScreenProps {
  onTopicOpen: (topic: ForumTopic, category: ForumCategory) => void;
  onOpenConversation: (conv: ConversationSummary) => void;
  onLoginRequired: () => void;
}

const TABS: { key: SocialTab; label: string; icon: string; iconActive: string }[] = [
  { key: "community",     label: "Comunidade",  icon: "people-outline",              iconActive: "people"              },
  { key: "conversations", label: "Conversas",   icon: "chatbubble-ellipses-outline", iconActive: "chatbubble-ellipses" },
  { key: "forum",         label: "Fórum",       icon: "chatbubbles-outline",         iconActive: "chatbubbles"         },
];

export function SocialHubScreen({ onTopicOpen, onOpenConversation, onLoginRequired }: SocialHubScreenProps) {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<SocialTab>("community");

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Status bar area + tab bar */}
      <View style={{
        paddingTop: insets.top,
        backgroundColor: Colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: Colors.bgBorder,
      }}>
        <View style={{ flexDirection: "row" }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.75}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: "center",
                  gap: 3,
                  borderBottomWidth: 2,
                  borderBottomColor: active ? Colors.cyan : "transparent",
                }}
              >
                <Ionicons
                  name={(active ? tab.iconActive : tab.icon) as any}
                  size={18}
                  color={active ? Colors.cyan : Colors.textMuted}
                />
                <Text style={{
                  color: active ? Colors.cyan : Colors.textMuted,
                  fontSize: 11,
                  fontWeight: active ? "700" : "500",
                }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tab content — display:none preserves state across switches */}
      <View style={{ flex: 1, display: activeTab === "forum" ? "flex" : "none" }}>
        <ForumScreen onTopicOpen={onTopicOpen} embedded />
      </View>
      <View style={{ flex: 1, display: activeTab === "community" ? "flex" : "none" }}>
        <CommunityScreen onLoginRequired={onLoginRequired} />
      </View>
      <View style={{ flex: 1, display: activeTab === "conversations" ? "flex" : "none" }}>
        <ConversationsListScreen onOpenConversation={onOpenConversation} onLoginRequired={onLoginRequired} />
      </View>
    </View>
  );
}
