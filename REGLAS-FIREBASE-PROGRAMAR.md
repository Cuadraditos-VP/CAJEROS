# Reglas de Firebase para Programar Cajeros (`programar/`)

Usa el **mismo proyecto** que la app de cajeros (**programacioncajeros-a7420**) y la función `esAdmin()` que ya está.
Este bloque va **adentro** de `match /databases/{database}/documents { ... }`, junto a los demás.
Correo electrónico/contraseña en Authentication ya está activado (lo usa la clave personal).

- `progr_cajeros`: la programación (un doc por mes `mes_AAAA-MM` y `general` con preferencias y colores).
- `progr_invitados/{código}`: invitaciones que crea el admin (nombre, usuario, v).
- `progr_cuentas/{usuario}`: la cuenta de cada usuario (correo inventado `p<usuario>-<v>@progrcajeros.example.com`).
- `progr_usuarios/{uid}`: uid → usuario y nombre.
- `progr_historial`: quién hizo cada cambio y cuándo.
- La lista de gente se trae de `turnos_cajeros` (solo el admin la lee: no hace falta tocar esa regla).

```
    // ===== NUEVO: Programar Cajeros (la app para armar la programación) =====
    function esUsuarioProg() {
      return request.auth != null
        && exists(/databases/$(database)/documents/progr_usuarios/$(request.auth.uid))
        && get(/databases/$(database)/documents/progr_cuentas/$(get(/databases/$(database)/documents/progr_usuarios/$(request.auth.uid)).data.leg)).data.uid == request.auth.uid;
    }
    function invProg(code) {
      return get(/databases/$(database)/documents/progr_invitados/$(code)).data;
    }
    match /progr_cajeros/{doc} {
      allow read, write: if esAdmin() || esUsuarioProg();
    }
    match /progr_invitados/{code} {
      allow get: if request.auth != null;
      allow list, create, delete: if esAdmin();
      allow update: if request.auth != null
        && !('uid' in resource.data)
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['uid', 'usadoEn'])
        && request.resource.data.uid == request.auth.uid;
    }
    match /progr_cuentas/{legajo} {
      allow get: if request.auth != null;
      allow list, delete: if esAdmin();
      allow create, update: if esAdmin() || (request.auth != null
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.keys().hasOnly(['uid', 'v', 'code'])
        && invProg(request.resource.data.code).uid == request.auth.uid
        && invProg(request.resource.data.code).leg == legajo
        && invProg(request.resource.data.code).v == request.resource.data.v);
    }
    match /progr_historial/{id} {
      allow read: if esAdmin() || esUsuarioProg();
      allow create: if (esAdmin() || esUsuarioProg()) && request.resource.data.uid == request.auth.uid;
    }
    match /progr_usuarios/{uid} {
      allow get: if esAdmin() || (request.auth != null && request.auth.uid == uid);
      allow list, delete: if esAdmin();
      allow create, update: if request.auth != null && request.auth.uid == uid
        && get(/databases/$(database)/documents/progr_cuentas/$(request.resource.data.leg)).data.uid == uid;
    }
```
