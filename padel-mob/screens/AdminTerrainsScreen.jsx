import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Picker,
  StyleSheet,
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
    <View style={styles.container}>

      <TouchableOpacity
        onPress={() => {
          resetForm();
          setShowModal(true);
        }}
        style={styles.addButton}
      >
        <Text style={styles.addButtonText}>+ Ajouter Terrain</Text>
      </TouchableOpacity>

      <ScrollView>
        <Text style={styles.sectionTitle}>🏟️ Liste des terrains</Text>
        {console.log("Rendering terrains:", terrains.length)}
        {terrains.map((t) => (
          <View key={t._id} style={styles.terrainCard}>
            {t.imageUrl && (
              <Image
                source={{ uri: t.imageUrl }}
                style={styles.terrainImage}
              />
            )}
            <View style={styles.terrainInfo}>
              <Text style={styles.terrainName}>📍 {t.nom}</Text>
              <Text style={styles.terrainType}>Type: <Text style={{fontWeight: "600"}}>{t.type === "indoor" ? "🏠 Indoor" : "🌞 Outdoor"}</Text></Text>
              <Text style={styles.terrainPrice}>💰 {t.prixParHeure} MAD/h</Text>
              <Text style={styles.terrainDescription}>{t.description}</Text>
            </View>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                onPress={() => handleEdit(t)}
                style={styles.editButton}
              >
                <Text style={styles.buttonText}>✏️ Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(t._id)}
                style={styles.deleteButton}
              >
                <Text style={styles.buttonText}>🗑️ Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* MODAL FORMULAIRE */}
      <Modal visible={showModal} animationType="slide">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {editingTerrain ? "📝 Modifier le terrain" : "➕ Ajouter un terrain"}
          </Text>
        </View>
        
        <ScrollView style={styles.modalContent}>

          {/* SECTION IMAGE */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>📸 Image du terrain</Text>
            <TouchableOpacity
              onPress={pickImage}
              style={styles.imagePicker}
            >
              <Text style={styles.imagePickerText}>
                {editingTerrain ? "🔄 Changer l'image" : "🖼️ Choisir une image"}
              </Text>
            </TouchableOpacity>

            {image && (
              <Image
                source={{ uri: image }}
                style={styles.imagePreview}
              />
            )}
          </View>

          {/* SECTION INFORMATIONS */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>📋 Informations</Text>
            
            <Text style={styles.inputLabel}>Nom du terrain</Text>
            <TextInput
              placeholder="ex: Court 1, Terrain A..."
              value={nom}
              onChangeText={setNom}
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Type de terrain</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={type}
                onValueChange={(itemValue) => setType(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="🏠 Indoor (couvert)" value="indoor" />
                <Picker.Item label="🌞 Outdoor (en plein air)" value="outdoor" />
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Prix par heure (MAD)</Text>
            <TextInput
              placeholder="ex: 150"
              value={prixParHeure}
              onChangeText={setPrixParHeure}
              keyboardType="numeric"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              placeholder="ex: Terrain avec éclairage, vestiaires..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              style={[styles.input, { textAlignVertical: "top" }]}
            />
          </View>

          {/* BOUTONS */}
          <View style={styles.formActions}>
            <TouchableOpacity
              onPress={handleSubmit}
              style={styles.submitButton}
            >
              <Text style={styles.submitButtonText}>
                {editingTerrain ? "💾 Modifier" : "➕ Ajouter"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowModal(false);
                resetForm();
              }}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>❌ Annuler</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f9fafb",
  },
  addButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 15,
    color: "#1f2937",
  },
  terrainCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginVertical: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  terrainImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  terrainInfo: {
    padding: 14,
  },
  terrainName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  terrainType: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 6,
  },
  terrainPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
    marginBottom: 6,
  },
  terrainDescription: {
    fontSize: 13,
    color: "#9ca3af",
    lineHeight: 18,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    paddingTop: 0,
  },
  editButton: {
    flex: 1,
    backgroundColor: "#f59e0b",
    paddingVertical: 10,
    borderRadius: 8,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#ef4444",
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 13,
  },
  modalHeader: {
    backgroundColor: "#2563eb",
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginTop: 0,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  modalContent: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f9fafb",
  },
  formSection: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  imagePicker: {
    backgroundColor: "#3b82f6",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  imagePickerText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    resizeMode: "cover",
    marginTop: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    color: "#1f2937",
  },
  pickerContainer: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  formActions: {
    gap: 12,
    paddingBottom: 30,
  },
  submitButton: {
    backgroundColor: "#10b981",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cancelButtonText: {
    color: "#6b7280",
    fontWeight: "600",
    fontSize: 15,
  },
});
