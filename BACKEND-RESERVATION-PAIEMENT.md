# Contrat backend — réservation, paiement et changement de créneau

Gotfit Mobile 1.2.0 intègre le parcours complet côté application. Les règles
financières et les notifications doivent également être appliquées par Laravel,
qui reste la source de vérité.

## 1. Création de la réservation

Route déjà utilisée :

```http
PUT /api/annonces/{annonce}/reserve
Authorization: Bearer {token}
Content-Type: application/json

{
  "reservation_date": "2026-08-02",
  "reservation_time": "10:30:00",
  "guests": 1,
  "note": "Message facultatif"
}
```

La réponse doit toujours contenir :

```json
{
  "reservation": {
    "id": 123,
    "status": "pending",
    "payment_status": "pending",
    "is_paid": false
  }
}
```

Laravel ne doit pas autoriser le coach à confirmer la réservation tant que
`payment_status` n'est pas `paid`.

## 2. Paiement Stripe

Route déjà utilisée :

```http
POST /api/create-payment-intent
Authorization: Bearer {token}
Content-Type: application/json

{
  "reservation_id": 123
}
```

Le montant doit être calculé exclusivement sur le serveur à partir de la
réservation. Le mobile ne doit jamais imposer le montant à Stripe.

Réponse :

```json
{
  "clientSecret": "pi_..._secret_...",
  "payment_intent_id": "pi_...",
  "amount": 5000,
  "currency": "EUR"
}
```

Le webhook Stripe `payment_intent.succeeded` doit :

1. vérifier la signature Stripe ;
2. retrouver la réservation via les metadata ;
3. placer `payment_status` à `paid` et `is_paid` à `true` ;
4. créer l'enregistrement de paiement ;
5. notifier le coach qu'une demande payée attend sa confirmation.

## 3. Modification du créneau

Route recommandée :

```http
PUT /api/reservation/{reservation}/reschedule
Authorization: Bearer {token}
Content-Type: application/json

{
  "reservation_date": "2026-08-04",
  "reservation_time": "14:00:00",
  "note": "Contrainte professionnelle",
  "notify_coach": true,
  "source": "gotfit-mobile"
}
```

Réponse attendue :

```json
{
  "reservation": {
    "id": 123,
    "reservation_date": "2026-08-04",
    "reservation_time": "14:00:00",
    "status": "pending",
    "payment_status": "paid"
  },
  "coach_notified": true
}
```

Le contrôleur Laravel doit :

1. vérifier que l'utilisateur authentifié est le client de la réservation ;
2. interdire les réservations terminées, annulées ou refusées ;
3. valider un créneau futur ;
4. conserver le paiement existant ;
5. remettre le statut métier à `pending` si le coach doit confirmer à nouveau ;
6. enregistrer l'ancien et le nouveau créneau dans un historique ;
7. envoyer une notification Laravel au coach ;
8. renvoyer la réservation actualisée.

L'application essaie aussi, pour compatibilité :

```text
POST  /api/reservation/{id}/reschedule
PATCH /api/reservation/{id}
PUT   /api/reservation/{id}
```

La première route reste fortement recommandée.

## 4. Exemple de validation Laravel

```php
$data = $request->validate([
    'reservation_date' => ['required', 'date', 'after_or_equal:today'],
    'reservation_time' => ['required', 'date_format:H:i:s'],
    'note' => ['nullable', 'string', 'max:1000'],
]);

$newStart = Carbon::parse(
    $data['reservation_date'].' '.$data['reservation_time']
);

abort_if($newStart->isPast(), 422, 'Le créneau doit être situé dans le futur.');
abort_unless(
    (int) $reservation->client_id === (int) $request->user()->id,
    403
);
```

## 5. Règle de sécurité indispensable

Le blocage visuel du bouton coach dans l'application améliore l'expérience,
mais il ne constitue pas une sécurité. Laravel doit refuser côté serveur toute
confirmation d'une réservation non payée.

