# Publication de Gotfit mobile

Cette version utilise Expo SDK 57 et React Native 0.86. Elle est configurée pour Android 7.0 minimum (API 24), une cible API 36, iOS 16.4 minimum, et le package `com.rakotondrasoa.Gotfit`.

## 1. Préparer les comptes et variables

```bash
npm install -g eas-cli
eas login
npm ci
```

Copier `.env.example` vers `.env`, puis renseigner l’URL API, la clé publique Stripe de production et les identifiants Google OAuth. Ne jamais committer `.env`, une clé privée, un fichier `.p8`, `.jks` ou tout autre secret.

## 2. Vérifier avant chaque publication

```bash
npm run typecheck
npm run lint
npm run doctor
```

Tester sur au moins un Android 7/8, un Android récent, un iPhone iOS 16.4 et un iPhone récent : inscription, connexion, achat Stripe, notifications, messages/photos, offres, packs, visio et déconnexion.

## 3. Construire les binaires

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

Au premier build, laisser EAS créer ou importer les certificats. Il faut un compte Apple Developer actif. La clé de signature Android doit être conservée durablement.

## 4. Envoyer aux stores

Créer d’abord les fiches Gotfit dans App Store Connect et Google Play Console avec le même identifiant d’application.

```bash
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

Préparer : description, captures téléphone/tablette, catégorie Santé et remise en forme, assistance, URL de politique de confidentialité, questionnaires de confidentialité, classification d’âge et compte de démonstration pour la validation.

## 5. Points serveur indispensables

- conserver `https://api.gotfit.tech` avec un certificat HTTPS valide ;
- renseigner les clés Stripe production et les webhooks ;
- configurer les identifiants OAuth Android/iOS et leurs signatures ;
- configurer APNs et FCM dans EAS pour les notifications ;
- garder disponibles les routes notifications, packs, cagnotte, offres et push tokens ;
- sauvegarder quotidiennement la base et les médias utilisateurs.

Publier d’abord via TestFlight et la piste de test fermée Google Play. Une compilation réussie ne remplace pas les essais des paiements réels, notifications APNs/FCM et règles de confidentialité sur appareils physiques.
