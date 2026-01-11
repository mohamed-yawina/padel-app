import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from "react-native";
import API from "../api";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Trophy } from "../utils/icons";

export default function AuthScreen({ onLoginSuccess }) {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nom, setNom] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Fonction universelle pour sauvegarder token
  async function saveToken(key, value) {
    if (Platform.OS === "web") {
      return await AsyncStorage.setItem(key, value);
    }
    return await SecureStore.setItemAsync(key, value);
  }

  // ---------------- LOGIN NORMAL ----------------
  const loginBackend = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await API.post("/auth/login", {
        email,
        motDePasse: password,
      });

      const data = res.data;
      await saveToken("token", data.token);
      await saveToken("role", data.user.role);

      onLoginSuccess(data.user.role);
    } catch (err) {
      console.log("LOGIN ERROR:", err.response?.data || err.message || err);
      const msg = err.response?.data?.message || "Connexion impossible";
      setErrorMessage(msg);
      Alert.alert("Erreur", msg);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- REGISTER ----------------
  const registerBackend = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await API.post("/auth/register", {
        nom,
        email,
        motDePasse: password,
        role: "joueur",
        niveau: "debutant",
      });

      const data = res.data;
      await saveToken("token", data.token);
      await saveToken("role", data.user.role);

      onLoginSuccess(data.user.role);
    } catch (err) {
      console.log("REGISTER ERROR:", err.response?.data || err.message || err);
      const msg = err.response?.data?.message || "Inscription impossible";
      setErrorMessage(msg);
      Alert.alert("Erreur", msg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={styles.logoWrap}>
              <View style={styles.logoCircle}>
                <Trophy size={36} color="#2563eb" />
              </View>
              <Text style={styles.titleMain}>PadelApp</Text>
              <Text style={styles.titleSub}>Réservez. Jouez. Progressez.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.heading}>{isRegister ? "S'inscrire" : "Se connecter"}</Text>

              {isRegister && (
                <TextInput
                  placeholder="Nom"
                  value={nom}
                  onChangeText={setNom}
                  style={styles.input}
                  placeholderTextColor="#9ca3af"
                />
              )}

              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                placeholderTextColor="#9ca3af"
              />

              <TextInput
                placeholder="Mot de passe"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                placeholderTextColor="#9ca3af"
              />

              {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

              <TouchableOpacity
                onPress={isRegister ? registerBackend : loginBackend}
                style={[styles.button, (loading || (!email || !password)) && styles.buttonDisabled]}
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{isRegister ? "S'inscrire" : "Connexion"}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setIsRegister(!isRegister)} style={styles.switch}>
                <Text style={styles.switchText}>
                  {isRegister ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#2563eb" },
  container: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  appTitle: { color: "#fff", fontSize: 36, fontWeight: "800", marginBottom: 20 },
  logoWrap: { alignItems: "center", marginBottom: 18 },
  logoCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 6 },
  titleMain: { color: "#fff", fontSize: 26, fontWeight: "800", marginTop: 12, letterSpacing: 0.6 },
  titleSub: { color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 4, opacity: 0.95 },
  card: { width: "100%", backgroundColor: "#fff", borderRadius: 16, padding: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 6 },
  heading: { fontSize: 20, fontWeight: "700", marginBottom: 12, color: "#111827" },
  input: { backgroundColor: "#f3f4f6", padding: 14, borderRadius: 10, marginBottom: 12, color: "#111827" },
  button: { backgroundColor: "#1e40af", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 6 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700" },
  switch: { padding: 12, alignItems: "center" },
  switchText: { color: "#2563eb", fontWeight: "600" },
  error: { color: "#b91c1c", marginBottom: 8 },
});
