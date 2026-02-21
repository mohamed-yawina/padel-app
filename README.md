# 🎾 PadelApp

PadelApp est une application mobile permettant aux utilisateurs de réserver des terrains de padel facilement, gérer leurs réservations et effectuer des paiements en ligne de manière sécurisée.

---

## 📱 Fonctionnalités

- Authentification des utilisateurs (Inscription / Connexion)
- Consultation des terrains disponibles
- Réservation de créneaux horaires
- Gestion des réservations
- Paiement en ligne avec Stripe
- Backend sécurisé avec JWT
- API REST avec Node.js et MongoDB

---

## 🛠️ Technologies utilisées

### Frontend (Mobile)
- React Native (Expo)

### Backend
- Node.js
- Express.js
- MongoDB
- JWT (Authentication)
- Stripe (Paiement en ligne)

---

## ⚙️ Installation et configuration

### 1. Cloner le projet

```bash
git clone https://github.com/mohamed-yawina/padel-app.git
cd padel-app

2. Configuration du Backend

Créer un fichier .env dans le dossier backend :

MONGO_URI=mongodb://127.0.0.1:27017/padel
JWT_SECRET=your_secret_key
PORT=5000
SERVER_URL=http://localhost:5000
STRIPE_SECRET_KEY=your_stripe_secret_key

Puis installer les dépendances :

npm install
npm start
3. Lancer l'application mobile

Dans le dossier mobile :

npm install
npx expo start

Puis scanner le QR code avec l’application Expo Go.

💳 Paiement

Les paiements sont intégrés avec Stripe en mode test.
Utiliser les cartes de test Stripe pour simuler les transactions.

📂 Structure du projet
padel-app/
│
├── backend/
│   ├── routes/
│   ├── models/
│   ├── controllers/
│   └── server.js
│
├── mobile/
│   ├── screens/
│   ├── components/
│   └── App.js
│
└── README.md
🚀 Objectif du projet

Ce projet a été réalisé dans le but de :

Pratiquer le développement mobile avec React Native

Créer une API backend complète

Implémenter l’authentification sécurisée

Intégrer un système de paiement en ligne

Construire un projet professionnel pour portfolio et GitHub

👨‍💻 Auteur

Développé par Mohamed Yawina
Étudiant en ingénierie informatique – EMSI

📄 Licence

Projet à usage éducatif et portfolio.

---

Si tu veux un README **niveau supérieur (avec badges, captures d’écran, et démo vidéo pour LinkedIn/GitHub)**, je peux te faire une version **portfolio professionnel** en 2 minutes.
