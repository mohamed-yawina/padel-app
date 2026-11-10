<div align="center">

# PadelApp — Court Booking & Payments

**React Native · Expo · Node.js · Express · MongoDB · Stripe**

A full-stack mobile application for discovering padel courts, managing reservations, and exploring online payment integration.

![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=black)
![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?logo=expo&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe&logoColor=white)

[Features](#features) · [Architecture](#architecture) · [Getting started](#getting-started) · [Limitations](#security-and-known-limitations)

</div>

## Overview

PadelApp is an educational full-stack booking project with a **React Native / Expo mobile client** and a **Node.js / Express REST API**. MongoDB stores application data, while Stripe is integrated for payment workflows.

> **Project status:** Portfolio / educational application. The presence of payment integration does not establish that a complete real-money checkout has been independently verified.

## Features

- User registration and login
- Browse available padel courts
- Create and manage court reservations
- Authentication using JSON Web Tokens
- Backend routes for court listings, bookings, and payments
- Stripe integration, including a backend route designed to handle webhook signatures
- Cross-platform React Native application using Expo

## Architecture

```text
           React Native + Expo (padel-mob)
                         |
                    Axios / REST
                         |
                         v
              Express API (padel-api)
              /api/auth
              /api/terrains
              /api/reservations
              /api/stripe
                  |           |
                  v           v
               MongoDB      Stripe
```

| Layer | Technologies |
| :--- | :--- |
| Mobile | React Native 0.81, Expo SDK 54, React 19 |
| Navigation | React Navigation |
| HTTP & session | Axios, Expo SecureStore, AsyncStorage |
| Backend | Node.js, Express 5 |
| Data | MongoDB, Mongoose |
| Authentication | JWT, bcrypt |
| Payments | Stripe SDK, Stripe React Native integration |
| File uploads | Multer, Express static uploads |

## Repository structure

```text
padel-app/
├── padel-api/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── terrainRoutes.js
│   │   ├── reservationRoutes.js
│   │   └── stripeRoutes.js
│   ├── uploads/
│   ├── server.js
│   └── package.json
├── padel-mob/
│   ├── assets/
│   ├── screens/
│   ├── utils/
│   ├── api.js
│   ├── App.js
│   └── package.json
├── .gitignore
└── README.md
```

## Getting started

### Prerequisites

- Node.js and npm compatible with Expo SDK 54 and the project's dependencies
- MongoDB (local instance or a compatible hosted database)
- Expo Go / compatible simulator or a development build
- Stripe **test-mode** keys for payment testing

### 1. Clone the repository

```bash
git clone https://github.com/mohamed-yawina/padel-app.git
cd padel-app
```

### 2. Configure and start the API

```bash
cd padel-api
npm ci
```

Create `padel-api/.env` locally. Example placeholders:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/padel
JWT_SECRET=replace_with_a_long_random_secret
SERVER_URL=http://localhost:5000
STRIPE_SECRET_KEY=sk_test_replace_with_your_test_key
```

Additional environment variables may be required by specific Stripe routes; inspect `padel-api/routes/stripeRoutes.js` before testing payments.

Start the development API:

```bash
npm run dev
```

The inspected `server.js` binds to **port 5000**, regardless of a `PORT` environment variable. The backend `package.json` defines `dev` but **does not define `start`**.

### 3. Start the mobile application

In a separate terminal from the repository root:

```bash
cd padel-mob
npm ci
npx expo start
```

Open the app using the options displayed by Expo. Depending on your platform, a compatible development build may be necessary for native modules.

### 4. Configure API connectivity

The current `padel-mob/api.js` selects:

- `http://localhost:5000/api` for the web platform
- A **hard-coded ngrok URL** for native mobile platforms

That ngrok URL may no longer be active. Before testing on a physical device, replace the hard-coded endpoint with an appropriate reachable development URL and ideally move it to environment-based configuration. `localhost` on a phone refers to the phone, not your computer.

## Payments

Stripe dependencies and API routes are present. For safe development:

- Use **Stripe test mode**, not live payment credentials.
- Keep the secret key and webhook signing secret on the backend only.
- Check webhook signature verification and payment state transitions before treating a reservation as paid.
- Never commit real Stripe secrets or customer payment information.

## Security and known limitations

The repository audit identified the following points for future improvement:

1. **API configuration:** A development ngrok address is hard-coded in `padel-mob/api.js`; use configurable URLs instead.
2. **Backend startup:** The README previously recommended `npm start`, but only `npm run dev` is defined in `padel-api/package.json`.
3. **Automated tests:** The backend `test` script currently exits with `Error: no test specified`; no passing test suite is claimed.
4. **CORS:** `padel-api/server.js` enables unrestricted CORS via `app.use(cors())`; review permitted origins for deployment.
5. **Repository hygiene:** A temporary registration JSON file exists at the repository root. Remove temporary test data and avoid committing real account information.
6. **Secrets:** The root `.gitignore` excludes `.env` files and uploads, but all tracked files and commit history should still be reviewed for sensitive data.
7. **Production readiness:** Payment security, authentication, authorization, and booking consistency need dedicated integration tests before real-world use.

## Roadmap

- [ ] Move the API base URL to environment-based configuration
- [ ] Add automated API, booking, and payment tests
- [ ] Document Stripe webhook configuration and test scenarios
- [ ] Harden CORS, validation, and authorization
- [ ] Add genuine mobile screenshots and a short demonstration
- [ ] Set up CI checks for frontend and backend
- [ ] Document deployment and production environment variables

## Author

**Mohamed Yawina** · Software Engineering Student, EMSI

[GitHub](https://github.com/mohamed-yawina) · [LinkedIn](https://www.linkedin.com/in/mohamed-yawina/)

---

<div align="center"><sub>PadelApp — practical mobile development, REST APIs, booking workflows, and payment integration.</sub></div>
