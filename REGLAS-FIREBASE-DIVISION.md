# Reglas de Firebase: la División (cajeros)

La **División** es un rol intermedio entre el admin y los usuarios. El admin la marca en
Celulares ("Hacer División"), que guarda `division_cajeros/{legajo o inv-código}`.
La División puede autorizar pedidos sin contraparte, pasar acordados a lo oficial y publicar
cambios de turnos. Solo cambia **turnos** del mes (`people`, `changedAt`, `publicadoPor`,
`version`): no puede tocar la gente ni la inicial. También puede cambiar los **colores, letras y feriados** del mes
(colección `cajeros`), igual que el admin.

Agregar a las reglas (dentro de `match /databases/{database}/documents`):

```
    // División: un registrado cuyo legajo (o invitación) está en division_cajeros
    function esDivision() {
      return registrado() && exists(/databases/$(database)/documents/division_cajeros/$(string(get(yoPath()).data.get('id', '-'))));
    }

    // Quién es la División: la arma solo el admin; los registrados la pueden leer
    match /division_cajeros/{id} {
      allow read: if puedeVer();
      allow write: if esAdmin();
    }
```

Y cambiar estos dos bloques que ya existen:

```
    match /turnos_cajeros/{mes} {
      allow read: if puedeVer();
      allow write: if esAdmin();
      // La División solo cambia turnos (la misma gente)
      allow update: if esDivision()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['people', 'changedAt', 'publicadoPor', 'version'])
        && request.resource.data.people.size() == resource.data.people.size();
    }

    // en propios_cajeros: la División también puede sacar lo que el dueño publicó en una celda que ella oficializa
    match /propios_cajeros/{docId} {
      allow read: if puedeVer();
      allow create, update: if request.auth != null && (
        (request.resource.data.uid == request.auth.uid
         && docId == request.resource.data.mes + "_" + request.resource.data.id
         && get(/databases/$(database)/documents/legajos_cajeros/$(request.resource.data.id)).data.uid == request.auth.uid)
        || esAdmin()
      );
      allow update: if esDivision();
      allow delete: if esAdmin();
    }
```

Y en el bloque de colores y feriados (que ya existe), dejar que también escriba la División:

```
    match /cajeros/{mes} {
      allow read: if true;
      allow write: if (esAdmin() || esDivision())
                   && request.resource.data.keys().hasOnly(['mes', 'version', 'colores', 'feriados', 'letras' ]);
    }
```

(`pedidos_cajeros` no cambia: ya lo pueden escribir los registrados.)

## Cómo verificar desde afuera
Un anónimo sin registrar no puede leer `division_cajeros`. Un registrado que no es División no
puede escribir en `turnos_cajeros` (PERMISSION_DENIED).
