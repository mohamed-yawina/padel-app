import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  Linking,
} from "react-native";
import { Calendar, MapPin, Clock, Heart, AlertCircle, CheckCircle } from "../utils/icons";
import API from "../api";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Note: avoid using react-native-webview for cross-platform Stripe Checkout redirect

// Helper to extract user ID from JWT token
async function getUserIdFromToken() {
  try {
    let token;
    if (Platform.OS === 'web') {
      token = await AsyncStorage.getItem('token');
    } else {
      token = await SecureStore.getItemAsync('token');
    }
    
    if (!token) {
      console.warn('No token found');
      return null;
    }
    
    // Decode JWT (payload is second part, base64 encoded)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid token format');
      return null;
    }
    
    try {
      // Base64 decode the payload using atob (available in React Native)
      const decoded = JSON.parse(atob(parts[1]));
      return decoded._id || decoded.id || decoded.userId;
    } catch (decodeErr) {
      console.warn('Failed to decode token:', decodeErr);
      return null;
    }
  } catch (err) {
    console.warn('Error getting userId from token:', err);
    return null;
  }
}

export default function HomeScreen() {
  const [terrains, setTerrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedTerrain, setSelectedTerrain] = useState(null);
  const [reservationDate, setReservationDate] = useState("");
  const [reservationTime, setReservationTime] = useState("");
  const [reservationSubmitting, setReservationSubmitting] = useState(false);
  const [userName, setUserName] = useState("Joueur");
  const [reservationCount, setReservationCount] = useState(0);
  const [occupiedSlots, setOccupiedSlots] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  
  // Stripe checkout state

  useEffect(() => {
    loadTerrains();
    loadUserProfile();
    loadUserReservations();
  }, []);

  const loadUserProfile = async () => {
    try {
      const res = await API.get("/auth/me");
      setUserName(res.data.nom);
    } catch (err) {
      console.log("Erreur profil:", err);
    }
  };

  const loadUserReservations = async () => {
    try {
      const res = await API.get("/reservations/me");
      setReservationCount(res.data.length);
    } catch (err) {
      console.log("Erreur réservations:", err);
    }
  };

  const loadTerrains = async () => {
    try {
      setLoading(true);
      const res = await API.get("/terrains");
      setTerrains(res.data);
    } catch (err) {
      console.log("Erreur terrains:", err);
    } finally {
      setLoading(false);
    }
  };

  const openReservationModal = (terrain) => {
    setSelectedTerrain(terrain);
    setReservationDate("");
    setReservationTime("");
    setOccupiedSlots([]);
    setPaymentMethod(null);
    setShowReservationModal(true);
  };

  const loadOccupiedSlots = async (terrainId, date) => {
    if (!date) return;
    try {
      const res = await API.get(`/reservations/occupied?terrainId=${terrainId}&date=${date}`);
      setOccupiedSlots(res.data || []);
    } catch (err) {
      console.log("Erreur créneaux occupés:", err);
    }
  };

  const isTimeSlotOccupied = (hour) => {
    const timeStr = `${String(hour).padStart(2, '0')}:00`;
    return occupiedSlots.some(slot => {
      const slotHour = parseInt(slot.heureDebut.split(':')[0]);
      return slotHour === hour;
    });
  };

  const getMinDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleReservation = async () => {
    if (!reservationDate || !reservationTime || !paymentMethod) {
      alert("Veuillez remplir tous les champs et choisir une méthode de paiement");
      return;
    }

    if (paymentMethod === "en_ligne") {
      await handleStripePayment();
    } else {
      createReservation("en_attente", "sur_site");
    }
  };

  const createReservation = async (status = "en_attente", method = paymentMethod) => {
    try {
      setReservationSubmitting(true);
      const payload = {
        terrainId: selectedTerrain._id,
        date: reservationDate,
        time: reservationTime,
        methodePaiement: method,
        statusPaiement: method === "en_ligne" ? "paye" : "en_attente",
        statusReservation: status,
      };
      const res = await API.post("/reservations", payload);
      alert("Réservation effectuée avec succès ! ✅");
      setShowReservationModal(false);
      setPaymentMethod(null);
      loadTerrains();
      loadUserReservations();
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la réservation");
    } finally {
      setReservationSubmitting(false);
    }
  };

  const handleStripePayment = async () => {
    try {
      setPaymentProcessing(true);
      
      // Get real user ID from token
      const realUserId = await getUserIdFromToken();
      if (!realUserId) {
        Alert.alert('Erreur', 'Impossible de récupérer votre ID utilisateur. Veuillez vous reconnecter.');
        setPaymentProcessing(false);
        return;
      }
      
      const response = await API.post('/stripe/create-checkout-session', {
        amount: selectedTerrain?.prixParHeure,
        currency: 'mad',
        metadata: {
          terrainId: selectedTerrain?._id,
          terrainName: selectedTerrain?.nom,
          date: reservationDate,
          time: reservationTime,
          userId: realUserId
        }
      });

      const { url, sessionId } = response.data;
      setPaymentIntentId(sessionId);

      // Close the reservation modal and open Stripe Checkout in browser
      setShowReservationModal(false);
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.open(url, '_blank');
          
          // Poll to verify payment completion every 2 seconds (for 60 seconds max)
          let attempts = 0;
          const pollInterval = setInterval(async () => {
            attempts++;
            if (attempts > 30) { // 30 * 2 = 60 seconds
              clearInterval(pollInterval);
              setPaymentProcessing(false);
              Alert.alert('⏳ Vérification du paiement', 'Veuillez fermer la fenêtre de paiement et revenir à l\'app.');
              return;
            }
            
            try {
              const verifyRes = await API.post(`/stripe/verify-and-create-reservation/${sessionId}`);
              console.log('🔍 Polling tentative', attempts, '- Raison:', verifyRes.data.reason, 'Créé:', verifyRes.data.created);
              
              if (verifyRes.data.created) {
                clearInterval(pollInterval);
                setPaymentProcessing(false);
                Alert.alert('✅ Succès', 'Votre réservation a été confirmée !');
                setPaymentMethod(null);
                loadTerrains();
                loadUserReservations();
              } else if (verifyRes.data.reason === 'already_exists') {
                clearInterval(pollInterval);
                setPaymentProcessing(false);
                Alert.alert('✅ Succès', 'Votre réservation a été confirmée !');
                setPaymentMethod(null);
                loadTerrains();
                loadUserReservations();
              } else if (verifyRes.data.reason === 'payment_pending') {
                // Paiement pas encore confirmé, continuer le polling
                console.log('⏳ Paiement en cours... status:', verifyRes.data.payment_status);
              }
            } catch (pollErr) {
              // Erreur lors de la vérification, continuer le polling
              console.log('Erreur polling tentative', attempts, ':', pollErr.message);
            }
          }, 2000);
        } else {
          await Linking.openURL(url);
          
          // Similar polling for mobile - same as web version
          let mobileAttempts = 0;
          const mobilePollInterval = setInterval(async () => {
            mobileAttempts++;
            if (mobileAttempts > 60) { // 60 * 2 = 120 seconds (2 minutes max)
              clearInterval(mobilePollInterval);
              setPaymentProcessing(false);
              Alert.alert('⏳ Vérification du paiement', 'Veuillez fermer la fenêtre de paiement et revenir à l\'app.');
              return;
            }
            
            try {
              const verifyRes = await API.post(`/stripe/verify-and-create-reservation/${sessionId}`);
              console.log('📱 Polling mobile tentative', mobileAttempts, '- Raison:', verifyRes.data.reason);
              
              if (verifyRes.data.created) {
                clearInterval(mobilePollInterval);
                setPaymentProcessing(false);
                Alert.alert('✅ Succès', 'Votre réservation a été confirmée !');
                setPaymentMethod(null);
                loadTerrains();
                loadUserReservations();
              } else if (verifyRes.data.reason === 'already_exists') {
                clearInterval(mobilePollInterval);
                setPaymentProcessing(false);
                Alert.alert('✅ Succès', 'Votre réservation a été confirmée !');
                setPaymentMethod(null);
                loadTerrains();
                loadUserReservations();
              } else if (verifyRes.data.reason === 'payment_pending') {
                console.log('⏳ Paiement en cours... status:', verifyRes.data.payment_status);
              }
            } catch (pollErr) {
              console.log('Erreur polling mobile tentative', mobileAttempts, ':', pollErr.message);
            }
          }, 2000);
        }
      } catch (openErr) {
        Alert.alert('Erreur', 'Impossible d\u2019ouvrir la page de paiement');
        setPaymentProcessing(false);
      }
      
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer la session de paiement');
      setPaymentProcessing(false);
      setReservationSubmitting(false);
    }
  };

  const verifyPaymentStatus = async () => {
    try {
      const response = await API.get(`/stripe/session-status/${paymentIntentId}`);
      
      if (response.data.status === 'complete' || response.data.payment_status === 'paid') {
        await createReservation("confirmee", "en_ligne");
        Alert.alert('Succès', 'Paiement et réservation confirmés!');
      } else {
        Alert.alert('Attention', 'Le paiement n\'a pas été confirmé');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de vérifier le statut du paiement');
    }
  };

  // No in-app WebView navigation handling — we open Stripe Checkout in the system browser

  const filteredTerrains = terrains.filter(terrain => {
    const matchesSearch = terrain.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      terrain.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      terrain.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === "all" || terrain.type === filterType;
    
    return matchesSearch && matchesType;
  });

  // Composant pour encapsuler les emojis
  const EmojiText = ({ children, style }) => (
    <View style={styles.emojiContainer}>
      <Text style={[styles.emojiText, style]}>{children}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* WELCOME SECTION */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeTitle}>Réserver Votre Terrain</Text>
              <Text style={styles.welcomeSubtitle}>Trouvez et réservez les meilleurs courts de padel près de vous</Text>
              
              <View style={styles.featuresContainer}>
                <View style={styles.featureItem}>
                  <EmojiText style={styles.featureEmoji}>⚡</EmojiText>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>Réservation Instant</Text>
                    <Text style={styles.featureDescription}>Confirmée en quelques clics</Text>
                  </View>
                </View>
                
                <View style={styles.featureItem}>
                  <EmojiText style={styles.featureEmoji}>🔒</EmojiText>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>Paiement Sécurisé</Text>
                    <Text style={styles.featureDescription}>En ligne ou sur place</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* SEARCH SECTION */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <View style={styles.searchIconWrapper}>
              <Text style={styles.searchIconText}>🔍</Text>
            </View>
            <TextInput
              placeholder="Chercher un terrain..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor="#9ca3af"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* FILTERS */}
          <View style={styles.filtersContainer}>
            <TouchableOpacity
              onPress={() => setFilterType("all")}
              style={[
                styles.filterButton,
                filterType === "all" && styles.filterButtonActive,
              ]}
            >
              <Text style={[
                styles.filterButtonText,
                filterType === "all" && styles.filterButtonTextActive,
              ]}>Tous</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setFilterType("indoor")}
              style={[
                styles.filterButton,
                filterType === "indoor" && styles.filterButtonActive,
              ]}
            >
              <View style={styles.filterButtonContent}>
                <Text style={styles.filterButtonIcon}>🏠</Text>
                <Text style={[
                  styles.filterButtonText,
                  filterType === "indoor" && styles.filterButtonTextActive,
                ]}>Indoor</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setFilterType("outdoor")}
              style={[
                styles.filterButton,
                filterType === "outdoor" && styles.filterButtonActive,
              ]}
            >
              <View style={styles.filterButtonContent}>
                <Text style={styles.filterButtonIcon}>🌞</Text>
                <Text style={[
                  styles.filterButtonText,
                  filterType === "outdoor" && styles.filterButtonTextActive,
                ]}>Outdoor</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          {/* SECTION TITLE */}
          <View style={styles.sectionTitleContainer}>
            <Heart size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>
              {searchQuery ? `Résultats (${filteredTerrains.length})` : "Terrains disponibles"}
            </Text>
          </View>
        </View>

        {/* TERRAINS LIST */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : filteredTerrains.length > 0 ? (
          <View style={styles.terrainsList}>
            {filteredTerrains.map((terrain) => (
              <TouchableOpacity
                key={terrain._id}
                style={styles.terrainCard}
                activeOpacity={0.9}
              >
                <View style={styles.terrainImageContainer}>
                  {terrain.imageUrl && (
                    <Image
                      source={{ uri: terrain.imageUrl }}
                      style={styles.terrainImage}
                    />
                  )}
                  <View style={styles.terrainBadge}>
                    <MapPin size={14} color="white" />
                    <Text style={styles.terrainBadgeText}>
                      {terrain.type === "indoor" ? "INDOOR" : "OUTDOOR"}
                    </Text>
                  </View>
                </View>

                <View style={styles.terrainInfo}>
                  <Text style={styles.terrainName}>{terrain.nom}</Text>
                  <Text style={styles.terrainDescription}>{terrain.description}</Text>

                  <View style={styles.terrainDetails}>
                    <View style={styles.detailItem}>
                      <View style={styles.detailIconContainer}>
                        <Clock size={16} color="#6b7280" />
                        <Text style={styles.detailLabel}>Prix/heure</Text>
                      </View>
                      <Text style={styles.detailValue}>{terrain.prixParHeure} MAD</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <View style={styles.detailIconContainer}>
                        <MapPin size={16} color="#6b7280" />
                        <Text style={styles.detailLabel}>Type</Text>
                      </View>
                      <Text style={styles.detailValue}>{terrain.type}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => openReservationModal(terrain)}
                    style={styles.bookButton}
                  >
                    <View style={styles.bookButtonContent}>
                      <Calendar size={16} color="white" />
                      <Text style={styles.bookButtonText}>Réserver</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>😕</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery 
                ? "Aucun terrain ne correspond à votre recherche" 
                : "Aucun terrain disponible pour le moment"}
            </Text>
            {searchQuery && (
              <TouchableOpacity 
                onPress={() => setSearchQuery("")}
                style={styles.resetButton}
              >
                <Text style={styles.resetButtonText}>Réinitialiser la recherche</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* MODAL RESERVATION */}
        {selectedTerrain && (
          <ReservationModal
            visible={showReservationModal}
            terrain={selectedTerrain}
            reservationDate={reservationDate}
            setReservationDate={setReservationDate}
            onDateChange={loadOccupiedSlots}
            reservationTime={reservationTime}
            setReservationTime={setReservationTime}
            occupiedSlots={occupiedSlots}
            isTimeSlotOccupied={isTimeSlotOccupied}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            onReserve={handleReservation}
            onCancel={() => {
              setShowReservationModal(false);
              setPaymentMethod(null);
              setReservationSubmitting(false);
              setPaymentProcessing(false);
            }}
            isSubmitting={reservationSubmitting || paymentProcessing}
          />
        )}

        {/* Stripe Checkout opens in external browser; no in-app WebView on cross-platform builds */}
      </ScrollView>
    </SafeAreaView>
  );
}

// MODAL COMPONENT
function ReservationModal({
  visible,
  terrain,
  reservationDate,
  setReservationDate,
  onDateChange,
  reservationTime,
  setReservationTime,
  occupiedSlots,
  isTimeSlotOccupied,
  paymentMethod,
  setPaymentMethod,
  onReserve,
  onCancel,
  isSubmitting,
}) {
  const getMinDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (date) => {
    setReservationDate(date);
    if (terrain && date.length === 10 && date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      onDateChange(terrain._id, date);
    }
  };

  const timeSlots = Array.from({ length: 14 }, (_, i) => 9 + i);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Calendar size={24} color="#2563eb" />
              <Text style={styles.modalTitle}>Réserver un terrain</Text>
            </View>
            <TouchableOpacity onPress={onCancel} disabled={isSubmitting}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {terrain && (
              <>
                {terrain.imageUrl && (
                  <Image source={{ uri: terrain.imageUrl }} style={styles.modalImage} />
                )}

                <View style={styles.modalTerrainInfo}>
                  <Text style={styles.modalTerrainName}>{terrain.nom}</Text>
                  <Text style={styles.modalTerrainPrice}>{terrain.prixParHeure} MAD/h</Text>
                  <View style={styles.modalTerrainType}>
                    <MapPin size={16} color="#2563eb" />
                    <Text style={styles.modalTerrainTypeText}>
                      {terrain.type === "indoor" ? "🏠 Indoor" : "🌞 Outdoor"}
                    </Text>
                  </View>
                </View>

                <View style={styles.formContainer}>
                  {/* DATE */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>📅 Date (JJ/MM/AAAA)</Text>
                    <TextInput
                      placeholder={getMinDate()}
                      value={reservationDate}
                      onChangeText={handleDateChange}
                      style={styles.formInput}
                      placeholderTextColor="#9ca3af"
                      editable={!isSubmitting}
                    />
                    <Text style={styles.formHint}>Date minimum: {getMinDate()}</Text>
                  </View>

                  {/* TIME */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>⏰ Heure de début</Text>
                    <View style={styles.timeSlotsGrid}>
                      {timeSlots.map((hour) => {
                        const timeLabel = `${String(hour).padStart(2, '0')}:00`;
                        const occupied = isTimeSlotOccupied(hour);
                        const selected = reservationTime === timeLabel;

                        return (
                          <TouchableOpacity
                            key={hour}
                            onPress={() => !occupied && !isSubmitting && setReservationTime(timeLabel)}
                            disabled={occupied || isSubmitting}
                            style={[
                              styles.timeSlot,
                              occupied && styles.timeSlotOccupied,
                              selected && styles.timeSlotSelected,
                            ]}
                          >
                            <View style={styles.timeSlotContent}>
                              {occupied && <AlertCircle size={14} color="#ef4444" />}
                              {selected && <CheckCircle size={14} color="white" />}
                              {!occupied && !selected && (
                                <Text style={[
                                  styles.timeSlotText,
                                  selected && styles.timeSlotTextSelected,
                                ]}>
                                  {timeLabel}
                                </Text>
                              )}
                              {(occupied || selected) && (
                                <Text style={[
                                  styles.timeSlotText,
                                  occupied && styles.timeSlotTextOccupied,
                                  selected && styles.timeSlotTextSelected,
                                ]}>
                                  {timeLabel}
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {occupiedSlots.length > 0 && (
                      <View style={styles.occupiedWarning}>
                        <AlertCircle size={16} color="#ef4444" />
                        <View style={styles.occupiedWarningTexts}>
                          <Text style={styles.occupiedWarningTitle}>Créneaux occupés</Text>
                          <Text style={styles.occupiedWarningTimes}>
                            {occupiedSlots.map(s => s.heureDebut).join(", ")}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* PAYMENT */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>💳 Méthode de paiement</Text>
                    
                    <TouchableOpacity
                      onPress={() => !isSubmitting && setPaymentMethod("en_ligne")}
                      disabled={isSubmitting}
                      style={[
                        styles.paymentOption,
                        paymentMethod === "en_ligne" && styles.paymentOptionActive,
                      ]}
                    >
                      <View style={styles.paymentOptionContent}>
                        <View style={styles.paymentOptionIconContainer}>
                          <Text style={styles.paymentOptionIcon}>💳</Text>
                        </View>
                        <View style={styles.paymentOptionTexts}>
                          <Text style={[
                            styles.paymentOptionTitle,
                            paymentMethod === "en_ligne" && styles.paymentOptionTitleActive,
                          ]}>
                            En ligne
                          </Text>
                          <Text style={styles.paymentOptionDescription}>
                            Paiement sécurisé Stripe
                          </Text>
                        </View>
                        {paymentMethod === "en_ligne" && (
                          <CheckCircle size={20} color="#10b981" />
                        )}
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => !isSubmitting && setPaymentMethod("sur_site")}
                      disabled={isSubmitting}
                      style={[
                        styles.paymentOption,
                        paymentMethod === "sur_site" && styles.paymentOptionActive,
                      ]}
                    >
                      <View style={styles.paymentOptionContent}>
                        <View style={styles.paymentOptionIconContainer}>
                          <Text style={styles.paymentOptionIcon}>🏢</Text>
                        </View>
                        <View style={styles.paymentOptionTexts}>
                          <Text style={[
                            styles.paymentOptionTitle,
                            paymentMethod === "sur_site" && styles.paymentOptionTitleActive,
                          ]}>
                            Sur place
                          </Text>
                          <Text style={styles.paymentOptionDescription}>
                            Paiement à la réception
                          </Text>
                        </View>
                        {paymentMethod === "sur_site" && (
                          <CheckCircle size={20} color="#10b981" />
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* BUTTONS */}
                  <TouchableOpacity
                    onPress={onReserve}
                    style={[
                      styles.confirmButton,
                      (isSubmitting || !reservationDate || !reservationTime || !paymentMethod) && 
                      styles.confirmButtonDisabled,
                    ]}
                    disabled={isSubmitting || !reservationDate || !reservationTime || !paymentMethod}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <View style={styles.confirmButtonContent}>
                        <CheckCircle size={18} color="white" />
                        <Text style={styles.confirmButtonText}>
                          {paymentMethod === "en_ligne" ? "Payer et réserver" : "Confirmer la réservation"}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={onCancel}
                    style={styles.cancelButton}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// STYLES
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  container: {
    flex: 1,
  },
  
  // Welcome Section
  welcomeSection: {
    padding: 16,
    paddingTop: 20,
  },
  welcomeCard: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  welcomeContent: {
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 20,
  },
  featuresContainer: {
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 12,
  },
  featureEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  emojiContainer: {
    // Conteneur pour les emojis
  },
  emojiText: {
    // Style pour le texte emoji
  },

  // Search Section
  searchSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchIconWrapper: {
    marginRight: 8,
  },
  searchIconText: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1f2937",
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  clearButtonText: {
    fontSize: 16,
    color: "#9ca3af",
    fontWeight: "bold",
  },
  filtersContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  filterButton: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  filterButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  filterButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  filterButtonIcon: {
    fontSize: 14,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  filterButtonTextActive: {
    color: "white",
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },

  // Terrains List
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  terrainsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  terrainCard: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  terrainImageContainer: {
    position: "relative",
  },
  terrainImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  terrainBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  terrainBadgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },
  terrainInfo: {
    padding: 16,
  },
  terrainName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 6,
  },
  terrainDescription: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
    lineHeight: 18,
  },
  terrainDetails: {
    gap: 10,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: "#6b7280",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  bookButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 12,
  },
  bookButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  bookButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },

  // Empty State
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
  },
  resetButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resetButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  modalClose: {
    fontSize: 24,
    color: "#6b7280",
    fontWeight: "300",
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  modalImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: "cover",
  },
  modalTerrainInfo: {
    marginBottom: 24,
  },
  modalTerrainName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  modalTerrainPrice: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2563eb",
    marginBottom: 8,
  },
  modalTerrainType: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalTerrainTypeText: {
    fontSize: 14,
    color: "#6b7280",
  },
  formContainer: {
    gap: 20,
  },
  formGroup: {
    gap: 12,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  formInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1f2937",
  },
  formHint: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  timeSlotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeSlot: {
    width: "23%",
    aspectRatio: 1.5,
    backgroundColor: "#f9fafb",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  timeSlotOccupied: {
    backgroundColor: "#fee2e2",
    borderColor: "#fecaca",
  },
  timeSlotSelected: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  timeSlotContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  timeSlotTextSelected: {
    color: "white",
  },
  timeSlotTextOccupied: {
    color: "#dc2626",
  },
  occupiedWarning: {
    flexDirection: "row",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  occupiedWarningTexts: {
    flex: 1,
    marginLeft: 10,
  },
  occupiedWarningTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#dc2626",
  },
  occupiedWarningTimes: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  paymentOption: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f9fafb",
  },
  paymentOptionActive: {
    borderColor: "#10b981",
    backgroundColor: "#f0fdf4",
  },
  paymentOptionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentOptionIconContainer: {
    marginRight: 12,
  },
  paymentOptionIcon: {
    fontSize: 22,
  },
  paymentOptionTexts: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  paymentOptionTitleActive: {
    color: "#10b981",
  },
  paymentOptionDescription: {
    fontSize: 12,
    color: "#9ca3af",
  },
  confirmButton: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "white",
  },
  cancelButtonText: {
    color: "#6b7280",
    fontSize: 15,
    fontWeight: "600",
  },
});         