const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const P = require('pino')
const express = require('express')
const app = express()
const DONO = '258841067961@s.whatsapp.net'
const NUMERO = '258841067961'

async function startBot(){
const { state, saveCreds } = await useMultiFileAuthState('./auth')
const sock = makeWASocket({ auth: state, logger: P({level:'silent'}), printQRInTerminal:false, browser:['Bot Fenias','Chrome','1.0.0'] })
if(!sock.authState.creds.registered){
setTimeout(async()=>{
try{
let code = await sock.requestPairingCode(NUMERO)
console.log('===========================')
console.log('CODIGO: '+code)
console.log('===========================')
}catch(e){console.log(e)}
},3000)
}
sock.ev.on('creds.update', saveCreds)
sock.ev.on('connection.update', (u)=>{
const {connection, lastDisconnect} = u
if(connection==='close'){
const r = lastDisconnect?.error instanceof Boom ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true
if(r) startBot()
}else if(connection==='open'){ console.log('BOT CONECTADO!') }
})
}
app.get('/',(req,res)=>res.send('Bot OK - veja o CODIGO nos LOGS'))
app.listen(10000,()=>{console.log('Iniciando...'); startBot()})
