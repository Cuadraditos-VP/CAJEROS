# Reglas de Firebase: usuarios de la PC de la División e historial (cajeros)

En la PC de la División pueden entrar varios empleados, cada uno con su clave. El admin los carga
en Celulares (👥 en la fila de la División). Quedan dentro del mismo doc `division_cajeros/{id}`
(campo `ops`, con una huella de la clave, no la clave), así que eso **no necesita reglas nuevas**:
`division_cajeros` ya lo escribe solo el admin.

Lo que hace cada uno se anota en `historial_cajeros`. La División solo puede **agregar** (con su
propio uid); nadie más que el admin lo puede leer ni borrar.

Agregar a las reglas (dentro de `match /databases/{database}/documents`, donde ya está la
función `esDivision()`):

```
    // Historial de la División: la PC de la División agrega; solo el admin lo lee
    match /historial_cajeros/{id} {
      allow create: if esDivision() && request.resource.data.uid == request.auth.uid;
      allow read, delete: if esAdmin();
    }
```

## Cómo verificar desde afuera
Un anónimo (registrado o no) no puede leer `historial_cajeros` (PERMISSION_DENIED) ni escribir en él.
