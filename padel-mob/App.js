import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";

import AuthScreen from "./screens/AuthScreen.jsx";
import HomeScreen from "./screens/HomeScreen.jsx";
import CourtsScreen from "./screens/CourtsScreen.jsx";
import ProfileScreen from "./screens/ProfileScreen.jsx";
import AdminDashboardScreen from "./screens/AdminDashboardScreen.jsx";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function UserTabs({ onLogout }) {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Courts" component={CourtsScreen} />
      <Tab.Screen name="Profile">
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Auth');

  // Charger rôle du stockage local
  useEffect(() => {
    const loadRole = async () => {
      try {
        const savedRole = await AsyncStorage.getItem("role");
        if (savedRole) {
          setRole(savedRole);
          setInitialRoute(savedRole === 'admin' ? 'Admin' : 'User');
        }
      } catch (e) {
        console.log("Erreur stockage rôle", e);
      }
      setLoading(false);
    };
    loadRole();
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
