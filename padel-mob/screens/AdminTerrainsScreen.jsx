import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import API from "../api";

export default function AdminTerrainsScreen() {
  const [terrains, setTerrains] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTerrain, setEditingTerrain] = useState(null); // Nouvel état pour l'édition

  const [nom, setNom] = useState("");
  const [type, setType] = useState("outdoor");
  const [prixParHeure, setPrixParHeure] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null); // base64

  const loadTerrains = async () => {
    try {
      const res = await API.get("/terrains");
      setTerrains(res.data);
    } catch (err) {
      console.log("Erreur terrains:", err.response?.data);
    }
  };

  useEffect(() => {
    loadTerrains();
  }, []);

  // ============================
  // 📌 PICK IMAGE -> BASE64
  // ============================
  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      return alert("Permission refusée !");
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true, // 🔥 obligatoire
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage("data:image/jpeg;base64," + result.assets[0].base64);
    }
  };

  // ============================
  // 📌 SOUMETTRE (AJOUT OU MODIFICATION)
  // ============================
  const handleSubmit = async () => {
    if (!nom || !prixParHeure) {
      return alert("Remplir nom et prix par heure");
    }

    try {
      const data = {
        nom,
        type,
        prixParHeure,
        description,
        ...(image && image.startsWith("data:image") && { imageBase64: image }),
      };

      if (editingTerrain) {
        // Modification
        await API.put(`/terrains/${editingTerrain._id}`, data);
        alert("Terrain modifié !");
      } else {
        // Ajout
        if (!image) return alert("Image obligatoire pour ajout");
        await API.post("/terrains", data);
        alert("Terrain ajouté !");
      }

      setShowModal(false);
      resetForm();
      loadTerrains();
    } catch (err) {
      console.log("Erreur:", err.response?.data || err);
      alert("Erreur lors de l'opération");
    }
  };

  // ============================
  // 📌 RÉINITIALISER LE FORMULAIRE
  // ============================
  const resetForm = () => {
    setNom("");
    setType("outdoor");
    setPrixParHeure("");
    setDescription("");
    setImage(null);
    setEditingTerrain(null);
  };

  // ============================
  // 📌 OUVRIR MODAL POUR ÉDITION
  // ============================
  const handleEdit = (terrain) => {
    setEditingTerrain(terrain);
    setNom(terrain.nom);
    setType(terrain.type);
    setPrixParHeure(terrain.prixParHeure.toString());
    setDescription(terrain.description);
    setImage(terrain.imageUrl); // Précharger l'image existante
    setShowModal(true);
  };

  // ============================
  // 📌 SUPPRIMER UN TERRAIN
  // ============================
  const handleDelete = async (id) => {
    console.log("handleDelete called with id:", id);
    try {
      await API.delete(`/terrains/${id}`);
      alert("Terrain supprimé !");
      loadTerrains();
    } catch (err) {
      console.log("Erreur suppression:", err.response?.data);
      alert("Erreur lors de la suppression");
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>

      <TouchableOpacity
        onPress={() => {
          resetForm();
          setShowModal(true);
        }}
        style={{
          backgroundColor: "#2563eb",
          padding: 12,
          borderRadius: 8,
          marginBottom: 15,
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          + Ajouter Terrain
        </Text>
      </TouchableOpacity>

      <ScrollView>
        <Text style={{ fontSize: 22, fontWeight: "bold" }}>
          🏟️ Liste des terrains
        </Text>
        {console.log("Rendering terrains:", terrains.length)}
        {terrains.map((t) => (
          <View
            key={t._id}
            style={{
              padding: 15,
              backgroundColor: "#f3f3f3",
              borderRadius: 10,
              marginVertical: 10,
            }}
          >
            {t.imageUrl && (
              <Image
                source={{ uri: t.imageUrl }}
                style={{ width: "100%", height: 150, borderRadius: 10 }}
              />
            )}
            <Text>Nom : {t.nom}</Text>
            <Text>Type : {t.type}</Text>
            <Text>Prix/h : {t.prixParHeure} MAD</Text>
            <Text>Description : {t.description}</Text>
            <View style={{ flexDirection: "row", marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => handleEdit(t)}
                style={{
                  backgroundColor: "#f59e0b",
                  padding: 10,
                  borderRadius: 5,
                  flex: 1,
                }}
              >
                <Text style={{ color: "white", textAlign: "center" }}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(t._id)}
                style={{
                  backgroundColor: "#ef4444",
                  padding: 10,
                  borderRadius: 5,
                  flex: 1,
                  marginLeft: 10,
                }}
              >
                <Text style={{ color: "white", textAlign: "center" }}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* MODAL AJOUT */}
      <Modal visible={showModal} animationType="slide">
        <ScrollView style={{ padding: 20 }}>

          <Text style={{ fontSize: 22, fontWeight: "bold" }}>
            {editingTerrain ? "Modifier le terrain" : "Ajouter un terrain"}
          </Text>

          <TouchableOpacity
            onPress={pickImage}
            style={{
              backgroundColor: "#6b7280",
              padding: 12,
              borderRadius: 8,
              marginVertical: 15,
            }}
          >
            <Text style={{ color: "white" }}>
              {editingTerrain ? "Changer l'image" : "Choisir une image"}
            </Text>
          </TouchableOpacity>

          {image && (
            <Image
              source={{ uri: image }}
              style={{ width: "100%", height: 150 }}
            />
          )}

          <TextInput
            placeholder="Nom"
            value={nom}
            onChangeText={setNom}
            style={{ backgroundColor: "#eee", padding: 12, marginTop: 10 }}
          />

          <TextInput
            placeholder="Prix par heure"
            value={prixParHeure}
            onChangeText={setPrixParHeure}
            keyboardType="numeric"
            style={{ backgroundColor: "#eee", padding: 12, marginTop: 10 }}
          />

          <TextInput
            placeholder="Description"
            value={description}
            onChangeText={setDescription}
            style={{ backgroundColor: "#eee", padding: 12, marginTop: 10 }}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            style={{ backgroundColor: "#2563eb", padding: 14, marginTop: 20 }}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              {editingTerrain ? "Modifier" : "Ajouter"}
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
