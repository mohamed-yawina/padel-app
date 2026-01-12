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
    try {
      const t = await AsyncStorage.getItem("token");
      if (t) return t;
    } catch (e) {
      console.log('API getToken AsyncStorage (web) error', e);
    }
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('token');
      }
    } catch (e) {
      /* ignore */
    }
    return null;
  }

  try {
    const t = await SecureStore.getItemAsync("token");
    if (t) return t;
  } catch (e) {
    console.log('API getToken SecureStore error', e);
  }
  try {
    return await AsyncStorage.getItem("token");
  } catch (e) {
    console.log('API getToken AsyncStorage error', e);
    return null;
  }
}

// Intercepteur : ajoute automatiquement le token
API.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    // don't print full token; only indicate presence and length
    try {
      console.log(`API interceptor: attaching token (len=${token.length}) to ${config.url}`);
    } catch (e) {}
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    try { console.log(`API interceptor: no token found for ${config.url}`); } catch (e) {}
  }
  return config;
});

export default API;
