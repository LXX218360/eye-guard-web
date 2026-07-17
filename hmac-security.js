// ==================== 安全加固：HMAC 签名验证 ====================
window._signingKey = null;
window._signingKeyPromise = null;

function fetchSigningKey() {
  if (window._signingKey) return Promise.resolve(window._signingKey);
  if (window._signingKeyPromise) return window._signingKeyPromise;
  if (!API_BASE_URL) {
    window._signingKey = 'offline';
    return Promise.resolve('offline');
  }
  window._signingKeyPromise = fetch(API_BASE_URL + '/api/pubkey', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }).then(function(r) {
    if (!r.ok) throw new Error('/api/pubkey ' + r.status);
    var ct = r.headers.get('content-type') || '';
    if (ct.indexOf('text/html') !== -1) throw new Error('API不可用');
    return r.json();
  }).then(function(data) {
    if (data.key) {
      window._signingKey = data.key;
      return data.key;
    }
    window._signingKey = 'offline';
    return 'offline';
  }).catch(function(err) {
    console.warn('[HMAC] 获取签名密钥失败，进入离线模式:', err.message || err);
    window._signingKey = 'offline';
    return 'offline';
  });
  return window._signingKeyPromise;
}

// 使用 Web Crypto API 计算 HMAC-SHA256（浏览器原生，绝对正确）
function hmacSha256(message, secret) {
  var encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  ).then(function(key) {
    return crypto.subtle.sign('HMAC', key, encoder.encode(message));
  }).then(function(signature) {
    // 将 ArrayBuffer 转为 hex 字符串
    var hexArr = Array.prototype.slice.call(new Uint8Array(signature));
    return hexArr.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  });
}

// 同步版本（用于 verifyApiResponse，但 verifyApiResponse 改为异步）
// 实际上我们让 verifyApiResponse 也返回 Promise
function verifyApiResponse(data) {
  if (!data || window._signingKey === 'offline' || !window._signingKey) {
    return Promise.resolve(true);
  }
  var sig = data._sig;
  var ts = data._ts;
  if (!sig || !ts) {
    return Promise.resolve(true);
  }
  if (Math.abs(Date.now() / 1000 - ts) > 300) {
    return Promise.resolve(false);
  }
  var copy = {};
  for (var k in data) {
    if (k !== '_sig' && k !== '_ts' && data.hasOwnProperty(k)) {
      copy[k] = data[k];
    }
  }
  copy._ts = ts;
  var raw = JSON.stringify(copy, Object.keys(copy).sort());
  return hmacSha256(raw, window._signingKey).then(function(expected) {
    return expected === sig;
  });
}

function safeApiFetch(url, options) {
  // 安全的 API 请求：获取签名密钥后验证响应
  var fetchOpts = options || {};
  fetchOpts.headers = fetchOpts.headers || { 'Content-Type': 'application/json' };
  if (!fetchOpts.headers['Content-Type']) {
    fetchOpts.headers['Content-Type'] = 'application/json';
  }
  // 先尝试获取签名密钥（如果失败则跳过签名验证，直接发请求）
  return fetchSigningKey().then(function(key) {
    if (key === 'offline') {
      // 签名密钥获取失败（后端未升级或CORS问题），直接发请求，跳过签名验证
      return fetch(url, fetchOpts).then(function(r) {
        var ct = r.headers.get('content-type') || '';
        if (ct.indexOf('text/html') !== -1) throw new Error('API不可用');
        return r.json();
      });
    }
    return fetch(url, fetchOpts);
  }).then(function(r) {
    // key !== 'offline' 时才需要检查 content-type（上面的分支已处理）
    var ct = r.headers.get('content-type') || '';
    if (ct.indexOf('text/html') !== -1) throw new Error('API不可用');
    return r.json();
  }).then(function(data) {
    return verifyApiResponse(data).then(function(valid) {
      if (!valid) {
        throw new Error('响应签名验证失败，可能被篡改');
      }
      return data;
    });
  });
}
// ==================== 安全加固结束 ====================