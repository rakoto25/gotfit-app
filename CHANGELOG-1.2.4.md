# Gotfit mobile 1.2.4

- Utilise le véritable objet `File` retourné par Expo ImagePicker sur le Web.
- Corrige l’erreur `Unsupported FormDataPart implementation` du profil.
- Conserve la pièce multipart native `uri`, `name`, `type` sur Android et iOS.
- Modifie les messages via `POST /api/message/{id}/update`.
- Évite la dépendance à la surcharge `_method=PATCH` et aux anciens caches Laravel.
