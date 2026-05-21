// test-fse-local.js - Ejecutar con: node test-fse-local.js
// Este script NO depende de Express, PM2, ni producción. Solo dotenv + axios.

require('dotenv').config(); // Carga .env desde la raíz

const axios = require('axios');
const https = require('https');

console.log('🚀 === FSEconomy Local Test ===');
console.log('📦 Node:', process.version);
console.log('🌐 Platform:', process.platform);
console.log('🔑 FSE_USERKEY:', process.env.FSE_USERKEY ? '✓ Configurada' : '✗ FALTANTE');
console.log('🔑 FSE_READ_KEY:', process.env.FSE_READ_KEY ? '✓ Configurada' : '✗ FALTANTE');

if (!process.env.FSE_USERKEY || !process.env.FSE_READ_KEY) {
  console.error('❌ Agrega FSE_USERKEY y FSE_READ_KEY a tu .env local primero');
  process.exit(1);
}

const baseURL = 'https://server.fseconomy.net/data';
const params = {
  userkey: process.env.FSE_USERKEY,
  format: 'xml',
  query: 'fbos',
  search: 'key',
  readaccesskey: process.env.FSE_READ_KEY
};

async function testWithAxios() {
  console.log('\n🧪 Prueba 1: Axios con configuración explícita');
  
  const instance = axios.create({
    baseURL,
    timeout: 20000,
    headers: {
      'Accept': 'application/xml, text/xml, */*',
      'User-Agent': 'ZAM-AIR-Local-Test/1.0'
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: true, keepAlive: true })
  });
  
  try {
    console.log('📡 Request URL:', `${baseURL}?${new URLSearchParams(params).toString()}`.replace(/key=[^&]+/g, 'key=***'));
    const response = await instance.get('', { params });
    console.log('✅ Axios SUCCESS - Status:', response.status);
    console.log('📦 Data type:', typeof response.data);
    console.log('📦 Preview:', String(response.data).substring(0, 200));
    return { ok: true, method: 'axios', data: response.data };
  } catch (error) {
    console.log('❌ Axios FAILED');
    console.log('🔴 Error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      hasResponse: !!error.response,
      status: error.response?.status,
      dataPreview: error.response?.data?.substring?.(0, 150)
    });
    return { ok: false, method: 'axios', error: error.message };
  }
}

async function testWithHttpsNative() {
  console.log('\n🧪 Prueba 2: HTTPS nativo (control)');
  
  return new Promise(resolve => {
    const queryString = new URLSearchParams(params).toString();
    const url = `${baseURL}?${queryString}`;
    
    console.log('📡 Request URL:', url.replace(/key=[^&]+/g, 'key=***'));
    
    https.get(url, {
      headers: { 'Accept': 'application/xml, text/xml', 'User-Agent': 'ZAM-AIR-Local-Test/1.0' }
    }, res => {
      let data = '';
      console.log('📥 Status:', res.statusCode);
      console.log('📥 Headers:', JSON.stringify(res.headers, null, 2));
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ HTTPS Native SUCCESS');
          console.log('📦 Length:', data.length, 'chars');
          console.log('📦 Preview:', data.substring(0, 200));
          resolve({ ok: true, method: 'https-native', data });
        } else {
          console.log('❌ HTTPS Native FAILED - Status:', res.statusCode);
          console.log('📦 Body preview:', data.substring(0, 200));
          resolve({ ok: false, method: 'https-native', status: res.statusCode });
        }
      });
    }).on('error', err => {
      console.log('❌ HTTPS Native ERROR:', {
        name: err.name,
        message: err.message,
        code: err.code,
        errno: err.errno,
        syscall: err.syscall
      });
      resolve({ ok: false, method: 'https-native', error: err.message });
    });
  });
}

(async () => {
  const axiosResult = await testWithAxios();
  const httpsResult = await testWithHttpsNative();
  
  console.log('\n🏁 === RESULTADO FINAL ===');
  console.log('Axios:', axiosResult.ok ? '✅ FUNCIONA' : '❌ FALLA');
  console.log('HTTPS Native:', httpsResult.ok ? '✅ FUNCIONA' : '❌ FALLA');
  
  if (axiosResult.ok || httpsResult.ok) {
    console.log('\n🎉 CONCLUSIÓN: Tu máquina local PUEDE conectar a FSEconomy.');
    console.log('El problema está SOLO en el servidor Ubuntu (firewall, SSL, proxy, etc.)');
  } else {
    console.log('\n🔴 CONCLUSIÓN: La conexión FALLA también desde local.');
    console.log('Posibles causas: keys inválidas, FSEconomy caído, o bloqueo por IP/User-Agent.');
  }
  
  process.exit(0);
})();
