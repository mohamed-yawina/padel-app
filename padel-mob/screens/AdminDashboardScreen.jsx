import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Calendar, MapPin, LogOut } from "../utils/icons";
import API from "../api";

import AdminReservationsScreen from "./AdminReservationsScreen";
import AdminTerrainsScreen from "./AdminTerrainsScreen";

export default function AdminDashboardScreen({ onLogout }) {
  const [active, setActive] = useState("dashboard");
  const [terrainCount, setTerrainCount] = useState(0);
  const [reservationCount, setReservationCount] = useState(0);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const terrains = await API.get("/terrains");
      const reservations = await API.get("/reservations");
      setTerrainCount(terrains.data.length);
      setReservationCount(reservations.data.length);
    } catch (err) {
      console.log("Erreur loading stats:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("role");
      onLogout();
    } catch (e) {
      console.log("Erreur logout", e);
    }
  };

  const renderContent = () => {
    switch (active) {
      case "dashboard":
        return (
          <ScrollView style={styles.dashboardContent}>
            <View style={styles.dashboardHeader}>
              <Text style={styles.dashboardTitle}>📊 Tableau de Bord</Text>
              <Text style={styles.dashboardSubtitle}>Bienvenue dans votre espace de gestion</Text>
            </View>

            {/* STATISTIQUES */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardTerrain]}>
                <Text style={styles.statIcon}>⛳</Text>
                <Text style={styles.statNumber}>{terrainCount}</Text>
                <Text style={styles.statLabel}>Terrains</Text>
              </View>
              <View style={[styles.statCard, styles.statCardReservation]}>
                <Text style={styles.statIcon}>📅</Text>
                <Text style={styles.statNumber}>{reservationCount}</Text>
                <Text style={styles.statLabel}>Réservations</Text>
              </View>
            </View>

            {/* ACTIONS RAPIDES */}
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>⚡ Actions rapides</Text>
              <TouchableOpacity
                onPress={() => setActive("terrains")}
                style={styles.actionCard}
              >
                <Text style={styles.actionIcon}>🏟️</Text>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Gérer les terrains</Text>
                  <Text style={styles.actionDesc}>Ajouter, modifier ou supprimer des terrains</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActive("reservations")}
                style={styles.actionCard}
              >
                <Text style={styles.actionIcon}>📋</Text>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Gérer les réservations</Text>
                  <Text style={styles.actionDesc}>Consulter et gérer les réservations</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* INFOS */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>💡 Conseil</Text>
              <Text style={styles.infoText}>
                Assurez-vous que tous vos terrains sont à jour avec les derniers prix et descriptions.
              </Text>
            </View>
          </ScrollView>
        );
      case "reservations":
        return <AdminReservationsScreen />;
      case "terrains":
        return <AdminTerrainsScreen />;
      default:
        return <AdminReservationsScreen />;
    }
  };

  return (
    <View style={styles.container}>

      {/* ---------- SIDEBAR ---------- */}
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>🛡️ Admin</Text>

        <TouchableOpacity
          onPress={() => setActive("dashboard")}
          style={[styles.sidebarButton, active === "dashboard" && styles.activeButton]}
        >
          <Text style={[styles.sidebarIcon, active === "dashboard" && styles.activeIcon]}></Text>
          <Text style={[styles.sidebarText, active === "dashboard" && styles.activeText]}>
            Accueil
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActive("reservations")}
          style={[styles.sidebarButton, active === "reservations" && styles.activeButton]}
        >
          <Calendar size={20} color={active === "reservations" ? "#fff" : "#4ADE80"} />
          <Text style={[styles.sidebarText, active === "reservations" && styles.activeText]}>
          Réservations
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActive("terrains")}
          style={[styles.sidebarButton, active === "terrains" && styles.activeButton]}
        >
          <MapPin size={20} color={active === "terrains" ? "#fff" : "#4ADE80"} />
          <Text style={[styles.sidebarText, active === "terrains" && styles.activeText]}>
          Terrains
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut size={20} color="#fff" />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* ---------- CONTENU ---------- */}
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
  },
  sidebar: {
    width: 140,
    backgroundColor: "#2d3748",
    paddingTop: 50,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  sidebarTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  sidebarButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  activeButton: {
    backgroundColor: "#4ADE80",
  },
  sidebarIcon: {
    fontSize: 18,
  },
  activeIcon: {
    color: "#fff",
  },
  sidebarText: {
    color: "#4ADE80",
    fontSize: 16,
    marginLeft: 10,
  },
  activeText: {
    color: "#fff",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 30,
    backgroundColor: "#e53e3e",
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 10,
  },
  content: {
    flex: 1,
    padding: 0,
    backgroundColor: "#f9fafb",
  },
  dashboardContent: {
    flex: 1,
    padding: 20,
  },
  dashboardHeader: {
    marginBottom: 30,
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardTerrain: {
    backgroundColor: "#dbeafe",
    borderLeftWidth: 5,
    borderLeftColor: "#2563eb",
  },
  statCardReservation: {
    backgroundColor: "#fef3c7",
    borderLeftWidth: 5,
    borderLeftColor: "#f59e0b",
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1f2937",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  actionsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  actionCard: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    color: "#9ca3af",
  },
  infoCard: {
    backgroundColor: "#ecfdf5",
    borderLeftWidth: 5,
    borderLeftColor: "#10b981",
    borderRadius: 8,
    padding: 14,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: "#047857",
    lineHeight: 18,
  },
});
