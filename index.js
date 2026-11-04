const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const P = require('pino')
const express = require('express')
const Tesseract = require('tesseract.js')
const app = express()
const DONO = '258841067961@s.whatsapp.net'
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth')
  const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), browser: ['Fenias Bot', 'Chrome', '1.0'] })
  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try { let code = await sock.requestPairingCode('258841067961'); console.log('CODIGO:', code) } catch(e){ console.log(e) }
    }, 5000)
  }
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot()
    if (connection === 'open') console.log('BOT ONLINE!')
  })
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe) return
    const sender = m.key.remoteJid
    const senderNum = sender.split('@')[0]
    const caption = m.message.imageMessage?.caption || m.message.documentMessage?.caption || m.message.conversation || m.message.extendedTextMessage?.text || ''
    const isMedia = !!m.message.imageMessage || !!m.message.documentMessage
    if (isMedia) {
      await sock.sendMessage(sender, { text: '⏳ Lendo seu comprovativo...' })
      try {
        const buffer = await downloadMediaMessage(m, 'buffer', {}, { logger: P({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage })
        const { data: { text } } = await Tesseract.recognize(buffer, 'por')
        const texto = text.trim() || '(não consegui ler, ver foto)'
        await sock.sendMessage(DONO, { text: `🔥 *NOVO COMPROVATIVO*\n\n👤 Cliente: wa.me/${senderNum}\n📱 Info: ${caption}\n\n📄 *TEXTO EXTRAIDO:*\n${texto}` })
        await sock.sendMessage(DONO, { image: buffer, caption: `Foto de ${senderNum}` })
        await sock.sendMessage(sender, { text: `✅ Recebido! Transformei em texto e enviei para 841067961:\n\n${texto.substring(0,400)}` })
      } catch (e) {
        await sock.sendMessage(DONO, { text: `Comprovativo de ${senderNum}: ${caption}` })
      }
      return
    }
    if (caption.length > 5) {
      await sock.sendMessage(sender, { text: 'Anotado ✅ Agora envie a FOTO do comprovativo que vou ler e mandar para 841067961' })
    } else {
      await sock.sendMessage(sender, { text: 'Olá! Sou bot da Fenias 👋\n1- Mande o número\n2- Mande a FOTO do comprovativo\nVou transformar em texto e encaminhar para 841067961' })
    }
  })
}
app.get('/', (req,res) => res.send('Bot Fenias OK'))
app.listen(process.env.PORT || 3000, () => {})
startBot()
