const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reconnecting ', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('Bot successfully connected!');
        }
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = "919897538986";
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                console.log(`Pairing code: ${code}`);
            } catch (err) {
                console.log("Error getting pairing code:", err);
            }
        }, 5000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message || mek.key.fromMe) return;
            
            const messageContent = mek.message.conversation || mek.message.extendedTextMessage?.text;
            const sender = mek.key.remoteJid;
            
            if (!messageContent) return;

            if (messageContent === '.menu') {
                await sock.sendMessage(sender, { text: 'Bot Menu:\n1. .menu - View menu\n2. .message <text> - Send test message' });
            } else if (messageContent.startsWith('.message')) {
                const textToSend = messageContent.replace('.message', '').trim();
                await sock.sendMessage(sender, { text: textToSend || 'Please provide some text!' });
            }
        } catch (err) {
            console.log("Error handling message:", err);
        }
    });
}

connectToWhatsApp();
