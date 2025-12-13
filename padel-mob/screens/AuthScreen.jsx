import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, Platform } from "react-native";
import API from "../api";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AuthScreen({ onLoginSuccess }) {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nom, setNom] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  // Fonction universelle pour sauvegarder token
  async function saveToken(key, value) {
    if (Platform.OS === "web") {
      return await AsyncStorage.setItem(key, value);
    }
    return await SecureStore.setItemAsync(key, value);
  }

  // ---------------- LOGIN NORMAL ----------------
  const loginBackend = async () => {
    try {
      const res = await API.post("/auth/login", {
        email,
        motDePasse: password,  // Vérifie ton backend !!!
      });

      const data = res.data;
      console.log("LOGIN SUCCESS:", data);

      await saveToken("token", data.token);
      await saveToken("role", data.user.role);

      onLoginSuccess(data.user.role);

    } catch (err) {
      console.log("LOGIN RAW:", err);
      console.log("LOGIN RESPONSE:", err.response);
      console.log("LOGIN DATA:", err.response?.data);

      Alert.alert("Erreur", err.response?.data?.message || "Connexion impossible");
    }
  };

  // ---------------- REGISTER ----------------
  const registerBackend = async () => {
    try {
      const res = await API.post("/auth/register", {
        nom,
        email,
        motDePasse: password,
        role: "joueur", // default
        niveau: "debutant", // default
      });

      const data = res.data;
      console.log("REGISTER SUCCESS:", data);

      await saveToken("token", data.token);
      await saveToken("role", data.user.role);

      onLoginSuccess(data.user.role);

    } catch (err) {
      console.log("REGISTER RAW:", err);
      console.log("REGISTER RESPONSE:", err.response);
      console.log("REGISTER DATA:", err.response?.data);

      Alert.alert("Erreur", err.response?.data?.message || "Inscription impossible");
    }
  };

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: "bold", marginBottom: 20 }}>
        {isRegister ? "S'inscrire" : "Se connecter"}
      </Text>

      {isRegister && (
        <TextInput
          placeholder="Nom"
          value={nom}
          onChangeText={setNom}
          style={{
            backgroundColor: "#eef3ff",
            padding: 14,
            borderRadius: 10,
            marginBottom: 12,
          }}
        />
      )}

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{
          backgroundColor: "#eef3ff",
          padding: 14,
          borderRadius: 10,
          marginBottom: 12,
        }}
      />

      <TextInput
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          backgroundColor: "#eef3ff",
          padding: 14,
          borderRadius: 10,
          marginBottom: 20,
        }}
      />

      <TouchableOpacity
        onPress={isRegister ? registerBackend : loginBackend}
        style={{
          backgroundColor: "#2563eb",
          padding: 16,
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <Text style={{ textAlign: "center", color: "white", fontWeight: "bold" }}>
          {isRegister ? "S'inscrire" : "Connexion"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setIsRegister(!isRegister)}
        style={{
          padding: 10,
        }}
      >
        <Text style={{ textAlign: "center", color: "#2563eb" }}>
          {isRegister ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
