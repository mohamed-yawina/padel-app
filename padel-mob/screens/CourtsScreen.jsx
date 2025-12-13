import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Clock, Calendar, MapPin, Trophy, Search, User, Plus } from "../utils/icons";

export default function CourtsScreen() {
  const courts = [
    { id: 1, name: "Court Central", status: "Disponible", time: "14:00 - 16:00", price: "200 DH" },
    { id: 2, name: "Court 2", status: "Réservé", time: "16:00 - 18:00", price: "200 DH" },
    { id: 3, name: "Court 3", status: "Disponible", time: "18:00 - 20:00", price: "250 DH" },
  ];

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 26, fontWeight: "bold", marginBottom: 16 }}>
        Réserver un court
      </Text>

      {courts.map((court) => (
        <TouchableOpacity
          key={court.id}
          style={{
            backgroundColor: "white",
            padding: 16,
            borderRadius: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "#eee",
          }}
        >
          <Text style={{ fontWeight: "bold", fontSize: 18 }}>{court.name}</Text>

          <View style={{ flexDirection: "row", marginTop: 4 }}>
            <Clock size={16} color="gray" />
            <Text style={{ marginLeft: 6 }}>{court.time}</Text>
          </View>

          <Text
            style={{
              marginTop: 8,
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 12,
              color: "white",
              alignSelf: "flex-start",
              backgroundColor: court.status === "Disponible" ? "green" : "red",
            }}
          >
            {court.status}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
