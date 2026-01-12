import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, RefreshControl } from "react-native";
import { Clock, MapPin, Calendar, User, AlertCircle } from "../utils/icons";
import API from "../api";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export default function CourtsScreen() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Robust token retrieval: try SecureStore (native), AsyncStorage, then localStorage (web)
  const getStoredToken = async () => {
    // Avoid SecureStore on web where its native implementation isn't available
    if (Platform && Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          const t = localStorage.getItem('token');
          if (t) {
            console.log('getStoredToken: from localStorage');
            return t;
          }
        }
      } catch (e) {
        console.log('localStorage get error', e);
      }
      try {
        if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
          const t = await AsyncStorage.getItem('token');
          if (t) {
            console.log('getStoredToken: from AsyncStorage (web)');
            return t;
          }
        }
      } catch (e) {
        console.log('AsyncStorage get error (web)', e);
      }
      return null;
    }

    try {
      if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
        const t = await SecureStore.getItemAsync('token');
        if (t) {
          console.log('getStoredToken: from SecureStore');
          return t;
        }
      }
    } catch (e) {
      console.log('SecureStore get error', e);
    }

    try {
      if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
        const t = await AsyncStorage.getItem('token');
        if (t) {
          console.log('getStoredToken: from AsyncStorage');
          return t;
        }
      }
    } catch (e) {
      console.log('AsyncStorage get error', e);
    }

    try {
      if (typeof localStorage !== 'undefined') {
        const t = localStorage.getItem('token');
        if (t) {
          console.log('getStoredToken: from localStorage fallback');
          return t;
        }
      }
    } catch (e) {
      /* ignore */
    }

    return null;
  };
  useEffect(() => {
    loadUserAndReservations();
  }, []);

  const loadUserAndReservations = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);
      const token = await getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }

      // Décoder le token pour obtenir l'ID utilisateur
      const tokenPayload = JSON.parse(atob(token.split(".")[1]));
      const currentUserId = String(tokenPayload._id);
      console.log('loadUserAndReservations: currentUserId=', currentUserId);
      console.log('loadUserAndReservations: token present len=', token ? token.length : 0);

      // Charger les réservations
      const res = await API.get("/reservations/me");
      const userReservations = res.data.filter((r) => {
        return r.statusReservation === "confirmee";
      });
      setReservations(userReservations.sort((a, b) => new Date(a.date) - new Date(b.date)));
    } catch (err) {
      console.log("Erreur chargement réservations:", err);
      if (err.response) {
        console.log('API error response status:', err.response.status);
        console.log('API error response data:', err.response.data);
      }
    } finally {
      if (!isRefresh) setLoading(false);
      else setRefreshing(false);
    }
  };

  const canCancelReservation = (reservation) => {
    const now = new Date();
    const reservationDate = new Date(reservation.date);
    const [hours, minutes] = reservation.heureDebut.split(':');
    reservationDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const timeDiff = reservationDate - now;
    return timeDiff > 60 * 60 * 1000; // More than 1 hour
  };

  const onRefresh = () => {
    loadUserAndReservations(true);
  };

  const cancelReservation = async (reservationId) => {
    try {
      await API.delete(`/reservations/${reservationId}`);
      Alert.alert("Succès", "Réservation annulée et supprimée avec succès.");
      onRefresh(); // Refresh the list
    } catch (err) {
      console.log("Erreur annulation:", err);
      const message = err.response?.data?.message || "Erreur lors de l'annulation";
      Alert.alert("Erreur", message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={true}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <MapPin size={28} color="#2563eb" style={{ marginRight: 10 }} />
          <Text style={styles.title}>Mes Réservations</Text>
        </View>
        <Text style={styles.subtitle}>Vos tickets de réservation</Text>
      </View>

      {reservations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AlertCircle size={50} color="#9ca3af" />
          <Text style={styles.emptyText}>Aucune réservation confirmée</Text>
          <Text style={styles.emptySubtext}>Réservez un court pour voir votre ticket ici</Text>
        </View>
      ) : (
        reservations.map((reservation) => (
          <View key={reservation._id} style={styles.ticketCard}>
            {/* En-tête du ticket */}
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketTitle}>🎫 TICKET DE RÉSERVATION</Text>
              <Text style={styles.ticketId}>ID: {reservation._id.slice(-8).toUpperCase()}</Text>
            </View>

            {/* Ligne de séparation */}
            <View style={styles.divider} />

            {/* Informations principales */}
            <View style={styles.ticketContent}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <MapPin size={20} color="#2563eb" />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>TERRAIN</Text>
                  <Text style={styles.infoValue}>{reservation.terrain?.nom || "N/A"}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Calendar size={20} color="#2563eb" />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>DATE</Text>
                  <Text style={styles.infoValue}>
                    {new Date(reservation.date).toLocaleDateString("fr-FR", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Clock size={20} color="#2563eb" />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>HEURE</Text>
                  <Text style={styles.infoValue}>
                    {reservation.heureDebut} → {reservation.heureFin}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <User size={20} color="#2563eb" />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>JOUEUR</Text>
                  <Text style={styles.infoValue}>{reservation.joueur?.nom || "N/A"}</Text>
                </View>
              </View>

              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <View style={styles.infoIconContainer}>
                  <Text style={{ fontSize: 20 }}>💰</Text>
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>PRIX</Text>
                  <Text style={[styles.infoValue, { color: "#10b981", fontWeight: "bold" }]}>
                    {reservation.prix} MAD
                  </Text>
                </View>
              </View>
            </View>

            {/* Ligne de séparation */}
            <View style={styles.divider} />

            {/* Code QR */}
            <View style={styles.qrContainer}>
              <Text style={styles.qrLabel}>CODE D'ACCÈS</Text>
              <View style={styles.qrBox}>
                <Text style={styles.qrCode}>{reservation._id.slice(0, 12).toUpperCase()}</Text>
              </View>
            </View>

            {/* Statut */}
            <View style={styles.statusContainer}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>✓ CONFIRMÉE</Text>
              </View>
              <Text style={styles.statusSubtext}>
                Statut paiement: <Text style={{ fontWeight: "bold", color: reservation.statusPaiement === "paye" ? "#10b981" : "#f59e0b" }}>
                  {reservation.statusPaiement === "paye" ? "PAYÉE" : "EN ATTENTE"}
                </Text>
              </Text>
            </View>

            {/* Bouton Annuler */}
            <TouchableOpacity
              style={[
                styles.cancelButton,
                !canCancelReservation(reservation) && styles.cancelButtonDisabled
              ]}
              onPress={() => cancelReservation(reservation._id)}
              disabled={!canCancelReservation(reservation)}
            >
              <Text style={[
                styles.cancelButtonText,
                !canCancelReservation(reservation) && styles.cancelButtonTextDisabled
              ]}>
                {!canCancelReservation(reservation) ? "Annulation impossible (< 1h)" : "Annuler la réservation"}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1f2937",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
  },
  ticketCard: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  ticketHeader: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  ticketId: {
    fontSize: 12,
    color: "#dbeafe",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  ticketContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "500",
    marginTop: 2,
  },
  qrContainer: {
    padding: 16,
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  qrLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  qrBox: {
    borderWidth: 2,
    borderColor: "#2563eb",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "white",
  },
  qrCode: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2563eb",
    letterSpacing: 2,
    textAlign: "center",
  },
  statusContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f0f9ff",
    borderTopWidth: 1,
    borderTopColor: "#e0f2fe",
    alignItems: "center",
  },
  statusBadge: {
    backgroundColor: "#dbeafe",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusText: {
    color: "#1e40af",
    fontSize: 13,
    fontWeight: "600",
  },
  statusSubtext: {
    fontSize: 12,
    color: "#475569",
  },
  cancelButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
  },
  cancelButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButtonTextDisabled: {
    color: "#6b7280",
  },
});
