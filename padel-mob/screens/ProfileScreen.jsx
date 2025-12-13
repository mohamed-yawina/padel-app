import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { User } from "../utils/icons";
import { useEffect, useState } from "react";
import API from "../api";

export default function ProfileScreen({ onLogout }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await API.get("/auth/profile");
        setUser(res.data);
      } catch (err) {
        console.log("Erreur profile:", err.response?.data);
      }
    };
    loadProfile();
  }, []);

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ padding: 16 }}>
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <View
          style={{
            width: 90,
            height: 90,
            borderRadius: 50,
            backgroundColor: "#3b82f6",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <User size={48} color="white" />
        </View>

        <Text style={{ fontSize: 24, fontWeight: "bold", marginTop: 8 }}>
          {user.nom}
        </Text>
        <Text style={{ color: "gray" }}>Email: {user.email}</Text>
        <Text style={{ color: "gray" }}>Rôle: {user.role}</Text>
        <Text style={{ color: "gray" }}>Niveau: {user.niveau}</Text>
        <Text style={{ color: "gray" }}>
          Inscrit le: {new Date(user.dateInscription).toLocaleDateString()}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onLogout}
        style={{
          backgroundColor: "#ef4444",
          padding: 16,
          borderRadius: 10,
          marginTop: 20,
        }}
      >
        <Text style={{ textAlign: "center", color: "white", fontWeight: "bold" }}>
          Déconnexion
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
