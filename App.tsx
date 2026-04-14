import React, { useState } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { HomeScreen } from "./src/screens/HomeScreen";
import { DigitalScreen } from "./src/screens/DigitalScreen";
import { BottomNavBar, TabName } from "./src/components/BottomNavBar";
import { Colors } from "./src/constants/colors";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>("home");

  const isDigital = activeTab === "stl";

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
  };

  const renderScreen = () => {
    switch (activeTab) {
      case "stl":
        return <DigitalScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        {renderScreen()}
        <BottomNavBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          isDigital={isDigital}
        />
      </View>
    </SafeAreaProvider>
  );
}
