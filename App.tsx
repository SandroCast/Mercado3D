import React, { useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { HomeScreen } from "./src/screens/HomeScreen";
import { DigitalScreen } from "./src/screens/DigitalScreen";
import { MoreScreen } from "./src/screens/MoreScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { BottomNavBar, TabName } from "./src/components/BottomNavBar";
import { ThemeProvider, useColors } from "./src/contexts/ThemeContext";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { configureGoogleSignIn } from "./src/lib/googleSignIn";

configureGoogleSignIn();

function AppContent() {
  const Colors = useColors();
  const { session, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>("home");

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={Colors.cyan} />
      </View>
    );
  }

  const isDigital = activeTab === "stl";
  const profileRequiresLogin = activeTab === "profile" && !session;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ flex: 1, display: activeTab === "home" ? "flex" : "none" }}>
        <HomeScreen />
      </View>
      <View style={{ flex: 1, display: activeTab === "stl" ? "flex" : "none" }}>
        <DigitalScreen />
      </View>
      <View style={{ flex: 1, display: activeTab === "profile" ? "flex" : "none" }}>
        {profileRequiresLogin ? <LoginScreen /> : <MoreScreen />}
      </View>

      <BottomNavBar
        activeTab={activeTab}
        onTabPress={setActiveTab}
        isDigital={isDigital}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
