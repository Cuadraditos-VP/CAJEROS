# Programación Cajeros — notas para Claude

App web (PWA) de la programación mensual de turnos de los **cajeros**. Todo está en
`index.html` (HTML + CSS + JS, sin build). Los turnos oficiales de cada mes están en Firebase
(`turnos_cajeros`, un doc por mes) y solo los ven los registrados; lo compartido en vivo va por Firebase.
Ya no hay `<mes>-<año>.json` ni semillas con datos en el HTML: **nunca subir datos de empleados
al repo** (es público; el historial viejo todavía los tiene hasta pasarlo a privado).

## Regla de oro: hay una app gemela
Esta app tiene una gemela casi idéntica para los **jefes**: `Cuadraditos-VP/progjefes`.
**Casi todo cambio va en las dos.** Si la sesión no tiene el otro repo, agregalo con
`add_repo` y aplicá el mismo cambio. Las diferencias reales están más abajo.

## Cómo trabaja el dueño (Guillermo, admin)
- Habla en español rioplatense y no es programador: respuestas cortas y claras, sin jerga.
- Pide cambios por chat; se implementan, se prueban y se publican.
- **Publicar** = commit en la rama de trabajo → PR → fusionar a `main`. Confirmar con
  Guillermo antes de fusionar (suele alcanzar con que responda "dale"). GitHub Pages sirve
  `main`; los celulares toman la versión nueva al abrir la app o con la recarga automática
  cada 20 minutos.
- **Cambios visuales dudosos**: mostrarle antes una captura (Playwright) y esperar su OK.
- **Cambios que necesitan reglas nuevas de Firebase**: NO fusionar hasta que él las pegue.
  Pedirle sus reglas actuales y devolvérselas completas con el bloque nuevo (prefiere no
  editarlas él). Después se puede verificar desde afuera con la API REST (usuario anónimo).

## Antes de publicar: correr las pruebas
```
node pruebas/correr.js
```
Abre varios "celulares" con un Firebase falso compartido (`pruebas/firebase-falso.js` +
`pruebas/backend.js`, que aplica las mismas reglas de escritura y de **lectura** que Firebase,
con un mes de gente inventada — nunca datos reales en las pruebas) y recorre: registro por legajo y
datos protegidos, Cambios (pedido con varias opciones, respuestas, acuerdo, avisos), fila propia publicada vs.
filas ajenas privadas, descarte del admin con aviso, celda del franco ofrecido y que no haya
errores de JavaScript. Si agregás algo importante, sumale una prueba (y copiala a la gemela).
`pruebas/` es igual en las dos apps: mantenelo igual.

## Conceptos de la app
- **Datos protegidos**: los turnos (nombres, legajos, licencias) están en Firebase y solo los leen
  los celulares registrados y el admin (lo mismo `pedidos_*` y `propios_*`). Quien no se registró
  ve un cartel y "¿Quién sos?". Registrado = su doc en `yo_cajeros` apunta a un legajo reservado a su
  uid en `legajos_cajeros`, o a una invitación usada por su uid (`inv-<código>`).
- **¿Quién sos?**: cada celular escribe su **legajo** una vez (`localStorage` `cajYo`); la app busca
  el nombre en `padron_cajeros/{legajo}` (Firebase deja leer de a un legajo, no la lista) y lo
  reserva en `legajos_cajeros` (un celular por legajo). Solo el admin lo puede cambiar (él ve la lista).
- **Pedir que le pasen el legajo**: si un celular pierde su registro (Android o iPhone borraron los datos de
  la página: es otra llave anónima de Firebase) y su legajo sigue reservado al celular viejo, en vez de quedar
  trabado manda un pedido (su doc de `yo_*` con `pide: legajo`, sin `id`: no queda registrado; `pedirPaso`) y
  espera mirando la reserva (`esperarPaso`). El admin lo ve arriba en Celulares (`pasosDocs`, `renderPasos`):
  "Pasar a este celular" borra la reserva y el registro viejo, y el celular nuevo se reserva solo (`pasarLegajo`);
  "No" borra el pedido. Al pasarlo se borra también el pedido (si no, reaparecía) y el admin lo ve en gris
  "Ya se lo pasaste" (`localStorage` `<PROP_PREF>Pasados`) hasta que ese celular abre la app y se registra. Además la app le pide al navegador que no borre sus datos (`navigator.storage.persist`).
- **Clave personal** (a pedido de Guillermo): cada usuario con legajo elige una clave de **4 números** y con legajo + clave
  entra en todos los aparatos que quiera, a la vez. Por dentro es una cuenta de Firebase Auth (correo/contraseña, correo inventado
  `l<legajo>[-v]@cajeros.example.com`, contraseña `vp<clave>-<legajo>`) que se le pega a la llave anónima con `linkWithCredential`:
  el uid no cambia, así que las reglas y el registro siguen iguales (`esCelular`, `esCuentaClave`, `tengoClave`).
  Los registrados la eligen una sola vez, obligatoria, al abrir (`revisarClave` → `abrirClave`/`guardarClave`, cuadro `claveOverlay`
  sin Cancelar). `cuentas_cajeros/{legajo} = {uid, v}` dice que ese legajo tiene clave. En otro aparato, "¿Quién sos?" con un legajo que
  tiene clave pide la clave (`cuentaDeLegajo`, `entrarConClave`, `signInWithEmailAndPassword`); "Me olvidé la clave" manda el pedido de
  pasar el legajo de siempre. Si el admin libera o pasa el legajo, los aparatos con la cuenta vieja salen (`signOut`) y el nuevo elige
  otra clave (cuenta nueva con `v` + 1). Si Firebase no tiene activado correo/contraseña, no la pide (`claveSaltear`).
  En Celulares, 🔑 = tiene clave (`clave` en su `yo_*`) y arriba "🔑 N de M ya tienen clave" (`celularesClave`, sin invitados). Cada persona = una línea (mismo uid en todos sus aparatos).
  Reglas y paso en la consola: `REGLAS-FIREBASE-CLAVE.md`. Pruebas: `__CUENTAS` en el Firebase falso.
- **iPhone**: Safari y la app instalada en el inicio no comparten nada (para Firebase son dos
  celulares). En Safari de iPhone "¿Quién sos?" explica que primero instalen la app (o "Prefiero
  usarla solo en Safari"); un link de invitación abierto en Safari no se gasta y muestra el código,
  que se escribe en la app con "Tengo un código de invitación". En Celulares, "(app)" = instalada.
  No usar `alert`/`confirm` después de esperar a Firebase (en iPhone a veces no aparecen).
  **Pasar de Safari a la app** (sin el admin): en Safari registrado, Cambios → "📲 Pasar a la app" (`abrirPase`) saca un
  código de 6 cifras que vale 10 min (`pases_cajeros`); en la app se escribe con "Tengo un código de invitación" (`usarPase`):
  toma la reserva del legajo con `pase`, borra el `yo_*` de Safari y Safari se libera solo (`vigilarPase`/`paseHecho`).
  Reglas: `REGLAS-FIREBASE-PASES.md`.
- **Externos**: entran con un link de invitación del admin (Celulares → Invitar, colección
  `invitados_cajeros`). No reservan legajo, no tienen fila propia (no publican ni piden cambios).
  El código de la invitación es de 3 cifras (`codigoInvitacionLibre`, no repite uno existente; a pedido de Guillermo;
  en cajeros, las de Control VP siguen con el código largo).
  `EXTERNOS` en `index.html` quedó vacío (Valeria pasó a invitación).
- **Fila propia vs. ajena**: cualquiera puede cambiar cualquier fila en su celular, pero solo
  lo de **su propia fila** se publica para todos (colección `propios_cajeros`, doc
  `<mes>_<legajo>`, días como `d0`, `d1`…). Lo de filas ajenas queda solo en ese celular.
  Lo publicado por el usuario manda sobre lo oficial; el admin puede descartarlo y al usuario
  le llega un aviso.
- **Cambios** (pedidos de cambio de turno, `pedidos_cajeros`): quien pide da su turno de ese
  día y marca lo que **acepta** (`acepta`: uno o varios turnos, `"*"` = cualquiera, o `F`
  ofreciendo sus francos en `francos`). Otros responden "Me sirve"; quien pidió confirma y
  queda un acuerdo (`estado: "acordado"`). Cada celular publica solo su propia fila del acuerdo, pero todos
  ven las dos filas apenas se confirma (`aplicarAcuerdosATodos`, dentro de `aplicarPropios`; si después se publicó otra cosa
  en lo oficial, manda lo oficial; lo que el dueño publicó antes del acuerdo no lo tapa).
  Si después del acuerdo el dueño vuelve a su turno de antes (igual a lo oficial, o con Restaurar), igual se publica
  en su `propios_*` para tapar el acuerdo (`acuerdoCeldasDe` en `syncPropios`; caso Nemaric/Paz).
  `syncPropios` espera a tener los pedidos (`pedListo`). Si publicar (propios o CJ) falla, no lo da por hecho (vuelve a ámbar)
  y reintenta a los 30 s (`REINTENTO_MS`); al volver a la app o a internet manda lo pendiente (`reenviarPendientes`).
  Las pruebas pueden demorar una colección (`localStorage` `__demora`) o hacer fallar escrituras (`__fallar`).
  **Pedido quitado y conexión dormida** (caso Paz): en el iPhone la conexión en vivo con Firebase a veces se duerme y no avisa
  que un pedido se quitó. Al volver a la app (tras >5 s afuera), al volver internet o al abrir Cambios se reconecta
  (`refrescarConexion`: disableNetwork/enableNetwork). Al abrir un pedido se lo pide al servidor (`verificarPedido`); "Me sirve" y
  confirmar van con transacción que revisa que el pedido siga en pie y el otro siga interesado (`guardarAcuerdo`); si no,
  se saca del celular y avisa con un cartelito (`pedidoYaNoEsta`).
  Se ven en el **banco de cambios**: el botón Cambios abre un cuadro (fondo oscuro) con el
  almanaque del mes; cada día muestra cuántas propuestas hay, tu turno, borde verde si alguna te
  sirve y ★ si tenés pedido. Al tocar el día se listan sus propuestas ("Da N · busca/acepta …";
  el día del franco ofrecido dice "busca F el N"); cada una abre el cuadro del pedido
  (`openPedido`), y "＋ Pedir cambio el N" carga uno propio.
  **Propuestas en la grilla** (vista A y D, `propClase`/`propuestaEn`): en la celda del que ofrece (o del franco ofrecido)
  va una rayita abajo: **verde + borde verde** = te sirve (`prop-sirve`), **gris** = no te sirve (`prop`), **★** = tu propio pedido
  (`prop-mio`). Hoy y lo pasado, nada. Tocar la celda de otro abre el pedido (con "✎ Cambiar a mano"). El admin y la División
  (en D, reemplaza a la esquinita celeste de antes) ven todas en gris.
  Los cambios vencen el mismo día: hoy y los días pasados quedan grises en el banco (`diaPasado`),
  y los pedidos sin acordar de hoy desaparecen (`pedidoVencido`). El banco arranca en mañana.
  Excepción: la División y el admin sí pueden tocar hoy en el banco (para un cambio de palabra).
  "Acordados" y "Celulares" (admin) y "¿Quién sos?" están arriba de ese cuadro.
- **Avisos** ("Novedades de tus cambios"): interesados en tu pedido, confirmación, pedido
  cerrado con otro, admin lo pasó a lo oficial, admin descartó tu cambio.
  Si alguien respondió "Me sirve" a tu pedido y falta confirmar, queda un cartel naranja fijo abajo (`avisoFijo`,
  `actualizarAvisoFijo`) que abre el pedido (`abrirMiPedido`); en Android vibra. Notificaciones push: Guillermo no las quiere.
- **CJ** (vista del admin): los cambios que manda cada celular (colección `cj_cajeros`),
  incluidos los de filas ajenas. También suma lo publicado en `propios_*` (aunque ese celular no haya
  mandado nada). Un celular no manda a CJ hasta tener los turnos del mes (si no, lo borraría).
  Al tocar una celda marcada en CJ se abre un cuadro con **de dónde vino** cada dato (qué celular lo
  mandó, según `yo_*`, o si lo publicó el dueño en su fila) y cuándo (`abrirInfoCj`).
  Desde ese cuadro, **Pasar a lo oficial** publica solo esa celda (`pasarCjAOficial`).
  En CJ se distinguen (`CJ_MARKS` = "propio"/"ajeno"): esquinita azul = lo cambió el dueño en su fila (ya lo ven
  todos); borde violeta + esquinita violeta = lo cambió otro celular en una fila ajena (solo en ese celular).
- Al abrir, la app muestra el inicio de la grilla principal (ni el grupo propio ni el almanaque:
  `ABRIR_ALMANAQUE_AL_INICIO = false`).
  Tras la recarga automática de 20 min vuelve a donde estaba (`recargaAutomatica` / `volverAPosicion`).
  Si no (al abrir), la grilla se corre para dejar **hoy en el medio** y esa columna titila dos veces (`centrarHoyEnGrilla`, `hoy-col`).
  También al volver a la app tras 30 min sin usarla, si no hay ninguna ventana abierta (`centrarAlVolver`, desde `revisarUso`).
  En el almanaque individual, hoy tiene borde verde y titila dos veces solo al abrirlo (`hoy-cal`, `hoy-titila`).
- **Pedir cambio desde el cuadro del turno**: al tocar un turno propio (no pasado, no LIC) aparece arriba "⇄ Pedir cambio el N"
  (o "Ver mi pedido…"), que abre `openPedido` de ese día (`shiftPedir`).
  Ese cuadro y el almanaque individual se cierran arrastrándolos con el dedo hacia arriba (`deslizarParaCerrar(overlayId, cerrar)`,
  más de 70 px; si es más alto que la pantalla, solo desde el título; soltar sobre un turno/día no lo elige). Para que no
  "chispee": se mueve con requestAnimationFrame, el fondo oscuro se aclara a la par y no se toca la opacidad del cuadro.
- Arriba: solo el selector de mes (el título solo si hay un único mes) y un botón con el
  apellido del usuario (`btnMiAlmanaque`) que abre su almanaque; el admin no lo ve.
- **Buscador de nombres** (solo cajeros, a pedido de Guillermo): arriba a la izquierda, en la fila del título y sobre la
  columna de legajos y nombres del primer recuadro (`ubicar` lo alinea con esa columna). Solo en pantallas anchas (PC, ≥760px; en el celular no entra) y solo si hay gente en la grilla.
  Busca por nombre o legajo (sin importar acentos); con Enter o tocando el resultado lleva a esa fila y la resalta en amarillo.
- Copia de los meses en el celular (cajeros `cajTurnos:<mes>`, jefes `ctFb:<mes>`) para abrir al
  instante y sin internet; solo en registrados/admin y se borra si el admin libera el celular.
- Colores de celdas: ámbar = cambio solo en este celular; azul = publicado. **El usuario común ve el azul solo en su
  propia fila** (lo que publicó él o le cambió el admin/División); en las demás ve el turno nuevo sin marca (a pedido de
  Guillermo, para no ensuciar la grilla). El ámbar sí en cualquier fila. El admin ve todo como siempre (`cellMark`).
  En su propia fila, lo que oficializó el admin o la División (igual a lo oficial pero distinto de la inicial) va con
  esquinita **verde** (`ofi` → clase `oficial`) y lo que publicó él, azul (a pedido de Guillermo, para distinguirlos).
- **Colores fijos** (a pedido de Guillermo): la app se ve igual con el celular en modo claro u oscuro
  (`<meta name="color-scheme" content="only light">` y `color-scheme: only light` en `:root`), para que Chrome/Samsung no la oscurezcan.
- **Nube del iPhone**: el iPhone nuevo pone un difuminado debajo de la hora que tapaba los botones de arriba. En
  iPhone/iPad el encabezado baja 44px (`ios-nube`, con `ES_IOS`). Ya se probó cambiar `viewport-fit`/`status-bar-style`
  en jefes y quedó peor (se volvió atrás): no tocar eso, que obliga a reinstalar la app.
- **El admin publica cambios de turnos** (ej. acordados de palabra) con ⬆ Publicar: pasan a lo oficial
  (`turnosAPublicar`), con `changedAt["legajo:día"]` = cuándo. Si en esa celda el dueño había publicado otra
  cosa en su fila, avisa y la descarta (`choquesConPropios` → `descartarPropio`, al dueño le llega aviso): manda
  lo del admin. Si después el dueño la vuelve a cambiar, al admin le llega un aviso (`avisosAdmin`, avisos con
  clave "admin"). Siguen en azul para todos porque se comparan con la inicial.
  En cada celular, lo que tenía cargado en esa celda **antes** de la publicación del admin se borra y pasa a ver
  lo del admin (`soltarEditsPisados`, compara la hora del cambio con `changedAt`); si lo cambia después, se respeta.
- **Admin en el celular** (pantalla ≤1000px o táctil, a pedido de Guillermo): Celulares sale de Cambios y queda arriba
  como 📱 (`btnCelTop`, con globito rojo de nuevos/piden entrar), y Cambios pasa a ser ⇄. En la PC sigue como antes.
- **Botón de admin (muñequito)**: solo aparece en dispositivos donde ya se entró como admin
  (`localStorage` `vpFueAdmin`). En cualquier otro se entra manteniendo apretado **Cambios** 3 segundos y soltando.
- Vistas del admin (botón arriba a la izquierda): **A** (lo que ven todos, editable) → **I** (la programación
  inicial del mes, solo lectura) → **CJ**. La vista "O" (oficial) se sacó a pedido de Guillermo.
- **Menú del admin (☰)**: Fer, Colores, los JSON y ⬆ Publicar están en la ventana del botón ☰, en el celular y
  en la PC (`menuAdmin`; muestra el número de cosas por publicar). En jefes es igual (Bajar, JSON, Colores, Publicar).
  El botón "Copiar" se sacó a pedido de Guillermo.
- **División** (rol intermedio entre el admin y los usuarios): el admin la marca en Celulares con la coronita 👑 al lado de Liberar (violeta = es División;
  colección `division_cajeros/{legajo o inv-código}`; `soyDivision()`, clase `is-division`). Puede: **autorizar pedidos sin
  contraparte** (en el cuadro del pedido, "Autorizar …": pasa a lo oficial y el pedido queda `estado: "autorizado"` con `por`;
  al que pidió le llega "Autorizado por la División — Nombre"), **pasar acordados a lo oficial** (Acordados → "Pasar a lo
  oficial", queda `pasado` + `pasadoPor`) y **publicar los turnos que cambia a mano** de cualquiera con su ⬆ Publicar
  (`btnPublicarDiv`, a pedido de Guillermo se volvió a poner; queda en `publicadoPor` sin `a`).
  **Cambio de palabra** (botón violeta "＋ Cambio de palabra el N" en el día del banco, `abrirPalabra`): elige empleado y
  con quién cambia (intercambian el turno de ese día; queda `estado: "acordado"`, `palabra: true`, `pasado`) o "Nadie"
  (sin contraparte: elige el turno; queda `estado: "autorizado"`, `palabra: true`). Va a lo oficial y les llega aviso.
  Todo eso usa `publicarCeldas` (transacción: solo cambia esas celdas sobre lo último de Firebase y anota
  `publicadoPor["legajo:día"] = {n, t, a}`, a: 1 autorizó / 2 acuerdo / 3 de palabra); al admin le llega aviso de lo que hizo. No toca Celulares, invitaciones,
  colores ni meses. Reglas: `REGLAS-FIREBASE-DIVISION.md`. El admin también puede autorizar ("Autorizado por el administrador").
  **Colores y feriados** (a pedido de Guillermo): la División tiene arriba un menú ☰ (`btnDivMenu`, `divMenuOverlay`) con Feriados y Colores (`btnFeriadosDiv`,
  `btnColoresDiv`, `puedeColores()`), igual que el admin; su ⬆ Publicar los cuenta y los publica en la colección `cajeros`
  (queda en el historial). Reglas: `REGLAS-FIREBASE-DIVISION.md`.
  **Ticket** (Acordados → "🖨 Ticket", División y admin; `imprimirTicket`): imprime UN solo ticket chico (ticketera 80 mm)
  con el cambio y lugar para la firma de los dos empleados; cualquiera de ellos se lo presenta firmado a la División, que recién
  ahí lo pasa a lo oficial (la app no controla la firma). Sin copias para los empleados: les alcanza el aviso de la app.
  **Rechazar** (Acordados, División y admin, solo si no está en lo oficial; `rechazarAcuerdo`): pide el motivo, el pedido queda
  `estado: "rechazado"` con `rechazo = {motivo, por, t, adm?}`, se sacan los propios de esas celdas y cada celular de los dos
  vuelve a lo oficial (`deshacerRechazados`). A los dos les llega el aviso con el motivo; al admin, si fue la División.
  Queda en Acordados en gris; ese día se puede volver a pedir.
  **Vista D** (de la División): la División arranca en D y su botón de vistas pasa a I y vuelve (no ve la A, a pedido
  de Guillermo); el admin ve
  A → I → CJ → D. D (`viewMode = "division"`) muestra **la programación inicial más los cambios cerrados en el banco
  de cambios** (acordados, autorizados y de palabra), en el orden en que se cerraron, los **pedidos del banco que nadie
  acordó todavía** (esquinita celeste, `dped`: el turno no cambia; tocarla abre el pedido para verlo o autorizarlo, con
  "✎ Cambiar a mano"), y encima **lo que se cambió a mano en
  ese mismo celular** (ámbar) (`marcasCerrados` → `D_CODES`, `D_MARKS`, `D_KEYS`). También muestra en verde **todo lo oficial que quedó distinto de la inicial** (lo publicado por la División, por el
  admin o al volver a subir el mes; a pedido de Guillermo, caso Aguiar). Excepción por mes (`D_OCULTAR_VIEJO`): en
  noviembre 2026, para los días 15 al 30, lo publicado (admin o División) antes del 15/11 19:45 (según `changedAt`) no
  aparece en la D; lo publicado después sí, y los pedidos del banco siempre. Si se vuelve a subir el mes con ↑ JSON se
  pierde `changedAt` y todo lo de esos días queda oculto. NO muestra lo que los demás usuarios
  cambiaron a mano (propios, CJ) mientras no pase a lo oficial. Esquinita naranja = acordado entre los dos (falta
  avalarlo), verde = avalado (pasado a lo oficial, autorizado, de palabra o publicado a mano por la División). En D se
  cambian turnos a mano igual que en A (ámbar hasta que la División toca ⬆ Publicar; ahí pasan a verde); tocar una celda de un cambio acordado abre Acordados filtrado a ese
  cambio (`abrirCeldaD`, `acuFiltro`, con "Ver todos" y "✎ Cambiar a mano") para pasarlo a lo oficial, imprimir el
  ticket o rechazarlo.
  **Varios usuarios en la PC de la División** (a pedido de Guillermo): el admin carga en Celulares (👥 al lado de la coronita)
  los empleados del área con nombre, legajo opcional y una clave **provisoria** de 4 a 6 números (`ops` dentro del doc de
  `division_*`, con una huella SHA-256 de la clave, nunca la clave; `abrirOps`). La primera vez que entra con la provisoria
  elige su **clave secreta** (`abrirNuevaClave("primera")`, `guardarNuevaClave`), que la PC guarda en `claves_*/{id PC}_{k}`
  (vale si su `v` es igual a `ops[k].v`). Desde 👤 → "🔑 Cambiar mi clave" la cambia (pide la de ahora). Si se la olvida,
  el admin toca "Clave nueva" (provisoria nueva: cambia `ops[k].v`, borra la elegida y le cierra la sesión). Si hay usuarios cargados, la PC muestra "¿Quién está usando la PC?"
  (`opOverlay`, `revisarOperador`, `entrarOp`; 5 claves mal = 30 s de espera) y todo sale a nombre de quien entró
  (`nombreAutorizante` → `opActual`); arriba un botón 👤 Apellido abre "Cambiar mi clave" y "Cerrar sesión". Se cierra sola a los 15 min sin tocar la PC
  (`OP_INACTIVO_MS`; se guarda en `localStorage` para sobrevivir la recarga automática). Sin usuarios cargados funciona como antes.
  **Historial** (`historial_*`, `regDiv`): entra, sale, se cerró sola, autorizó, pasó a lo oficial, de palabra, rechazó,
  publicó a mano, imprimió ticket. Solo lo lee el admin (Celulares → "📜 Historial de la División", filtro por persona).
  Reglas: `REGLAS-FIREBASE-HISTORIAL.md`.
  **Quién de la División fue lo ve solo el admin** (a pedido de Guillermo): a los empleados y a la misma División, en avisos,
  banco, Acordados y ticket, les dice solo "la División" (`nomDivVisible`, `laDivision`, `textoAutorizado`, `textoRechazo`).
  El nombre igual se guarda en Firebase (`por`, `pasadoPor`, `rechazo.por`, `publicadoPor`, historial).
  **Lo avalado NO queda trabado** (a pedido de Guillermo, se sacó la traba): el dueño puede cambiar su turno, pedir
  cambio y responder "Me sirve" con las reglas de siempre, y la app no le menciona a la División.
  **Horas extra** (solo cajeros): en el almanaque de cada uno las ve esa persona, el admin y la División (`renderOtSummary`,
  a pedido de Guillermo).
- **Uso de la app** (en Celulares, solo el admin): cada celular registrado suma 1 en su doc de `yo_*` (`ab`, y `ult` =
  última vez, y `disp` = aparato al día, para ver "(app)" aunque se haya registrado antes) al abrir la app o al volver a ella tras 30 min sin usarla (`contarApertura`); la recarga automática
  no cuenta (`sessionStorage` `recargaAuto`) y el admin no suma. "Sin usarla" se mide con la última vez que se la vio
  en pantalla (`localStorage` `<PROP_PREF>EnUsoHasta`, se renueva cada 30 s mientras se ve; `revisarUso` al volver, al
  tomar foco y en ese reloj): así cuenta aunque la recarga automática haya pasado con la app guardada o el iPhone la haya
  congelado sin avisar que se guardaba (antes se perdían esos usos, caso Tevez). Arriba de la lista, un resumen: cuántos la abrieron
  hoy, en 7 y en 30 días, y el total de aperturas. Cuenta desde el 8/11/2026. Sirve para los números del concurso.
  Está oculto hasta que el admin toca "📊 Ver uso de la app" (se muestra para todos a la vez) y **siempre arranca oculto** al
  abrir Celulares. Ese toque marca el momento: los que abrieron la app desde la vez anterior que miró van **arriba y en verde**
  con "+N usos" (`usosNuevos`; lo ya visto se guarda en `localStorage` `<PROP_PREF>UsoVisto` al tocar 📊 y al cerrar);
  la próxima vez vuelven a su lugar (orden alfabético).
  **Los usos viajan** (caso Sanchez, a pedido de Guillermo): al "Pasar a este celular" el admin no borra el pedido sino que le saca
  `pide` y le suma el `ab` del celular viejo (`pasarLegajo`; los `yo_*` sin `id` ni `pide` no se listan); con "📲 Pasar a la app" van
  en el código (`pases_*.ab`, `miAb`, `sumarUsosTraidos`). El admin los corrige a mano con ✎ (`cel-ab-edit`). Reglas: `REGLAS-FIREBASE-USOS.md`.
- **Festejo de los 100 usos** (solo cajeros, a pedido de Guillermo; en jefes NO): cuando el `ab` de su doc de `yo_*` llega a 100, ese celular muestra una lluvia de estrellas y "¡Felicitaciones, Nombre!" (`revisarFestejo100`, `festejar`, `#festejo`). Una sola vez por legajo en ese celular (`localStorage` `<PROP_PREF>Festejo100:<legajo>`, se anota recién al tocar el botón; la recarga automática espera si está abierto). Si el admin le corrige los usos con ✎ a menos de 100 se anota `festOtra` en su `yo_*` y vuelve a festejar al llegar; con 🎉 en Celulares (`cel-festejar`) anota `festPend` y le sale la próxima vez que abra la app, sin importar los usos, con "Gracias por tus colaboraciones" y sin el 100 (caso Sanchez: no le salía y no se la podía molestar). Las dos marcas las borra su celular al tocar el botón. El admin no.
- **Licencia (LIC)**: no lleva texto (solo el color; el selector de turnos sí dice LIC). Los días de
  licencia **oficial** no se pueden cambiar ni pedir (`esLicencia` en `puedeEditar`): solo el admin los puede corregir.
  Si el usuario se puso LIC él mismo (no viene de lo oficial), la puede sacar (caso Sanchez, que se la puso sin querer y quedó trabada).

## Programar Cajeros (`programar/`)
App aparte para **armar** la programación del mes (copia adaptada de `Cuadraditos-VP/programar-jefes`; a pedido de Guillermo).
Se sirve en `…/CAJEROS/programar/`. Usa el mismo Firebase que cajeros pero con app de Firebase con nombre propio
(`initializeApp(cfg,"programar")`, para no pisar la sesión de la app de cajeros) y colecciones `progr_*`
(`REGLAS-FIREBASE-PROGRAMAR.md`). Claves de `localStorage` con prefijo `pcaj_` (mismo dominio que programar-jefes).
Sin nombres en el HTML: la lista (`m.lista`: leg, nom, g, o) se trae de `turnos_cajeros` (solo el admin).
Colores de fábrica = los de cajeros (y los publicados en la colección `cajeros`). Reglas del día en `cupos(d)` (sacadas
de oct/nov 2026): MS 7; MD 2 VI/SA/DO/feriado; T3 5 SA/DO, 3 resto; víspera (VI, SA, antes de feriado): TE 9, E 7, X 2;
JU: E 3, E1 3, X 2; resto E 4; N y T el resto. Francos: rueda por grupo, 2 cada 8 días (`ruedaGrupos`).
Resumen (a pedido de Guillermo): solo F del mes y HE = horas extra del 26 del mes anterior al 25 de este (`horasExtra`,
`OT_TABLE`/`tipoDia` iguales a los de cajeros); del mes anterior se toma su programación inicial (`m.ini`, que trae
`mesDeCajeros` desde `inicial` de turnos_cajeros; si no hay, `m.t`).
Totales fijos abajo de la pantalla (`fijarTotales`, sticky bottom por fila), como tablero aparte: separador del color
del fondo de pantalla (`tothdr`, a pedido de Guillermo en vez de la franja oscura con los días), color del turno solo en la etiqueta, números en negrita sobre blanco/gris. Separador de 24px, igual al espacio entre grupos. La grilla se achica para mostrar justo dos grupos y abajo del segundo los totales
(`altoDosGrupos`, el par de grupos más alto; si no entra en la pantalla, achica filas de días `--hh` 32px, de totales
`--trh` 14px y renglones `--rh` hasta 16px). Sin video/imagen de inicio (a pedido de Guillermo).
Ícono propio (almanaque con casilleros de colores, franja bordó, fondo azul: `programar/icon-*.png`) y manifest con `id`
propio, para no confundirla con la app de cajeros (que tiene el chaleco).
En pantalla la fila de días de arriba no queda fija (`#gridCard .grid thead th{top:auto}`: confundía, los demás grupos
parecían el grupo 1) y la ruedita salta de grupo en grupo (listener `wheel` sobre `#gridCard`; shift/ctrl/horizontal normal).
Condicionales de grilla y totales apagados
(`CONDICIONALES = false`, son distintos a jefes); el franco en rojo del resumen queda.
No es gemela de progjefes: los cambios de acá no van a jefes.

## Diferencias con la gemela (jefes)
- En cajeros el admin sube el mes entero con ↑ JSON (va a `turnos_cajeros` y al padrón); sus cambios de
  turnos sueltos van con ⬆ Publicar (también a `turnos_cajeros`), y los colores/feriados/letras con ⬆ Publicar
  a la colección `cajeros`.
  Cada mes nuevo: Guillermo pasa el PDF, se arma el JSON y él lo sube con ↑ JSON (no a GitHub).
- Colección de CJ: `cj_cajeros` (en jefes es `cj`). Hay `server.js` para correr la app en local.
- **Control VP**: dos apps leen de acá: `Cuadraditos-VP/Control-VP` (la de jefes en el celular, a la que apunta
  el link de la invitación) y `Cuadraditos-VP/ControlVP-completo` (la de cabina en la PC). Las dos leen `turnos_cajeros`,
  `propios_cajeros` y los feriados. Cada dispositivo se autoriza una vez con una invitación que el admin manda
  desde Celulares → "Invitar a Control VP" (`invitados_cajeros` con `app: "controlvp"`, link a Control VP con
  `?inv=`; en iPhone se escribe el código con el botón 🔗). Control VP entra por REST como anónimo propio y se
  registra en `yo_cajeros` como `inv-<código>`. Si se cambia cómo se guardan los turnos o los propios, avisar
  que también hay que tocar las dos Control VP.

## Detalles técnicos útiles
- **Ahorro de lecturas de Firebase** (a pedido de Guillermo, la app crece): `pedidos_*` y `propios_*` se leen solo de los meses que importan (`mesesALeer`: el anterior, el de hoy, el siguiente y el que se está mirando; consulta `where("mes", "in", …)`). Al elegir otro mes se vuelve a pedir con ese mes (`revisarMesesLeidos`, desde `setMonthGlobals`); no se publica la fila propia de un mes hasta tener lo suyo de Firebase (`mesCargado` en `syncPropios`). La recarga automática no se hace con la app guardada (`document.hidden`). Todo pedido/propio tiene que llevar `mes`.
- Firebase: Firestore + Auth (anónimo para los celulares, Google para el admin). Admin =
  guillermo.nemaric@gmail.com. Las reglas viven en la consola de Firebase (no en el repo);
  `REGLAS-FIREBASE-*.md` tiene los bloques que se agregaron.
- `sw.js`: primero intenta internet y si no hay, usa la copia guardada (no hace falta cambiar
  la versión de la caché para publicar).
  La página se guarda con una sola llave (`…/index.html`, entre por `/` o `/index.html`) y se pide sin la copia del navegador
  (`cache: "no-cache"`): antes, con mala señal, el iPhone abría una copia vieja (caso "no tiene permiso para publicar" con la clave).
  Ese cartel solo sale si recién se tocó entrar con Google (`sessionStorage` `probandoGoogle`).
- Al escribir en Firestore, actualizar solo los campos propios (ej. `respuestas.<legajo>`)
  para que dos celulares que escriben a la vez no se pisen.
