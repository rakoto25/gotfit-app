# Gotfit Mobile

Application mobile Gotfit en React Native avec Expo Router, connectée à l’API Laravel existante.

Version actuelle : **1.4.0**. Les instructions de build et de publication sont dans `PUBLICATION-STORES.md`.

## Technologies

- Expo SDK 57
- React Native 0.86
- React 19
- Expo Router
- TypeScript
- Session sécurisée avec `expo-secure-store`
- Authentification Google avec `expo-auth-session`
- Paiement natif avec Stripe PaymentSheet
- API Laravel Sanctum

## Fonctionnalités incluses

### Membres

- accueil éditorial et recommandations ;
- recherche d’annonces, coachs et séances visio ;
- fiches détaillées des expériences et des coachs ;
- favoris ;
- réservation avec choix de date et d’heure ;
- paiement sécurisé des réservations ;
- planning à venir et historique ;
- ajout d’une séance au calendrier du téléphone ;
- messagerie privée ;
- messagerie avec photos, modification/suppression, réactions et offres coach ;
- packs multi-séances, cagnotte, validation, annulation et litiges ;
- centre de notifications intégré et notifications push ;
- création de demandes de coach depuis l’application ;
- réservation et accès aux visios ;
- onboarding et objectifs personnalisés ;
- profil avec photo ;
- centre d’aide et contact ;
- inscription avec formulaire ou Google ;
- connexion, déconnexion et mot de passe oublié.
- confirmation de prestation, litige et dépôt d’avis.
- réservation limitée aux jours et horaires publiés par le coach.

### Coachs

- tableau de bord ;
- indicateurs d’activité ;
- affichage des réservations ;
- confirmation, refus et clôture des réservations ;
- création d’annonces avec photo ;
- création de séances visio ;
- affichage de ses annonces et sessions.
- modification et suppression de ses annonces ;
- prestations en ligne avec tarif positif et disponibilités obligatoires ;
- forum privé des coachs validés, réponses, réactions, signalements et notifications ;
- pseudo public, SIRET et parcours de complétion du profil professionnel.

## Démarrage rapide

Prérequis : Node.js LTS et l’application Expo Go sur le téléphone.

```powershell
cd gotfit-mobile
npm install
Copy-Item .env.example .env
npx expo start -c
```

Scannez ensuite le QR code avec Expo Go. Le bon ordre de commande est bien :

```powershell
npx expo start -c
```

et non `npx expo -c`.

L’application utilise par défaut l’API publique :

```text
https://api.gotfit.tech/api
```

Les écrans publics fonctionnent donc immédiatement, même sans fichier `.env`.

## Variables d’environnement

Copiez `.env.example` vers `.env` puis modifiez :

```env
EXPO_PUBLIC_API_URL=https://api.gotfit.tech/api
EXPO_PUBLIC_WEB_URL=https://gotfit.tech
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

### API Laravel locale

Sur un vrai téléphone, `localhost` désigne le téléphone et non l’ordinateur. Utilisez l’adresse Wi-Fi locale du PC :

```env
EXPO_PUBLIC_API_URL=http://192.168.1.25:8000/api
```

Laravel doit écouter sur le réseau local :

```powershell
php artisan serve --host=0.0.0.0 --port=8000
```

Autorisez le port 8000 dans le pare-feu Windows uniquement sur le réseau privé.

## Configuration Google

Créez les identifiants OAuth dans Google Cloud :

1. un client Web ;
2. un client Android avec le package `com.rakotondrasoa.Gotfit` ;
3. un client iOS avec le bundle `com.rakotondrasoa.Gotfit`.

Ajoutez les identifiants dans `.env`. L’API Laravel reçoit le jeton Google dans :

```text
POST /api/auth/google
```

avec le rôle `client` ou `intervenant`.

Pour un test OAuth natif fiable, utilisez un development build :

```powershell
npx expo run:android
```

ou un build de développement EAS. Expo Go reste pratique pour visualiser immédiatement tout le design et les parcours qui n’exigent pas une configuration OAuth native.

## Configuration Stripe

Ajoutez uniquement la clé publique Stripe dans `.env` :

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

La clé secrète Stripe reste exclusivement dans Laravel. Le mobile demande le Payment Intent à `POST /api/create-payment-intent`, puis ouvre la feuille de paiement Stripe native.

Stripe est chargé uniquement sur Android et iOS. La version Web utilise un écran compatible qui redirige vers Gotfit sans importer le module natif Stripe ; le bundle Web reste donc fonctionnel.

## Vérification

```powershell
npm run typecheck
npm run lint
npx expo-doctor@latest
npx expo export --platform android
```

## Organisation

```text
src/
  app/          navigation et écrans Expo Router
  components/   design system, cartes et Google
  hooks/        chargement des ressources
  lib/          API Laravel, formatage et stockage
  providers/    session/authentification
  theme/        couleurs, typographies et dimensions
  types/        modèles TypeScript
```

## Sécurité

- Le jeton Sanctum est enregistré dans le stockage sécurisé natif.
- Aucun secret Google n’est inclus dans le dépôt.
- Aucune clé secrète Stripe n’est incluse dans l’application.
- Les identifiants commençant par `EXPO_PUBLIC_` sont des identifiants clients, pas des secrets serveur.
- Le fichier `.env` ne doit pas être versionné.
# gotfit-app
