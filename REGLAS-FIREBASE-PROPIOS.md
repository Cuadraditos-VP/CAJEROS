# Reglas de Firebase para "cada uno cambia su fila"

Ahora cada cajero cambia solo su propia fila, y ese cambio se publica para todos
en la colección `propios_cajeros`. Firebase no deja usarla hasta que se agregue esta regla.

## Cómo agregarla
1. Entrá a https://console.firebase.google.com → proyecto **programacioncajeros-a7420**.
2. **Firestore Database → Reglas**.
3. Pegá este bloque **adentro** de `match /databases/{database}/documents { ... }`,
   al lado de las reglas que ya tenés (las demás no se tocan).
4. Tocá **Publicar**.

```
    // Cambios propios publicados: todos los leen; cada celular escribe solo
    // el documento de SU legajo (el que reservó en legajos_cajeros).
    // El admin puede descartarlos.
    match /propios_cajeros/{doc} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null && (
        request.auth.token.get("email", "") == "guillermo.nemaric@gmail.com" ||
        (request.resource.data.uid == request.auth.uid &&
         doc == request.resource.data.mes + "_" + request.resource.data.id &&
         get(/databases/$(database)/documents/legajos_cajeros/$(request.resource.data.id)).data.uid == request.auth.uid)
      );
      allow delete: if request.auth != null &&
        request.auth.token.get("email", "") == "guillermo.nemaric@gmail.com";
    }
```

## Cómo saber si falta
Si al cambiar un turno de su fila a alguien le aparece
"No se pudo publicar tu cambio (permiso de Firebase)", falta esta regla.
