import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { User, Mail, Award, Calendar, LogOut, Home } from "../utils/icons";
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
      <View style={styles.loadingContainer}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerSection}>
        <View style={styles.headerBackground}>
          <Home size={32} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Mon Profil</Text>
        </View>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <User size={56} color="white" />
          </View>
        </View>

        <Text style={styles.userName}>{user.nom}</Text>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Mail size={20} color="#2563eb" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Award size={20} color="#2563eb" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Rôle</Text>
              <Text style={styles.infoValue}>{user.role === "admin" ? "Administrateur" : "Joueur"}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Award size={20} color="#2563eb" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Niveau</Text>
              <Text style={styles.infoValue}>
                {user.niveau === "debutant" && "Débutant"}
                {user.niveau === "intermediaire" && "Intermédiaire"}
                {user.niveau === "avance" && "Avancé"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Calendar size={20} color="#2563eb" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Inscription</Text>
              <Text style={styles.infoValue}>
                {new Date(user.dateInscription).toLocaleDateString("fr-FR")}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={onLogout}
          style={styles.logoutButton}
        >
          <LogOut size={20} color="white" />
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  headerSection: {
    backgroundColor: "#2563eb",
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerBackground: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  profileCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: -30,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  userName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 20,
  },
  infoSection: {
    gap: 12,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#2563eb",
  },
  infoIcon: {
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 3,
  },
  logoutButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
