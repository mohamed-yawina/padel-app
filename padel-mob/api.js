// API.js
import axios from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Utiliser directement NGROK pour mobile, localhost pour web
const NGROK_URL = "https://jerrold-hyacinthine-valene.ngrok-free.dev";
const LOCAL_URL = "http://localhost:5000";

const API = axios.create({
  baseURL: Platform.OS === "web" ? `${LOCAL_URL}/api` : `${NGROK_URL}/api`,
});

// Fonction universelle pour récupérer le token
async function getToken() {
  if (Platform.OS === "web") {
    return await AsyncStorage.getItem("token");
  }
  return await SecureStore.getItemAsync("token");
}

// Intercepteur : ajoute automatiquement le token
API.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;
