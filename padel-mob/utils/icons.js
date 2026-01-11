import { Platform } from "react-native";

let Icons;

if (Platform.OS === "web") {
  Icons = require("lucide-react");          // version web
} else {
  Icons = require("lucide-react-native");   // version mobile
}

export const {
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Search,
  User,
  Plus,
  LogOut,
  Home,
  Settings,
  Heart,
  Star,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Mail,
  Phone,
  Award,
  TrendingUp,
} = Icons;
