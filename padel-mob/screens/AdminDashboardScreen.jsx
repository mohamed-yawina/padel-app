import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Calendar, MapPin, LogOut, Menu } from "../utils/icons";

import AdminReservationsScreen from "./AdminReservationsScreen";
import AdminTerrainsScreen from "./AdminTerrainsScreen";

export default function AdminDashboardScreen({ onLogout }) {
  const [active, setActive] = useState("reservations");
  const [menuVisible, setMenuVisible] = useState(false);

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
      {/* ---------- HEADER ---------- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
          <Menu size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
      </View>

      {/* ---------- CONTENU ---------- */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* ---------- MODAL MENU ---------- */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Menu</Text>

            <TouchableOpacity
              onPress={() => {
                setActive("reservations");
                setMenuVisible(false);
              }}
              style={styles.modalButton}
            >
              <Calendar size={20} color="#4ADE80" />
              <Text style={styles.modalButtonText}>Réservations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setActive("terrains");
                setMenuVisible(false);
              }}
              style={styles.modalButton}
            >
              <MapPin size={20} color="#4ADE80" />
              <Text style={styles.modalButtonText}>Terrains</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                handleLogout();
                setMenuVisible(false);
              }}
              style={styles.modalButton}
            >
              <LogOut size={20} color="#4ADE80" />
              <Text style={styles.modalButtonText}>Déconnexion</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2d3748",
    paddingTop: 50,
    paddingHorizontal: 15,
    paddingBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  menuButton: {
    marginRight: 15,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "80%",
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  modalButtonText: {
    fontSize: 16,
    marginLeft: 10,
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#4ADE80",
    fontSize: 16,
  },
});
