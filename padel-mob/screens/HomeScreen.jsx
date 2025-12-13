import { View, Text, ScrollView } from "react-native";
import { Trophy, Calendar, MapPin, Clock, Search, User, Plus } from "../utils/icons";

export default function HomeScreen() {
  const upcomingMatches = [
    { id: 1, opponent: "Ahmed & Youssef", date: "15 Déc", time: "18:00", court: "Court 1" },
    { id: 2, opponent: "Sara & Fatima", date: "17 Déc", time: "16:00", court: "Court 2" },
  ];

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "bold" }}>Bonjour, Joueur !</Text>
      <Text style={{ color: "gray", marginBottom: 16 }}>Prêt pour votre prochain match ?</Text>

      {/* Stats */}
      <View style={{ flexDirection: "row", marginBottom: 20, gap: 12 }}>
        <View style={{ flex: 1, backgroundColor: "#2563eb", padding: 16, borderRadius: 16 }}>
          <Trophy color="white" size={32} />
          <Text style={{ color: "white", fontSize: 22, fontWeight: "bold" }}>12</Text>
          <Text style={{ color: "white" }}>Matchs gagnés</Text>
        </View>

        <View style={{ flex: 1, backgroundColor: "#16a34a", padding: 16, borderRadius: 16 }}>
          <Calendar color="white" size={32} />
          <Text style={{ color: "white", fontSize: 22, fontWeight: "bold" }}>3</Text>
          <Text style={{ color: "white" }}>Réservations</Text>
        </View>
      </View>

      {/* Upcoming Matches */}
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}>
        Prochains Matchs
      </Text>

      {upcomingMatches.map((match) => (
        <View
          key={match.id}
          style={{
            backgroundColor: "white",
            padding: 16,
            borderRadius: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "#eee",
          }}
        >
          <Text style={{ fontWeight: "600", marginBottom: 4 }}>
            vs {match.opponent}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Calendar size={16} color="gray" />
            <Text style={{ marginLeft: 6, color: "gray" }}>
              {match.date} — {match.time}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <MapPin size={16} color="gray" />
            <Text style={{ marginLeft: 6, color: "gray" }}>{match.court}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
