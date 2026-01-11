import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
} from "react-native";
import API from "../api";

export default function AdminReservationsScreen() {
  const [reservations, setReservations] = useState([]);
  const [terrains, setTerrains] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);

  const [terrainId, setTerrainId] = useState("");
  const [date, setDate] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [statusReservation, setStatusReservation] = useState("confirmee");
  const [statusPaiement, setStatusPaiement] = useState("en_attente");
  const [prix, setPrix] = useState("");
  const [joueurId, setJoueurId] = useState("");

  const loadReservations = async () => {
    try {
      const res = await API.get("/reservations");

      console.log("DATA FROM API:", res.data);

      if (Array.isArray(res.data)) {
        setReservations(res.data);
      } else {
        setReservations([]); // évite les crash
      }

    } catch (err) {
      console.log("Erreur reservations:", err.response?.data || err);
      setReservations([]); // évite crash
    }
  };

  const loadTerrains = async () => {
    try {
      const res = await API.get("/terrains");
      setTerrains(res.data);
    } catch (err) {
      console.log("Erreur terrains:", err.response?.data);
      setTerrains([]);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await API.get("/auth/users");
      setUsers(res.data);
    } catch (err) {
      console.log("Erreur users:", err.response?.data);
      setUsers([]);
    }
  };

  useEffect(() => {
    loadReservations();
    loadTerrains();
    loadUsers();
  }, []);

  // ============================
  // 📌 SOUMETTRE (AJOUT OU MODIFICATION)
  // ============================
  const handleSubmit = async () => {
    if (!terrainId || !date || !heureDebut || !heureFin || !prix || (!editingReservation && !joueurId)) {
      return alert("Remplir tous les champs");
    }

    try {
      const data = {
        ...(joueurId && { joueurId }),
        terrainId,
        date,
        heureDebut,
        heureFin,
        statusReservation,
        statusPaiement,
        prix,
      };

      if (editingReservation) {
        // Modification
        await API.put(`/reservations/${editingReservation._id}`, data);
        alert("Réservation modifiée !");
      } else {
        // Ajout
        await API.post("/reservations", data);
        alert("Réservation ajoutée !");
      }

      setShowModal(false);
      resetForm();
      loadReservations();
    } catch (err) {
      console.log("Erreur:", err.response?.data || err);
      alert("Erreur lors de l'opération");
    }
  };

  // ============================
  // 📌 RÉINITIALISER LE FORMULAIRE
  // ============================
  const resetForm = () => {
    setTerrainId("");
    setDate("");
    setHeureDebut("");
    setHeureFin("");
    setStatusReservation("confirmee");
    setStatusPaiement("en_attente");
    setPrix("");
    setJoueurId("");
    setEditingReservation(null);
  };

  // ============================
  // 📌 OUVRIR MODAL POUR ÉDITION
  // ============================
  const handleEdit = (reservation) => {
    setEditingReservation(reservation);
    setJoueurId(reservation.joueur._id);
    setTerrainId(reservation.terrain._id);
    setDate(reservation.date.split('T')[0]); // format YYYY-MM-DD
    setHeureDebut(reservation.heureDebut);
    setHeureFin(reservation.heureFin);
    setStatusReservation(reservation.statusReservation);
    setStatusPaiement(reservation.statusPaiement);
    setPrix(reservation.prix.toString());
    setShowModal(true);
  };

  // ============================
  // 📌 SUPPRIMER UNE RÉSERVATION
  // ============================
  const handleDelete = async (id) => {
    console.log("handleDelete called with id:", id);
    try {
      await API.delete(`/reservations/${id}`);
      alert("Réservation supprimée !");
      loadReservations();
    } catch (err) {
      console.log("Erreur suppression:", err.response?.data);
      alert("Erreur lors de la suppression");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 15 }}>
        <TouchableOpacity
          onPress={() => {
            resetForm();
            setShowModal(true);
          }}
          style={{
            backgroundColor: "#2563eb",
            padding: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold", textAlign: "center" }}>
            + Ajouter Réservation
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 15 }}>
          📅 Liste des réservations
        </Text>

        <FlatList
          data={reservations}
          keyExtractor={(item) => item._id}
          scrollEnabled={true}
          showsVerticalScrollIndicator={true}
          renderItem={({ item: r }) => (
            <View
              style={{
                padding: 15,
                backgroundColor: "white",
                borderRadius: 10,
                marginBottom: 15,
                borderLeftWidth: 5,
                borderLeftColor: "#2563eb",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              <Text style={{ fontWeight: "bold", marginBottom: 8 }}>👤 Joueur : {r.joueur?.nom || "Inconnu"}</Text>
              <Text style={{ marginBottom: 4 }}>🏟️ Terrain : {r.terrain?.nom || "Inconnu"}</Text>
              <Text style={{ marginBottom: 4 }}>📅 Date : {new Date(r.date).toLocaleDateString()}</Text>
              <Text style={{ marginBottom: 4 }}>⏰ Heure : {r.heureDebut} → {r.heureFin}</Text>
              <Text style={{ marginBottom: 4 }}>📊 Status : <Text style={{ fontWeight: "bold", color: "#10b981" }}>{r.statusReservation}</Text></Text>
              <Text style={{ marginBottom: 4 }}>💳 Paiement : <Text style={{ fontWeight: "bold", color: r.statusPaiement === "paye" ? "#10b981" : "#f59e0b" }}>{r.statusPaiement}</Text></Text>
              <Text style={{ marginBottom: 12, fontSize: 16, fontWeight: "bold", color: "#2563eb" }}>💰 Prix : {r.prix} MAD</Text>
              
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => handleEdit(r)}
                  style={{
                    backgroundColor: "#f59e0b",
                    padding: 10,
                    borderRadius: 6,
                    flex: 1,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "white", textAlign: "center", fontWeight: "bold" }}>✏️ Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(r._id)}
                  style={{
                    backgroundColor: "#ef4444",
                    padding: 10,
                    borderRadius: 6,
                    flex: 1,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "white", textAlign: "center", fontWeight: "bold" }}>🗑️ Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ fontStyle: "italic", color: "gray", textAlign: "center", marginTop: 20 }}>
              Aucune réservation trouvée
            </Text>
          }
        />
      </View>

      {/* MODAL AJOUT/ÉDITION */}
      <Modal visible={showModal} animationType="slide">
        <ScrollView style={{ padding: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>
            {editingReservation ? "Modifier la réservation" : "Ajouter une réservation"}
          </Text>

          <Text style={{ marginTop: 10 }}>Joueur sélectionné: {users.find(u => u._id === joueurId)?.nom || "Aucun"}</Text>
          <Text>Sélectionner Joueur:</Text>
          <ScrollView horizontal style={{ maxHeight: 100 }}>
            {users.map((u) => (
              <TouchableOpacity
                key={u._id}
                onPress={() => setJoueurId(u._id)}
                style={{
                  padding: 10,
                  margin: 5,
                  backgroundColor: joueurId === u._id ? "#2563eb" : "#eee",
                  borderRadius: 5,
                }}
              >
                <Text style={{ color: joueurId === u._id ? "white" : "black" }}>
                  {u.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={{ marginTop: 10 }}>Terrain sélectionné: {terrains.find(t => t._id === terrainId)?.nom || "Aucun"}</Text>
          <Text>Sélectionner Terrain:</Text>
          <ScrollView horizontal style={{ maxHeight: 100 }}>
            {terrains.map((t) => (
              <TouchableOpacity
                key={t._id}
                onPress={() => setTerrainId(t._id)}
                style={{
                  padding: 10,
                  margin: 5,
                  backgroundColor: terrainId === t._id ? "#2563eb" : "#eee",
                  borderRadius: 5,
                }}
              >
                <Text style={{ color: terrainId === t._id ? "white" : "black" }}>
                  {t.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            placeholder="Date (YYYY-MM-DD)"
            value={date}
            onChangeText={setDate}
            style={{ backgroundColor: "#eee", padding: 12, marginTop: 10 }}
          />

          <TextInput
            placeholder="Heure début (HH:MM)"
            value={heureDebut}
            onChangeText={setHeureDebut}
            style={{ backgroundColor: "#eee", padding: 12, marginTop: 10 }}
          />

          <TextInput
            placeholder="Heure fin (HH:MM)"
            value={heureFin}
            onChangeText={setHeureFin}
            style={{ backgroundColor: "#eee", padding: 12, marginTop: 10 }}
          />

          <TextInput
            placeholder="Prix"
            value={prix}
            onChangeText={setPrix}
            keyboardType="numeric"
            style={{ backgroundColor: "#eee", padding: 12, marginTop: 10 }}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            style={{ backgroundColor: "#2563eb", padding: 14, marginTop: 20 }}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              {editingReservation ? "Modifier" : "Ajouter"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setShowModal(false);
              resetForm();
            }}
          >
            <Text style={{ color: "red", textAlign: "center", marginTop: 20 }}>
              Annuler
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}
