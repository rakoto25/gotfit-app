# Configuration Google OAuth — Gotfit 1.1.3

## Pourquoi l’erreur apparaissait

L’ancienne version construisait manuellement l’URL de retour :

```text
gotfit://oauth
```

Cette URL ne correspondait pas à celle attendue par le client OAuth natif
Google. L’application pouvait alors afficher une erreur de redirection,
ne pas recevoir de jeton, ou rester bloquée sur « Connexion… ».

Gotfit 1.1.3 utilise maintenant le fournisseur Google d’Expo, qui choisit
le bon client par plateforme et génère le retour natif correspondant au
package installé.

## Expo Go

La connexion OAuth Google native n’est pas fiable dans Expo Go, car Expo Go
ne possède pas le schéma d’URL propre à Gotfit.

Utilisez l’une des versions suivantes :

- un Development Build EAS ;
- un APK de prévisualisation ;
- l’application Android ou iOS finale.

Le formulaire e-mail/mot de passe reste utilisable dans Expo Go.

## Clients à créer dans Google Cloud

Créez trois clients OAuth dans le même projet Google Cloud.

### Web

Variable :

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...apps.googleusercontent.com
```

Ajoutez les origines et redirections réelles du site Web Gotfit.

### Android

Variable :

```env
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...apps.googleusercontent.com
```

Configuration obligatoire :

```text
Package : com.rakotondrasoa.Gotfit
SHA-1   : empreinte du certificat EAS utilisé pour le build
```

Le SHA-1 du build de développement peut être différent du SHA-1 de
production. Enregistrez les deux si vous testez les deux versions.

### iOS

Variable :

```env
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...apps.googleusercontent.com
```

Configuration obligatoire :

```text
Bundle ID : com.rakotondrasoa.Gotfit
```

## Variables dans EAS

Les variables présentes uniquement dans un fichier `.env` local ne sont pas
automatiquement disponibles dans tous les builds distants. Ajoutez les trois
identifiants `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` dans l’environnement du profil
EAS utilisé pour construire l’application.

Après toute modification d’un client OAuth ou d’une variable publique,
reconstruisez l’application. Un simple redémarrage d’Expo Go ne suffit pas.

## Vérification côté API Laravel

Le mobile transmet un jeton d’identité Google à :

```text
POST /api/auth/google
```

L’API doit accepter uniquement les audiences correspondant aux clients
Google officiels de Gotfit :

```text
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
```

Si Laravel ne valide que le client Web, un jeton Android ou iOS correct sera
refusé avec une erreur d’audience. Il faut alors ajouter les clients natifs à
la liste blanche du validateur Google côté serveur.

## Améliorations de la version 1.1.3

- URL de retour gérée par le fournisseur Google Expo ;
- client OAuth choisi automatiquement selon la plateforme ;
- récupération du jeton après échange du code natif ;
- détection d’Expo Go avec explication claire ;
- déblocage automatique du bouton après annulation ;
- protection contre le traitement en double d’une réponse ;
- messages d’erreur Google détaillés ;
- validation du format des identifiants OAuth ;
- retour haptique après une connexion réussie.
