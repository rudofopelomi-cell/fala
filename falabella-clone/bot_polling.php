<?php
/**
 * BOT TELEGRAM en modo LONG POLLING (getUpdates)
 * -------------------------------------------------
 * Levanta @fallansacmbot SIN necesidad de un túnel público / webhook.
 * Reutiliza toda la lógica ya definida en router.php (manejarMensajeTelegram,
 * enviarTelegram, notificarTelegram, etc.).
 *
 * Uso:  php bot_polling.php
 * Detener: Ctrl+C
 */

// Cargar la lógica del bot (router.php solo define funciones y hace return false)
$cfg = __DIR__ . '/data/config.php';
if (is_file($cfg)) include $cfg; // config define las constantes (con @ para silenciar si router las re-define)
if (!defined('TELEGRAM_BOT_TOKEN')) define('TELEGRAM_BOT_TOKEN', '');
if (!defined('TELEGRAM_CHAT_ID')) define('TELEGRAM_CHAT_ID', '');

if (TELEGRAM_BOT_TOKEN === '') {
    fwrite(STDERR, "ERROR: TELEGRAM_BOT_TOKEN vacío (revisa data/config.php)\n");
    exit(1);
}

// router.php espera contexto de servidor web (REQUEST_URI) solo al ejecutarse como
// front controller. Aquí solo nos interesan sus funciones, así que definimos
// variables ficticias para evitar warnings y silenciamos el duplicado de constantes.
$_SERVER['REQUEST_URI'] = $_SERVER['REQUEST_URI'] ?? '/telegram-polling';

/**
 * Llamada a la API de Telegram usando cURL con IPv4 forzado.
 * (file_get_contents falla cuando el DNS devuelve primero IPv6, que es lo que
 *  ocurre con api.telegram.org. cURL con CURLOPT_IPRESOLVE resuelve el problema.)
 */
function telegramRequest($url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 90, // getUpdates usa long-polling de hasta 50s
        CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_WHATEVER, // IPv4 si es posible
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
    ]);
    $raw   = curl_exec($ch);
    $errno = curl_errno($ch);
    $error = curl_error($ch);
    curl_close($ch);
    if ($raw === false || $errno) {
        fwrite(STDERR, "[bot] cURL error ($errno): $error\n");
        return false;
    }
    return $raw;
}

$offset = 0;
$actual = getmypid();
echo "[bot] Iniciando polling con getUpdates (PID $actual)...\n";
echo "[bot] Presiona Ctrl+C para detener.\n\n";

// Mantener vivo: procesar 1 pedido pendiente tambien se cubre con /api/pedido del router.
while (true) {
    $url = 'https://api.telegram.org/bot' . TELEGRAM_BOT_TOKEN
         . '/getUpdates?timeout=50&offset=' . $offset;
    $raw = telegramRequest($url);
    if ($raw === false) {
        fwrite(STDERR, "[bot] Error de red al llamar getUpdates. Reintentando en 3s...\n");
        sleep(3);
        continue;
    }
    $j = json_decode($raw, true);
    if (!is_array($j) || !isset($j['ok']) || !$j['ok']) {
        // Posible conflicto si el webhook sigue activo. Desactivar webhook para liberar.
        fwrite(STDERR, "[bot] getUpdates devolvió error: " . substr($raw, 0, 300) . "\n");
        fwrite(STDERR, "[bot] Si dice 'Conflict: can't use getUpdates method while webhook is active', desactiva el webhook:\n");
        fwrite(STDERR, "[bot]   GET /telegram-setwebhook no; usa: https://api.telegram.org/bot<TOKEN>/deleteWebhook\n");
        sleep(5);
        continue;
    }

    foreach ($j['result'] as $upd) {
        $offset = $upd['update_id'] + 1; // confirmar procesado
        if (isset($upd['message'])) {
            try {
                manejarMensajeTelegram($upd['message']);
            } catch (Throwable $e) {
                fwrite(STDERR, "[bot] Error procesando mensaje: " . $e->getMessage() . "\n");
            }
        }
    }
    // Pequeña pausa para no saturar la API cuando no hay updates. getUpdates ya
    // usa timeout=50s (long polling), así que solo dormimos un instante.
    usleep(200000);
}
