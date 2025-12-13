import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Calendar, MapPin, LogOut } from "../utils/icons";

import AdminReservationsScreen from "./AdminReservationsScreen";
import AdminTerrainsScreen from "./AdminTerrainsScreen";

export default function AdminDashboardScreen({ onLogout }) {
  const [active, setActive] = useState("reservations");

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
        <Text style={styles.sidebarTitle}>Admin Panel</Text>

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
    padding: 20,
    backgroundColor: "#fff",
  },
});
