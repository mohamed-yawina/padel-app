import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Home, MapPin, User } from "./utils/icons";

import AuthScreen from "./screens/AuthScreen.jsx";
import HomeScreen from "./screens/HomeScreen.jsx";
import CourtsScreen from "./screens/CourtsScreen.jsx";
import ProfileScreen from "./screens/ProfileScreen.jsx";
import AdminDashboardScreen from "./screens/AdminDashboardScreen.jsx";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function UserTabs({ onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let IconComponent;
          
          if (route.name === "Home") {
            IconComponent = Home;
          } else if (route.name === "Courts") {
            IconComponent = MapPin;
          } else if (route.name === "Profile") {
            IconComponent = User;
          }
          
          return <IconComponent size={24} color={color} />;
        },
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 4,
        },
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 5,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Accueil",
        }}
      />
      <Tab.Screen
        name="Courts"
        component={CourtsScreen}
        options={{
          tabBarLabel: "Courts",
        }}
      />
      <Tab.Screen
        name="Profile"
        options={{
          tabBarLabel: "Profil",
        }}
      >
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Auth');

  // Forcer l'authentification à chaque ouverture : supprimer les clés d'auth au démarrage
  useEffect(() => {
    const clearAuth = async () => {
      try {
        await AsyncStorage.removeItem("hasLaunched");
        await AsyncStorage.removeItem("role");
        await AsyncStorage.removeItem("token");

        if (Platform.OS !== 'web') {
          try {
            await SecureStore.deleteItemAsync("role");
            await SecureStore.deleteItemAsync("token");
          } catch (e) {
            // ignore if not present
          }
        }
      } catch (e) {
        console.log("Erreur lors de la réinitialisation des credentials", e);
      }

      setRole(null);
      setInitialRoute('Auth');
      setLoading(false);
    };

    clearAuth();
  }, []);

  // ⛔ Très important : NE PAS rendre d'UI tant que loading = true
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 20 }}>Chargement…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth">
          {(props) => (
            <AuthScreen {...props} onLoginSuccess={(role) => {
              setRole(role);
              props.navigation.navigate(role === 'admin' ? 'Admin' : 'User');
            }} />
          )}
        </Stack.Screen>

        <Stack.Screen name="Admin">
          {(props) => (
            <AdminDashboardScreen {...props} onLogout={() => {
              setRole(null);
              props.navigation.navigate('Auth');
            }} />
          )}
        </Stack.Screen>

        <Stack.Screen name="User">
          {(props) => (
            <UserTabs {...props} onLogout={() => {
              setRole(null);
              props.navigation.navigate('Auth');
            }} />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
