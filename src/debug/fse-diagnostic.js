// src/debug/fse-diagnostic.js
require('dotenv').config({ path: process.env.NODE_ENV === 'production' ? '.env' : '../../.env' });
const axios = require('axios');
const https = require('https');

const USERKEY = process.env.FSE_USERKEY;
const READKEY = process.env.FSE_READ_KEY;

console.log('🔍 === FSEconomy Diagnostic Tool ===');
console.log('📦 Node version:', process.version);
console.log('🌐 Environment:', process.env.NODE_ENV);
console.log('🔑 FSE_USERKEY:', USERKEY ? `${USERKEY.substring(0,8)}... (${USERKEY.length} chars)` : '❌ UNDEFINED');
console.log('🔑 FSE_READ_KEY:', READKEY ? `${READKEY.substring(0,8)}... (${READKEY.length} chars)` : '❌ UNDEFINED');

const baseURL = 'https://server.fseconomy.net/data';
const params = {
  userkey: USERKEY,
  format: 'xml',
  query: 'fbos',
  search: 'key',
  readaccesskey: READKEY
};

// === PRUEBA 1: Axios con configuración explícita ===
async function testAxios() {
  console.log('\n🧪 PRUEBA 1: Axios con configuración explícita');
  
  try {
    const instance = axios.create({
      baseURL,
      timeout: 15000,
      headers: {
        'Accept': 'application/xml, text/xml, */*',
        'User-Agent': 'ZAM-AIR-Bot/1.0 (Node.js)'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: true,
        keepAlive: true
      }),
      // Debug: mostrar detalles de la petición
      transformRequest: [(data, headers) => {
        console.log('📤 Axios Request Headers:', JSON.stringify(headers, null, 2));
        return data;
      }]
    });

    console.log('📡 Making request to:', `${baseURL}?${new URLSearchParams(params).toString()}`);
    
    const response = await instance.get('', { params });
    
    console.log('✅ Axios SUCCESS');
    console.log('📊 Status:', response.status);
    console.log('📦 Response type:', typeof response.data);
    console.log('📦 First 300 chars:', response.data?.substring?.(0, 300) || 'N/A');
    
    return { success: true, method: 'axios', data: response.data };
  } catch (error) {
    console.log('❌ Axios FAILED');
    console.log('🔴 Error name:', error.name);
    console.log('🔴 Error message:', error.message);
    console.log('🔴 Error code:', error.code);
    console.log('🔴 Error errno:', error.errno);
    console.log('🔴 Error syscall:', error.syscall);
    console.log('🔴 Error response?', !!error.response);
    if (error.response) {
      console.log('🔴 Response status:', error.response.status);
      console.log('🔴 Response headers:', error.response.headers);
      console.log('🔴 Response data (200 chars):', error.response.data?.substring?.(0, 200));
    }
    console.log('🔴 Error config?', !!error.config);
    if (error.config) {
      console.log('🔴 Config URL:', error.config.url);
      console.log('🔴 Config baseURL:', error.config.baseURL);
      console.log('🔴 Config params:', error.config.params);
    }
    console.log('🔴 Full error object (keys):', Object.keys(error));
    
    return { success: false, method: 'axios', error: error.message };
  }
}

// === PRUEBA 2: HTTPS nativo de Node.js (control) ===
function testHttpsNative() {
  return new Promise((resolve) => {
    console.log('\n🧪 PRUEBA 2: HTTPS nativo de Node.js');
    
    const queryString = new URLSearchParams(params).toString();
    const url = `${baseURL}?${queryString}`;
    
    console.log('📡 Request URL:', url);
    
    https.get(url, {
      headers: {
        'Accept': 'application/xml, text/xml, */*',
        'User-Agent': 'ZAM-AIR-Bot/1.0 (Node.js)'
      }
    }, (res) => {
      let data = '';
      
      console.log('📥 Response status:', res.statusCode);
      console.log('📥 Response headers:', JSON.stringify(res.headers, null, 2));
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ HTTPS Native SUCCESS');
          console.log('📦 Data length:', data.length);
          console.log('📦 First 300 chars:', data.substring(0, 300));
          resolve({ success: true, method: 'https-native', data });
        } else {
          console.log('❌ HTTPS Native FAILED - Status:', res.statusCode);
          console.log('📦 Response body (200 chars):', data.substring(0, 200));
          resolve({ success: false, method: 'https-native', status: res.statusCode, data });
        }
      });
    }).on('error', (err) => {
      console.log('❌ HTTPS Native ERROR');
      console.log('🔴 Error name:', err.name);
      console.log('🔴 Error message:', err.message);
      console.log('🔴 Error code:', err.code);
      console.log('🔴 Error errno:', err.errno);
      console.log('🔴 Error syscall:', err.syscall);
      resolve({ success: false, method: 'https-native', error: err.message });
    });
  });
}

// === Ejecutar ambas pruebas ===
async function run() {
  const axiosResult = await testAxios();
  const httpsResult = await testHttpsNative();
  
  console.log('\n🏁 === DIAGNOSTIC SUMMARY ===');
  console.log('Axios:', axiosResult.success ? '✅ OK' : '❌ FAILED');
  console.log('HTTPS Native:', httpsResult.success ? '✅ OK' : '❌ FAILED');
  
  if (axiosResult.success || httpsResult.success) {
    console.log('\n🎉 CONCLUSIÓN: La conexión a FSEconomy FUNCIONA desde este servidor.');
    console.log('El problema está en cómo fseconomy.service.js usa axios o maneja la respuesta.');
  } else {
    console.log('\n🔴 CONCLUSIÓN: La conexión a FSEconomy FALLA desde este servidor.');
    console.log('Posibles causas: firewall, DNS, SSL/TLS, proxy, o FSEconomy bloqueando este IP/User-Agent.');
  }
  
  process.exit(0);
}

run().catch(console.error);
