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
    // /api/pubkey 不存在（后端未升级）时，直接进入离线模式（不阻塞其他API）
    console.warn('[HMAC] 获取签名密钥失败，进入离线模式:', err.message || err);
    window._signingKey = 'offline';
    return 'offline';
  });
  return window._signingKeyPromise;
}

function hmacSha256(message, secret) {
  // 纯JS HMAC-SHA256 实现
  function sha256(msg) {
    function rShift(n, b) { return (n >>> b) | (n << (32 - b)); }
    function toHex(n) { for (var h='', i=7; i>=0; i--) { var v = (n >>> (i*4)) & 0xf; h += v.toString(16); } return h; }
    var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
             0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
             0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
             0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
             0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
             0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
             0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
             0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var M = [], l = msg.length * 8, i;
    for (i=0; i<msg.length; i++) M[i>>2] |= (msg.charCodeAt(i) & 0xff) << (24 - (i%4)*8);
    M[i>>2] |= 0x80 << (24 - (i%4)*8);
    M[((l+64>>9)<<4)+15] = l;
    for (var b=0; b<M.length; b+=16) {
      var W = M.slice(b, b+16);
      for (var t=16; t<64; t++) {
        var s0 = rShift(W[t-15], 7) ^ rShift(W[t-15], 18) ^ (W[t-15] >>> 3);
        var s1 = rShift(W[t-2], 17) ^ rShift(W[t-2], 19) ^ (W[t-2] >>> 10);
        W[t] = (W[t-16] + s0 + W[t-7] + s1) | 0;
      }
      var a = H[0], b2 = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t=0; t<64; t++) {
        var S1 = rShift(e, 6) ^ rShift(e, 11) ^ rShift(e, 25);
        var ch = (e & f) ^ ((~e) & g);
        var temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
        var S0 = rShift(a, 2) ^ rShift(a, 13) ^ rShift(a, 22);
        var maj = (a & b2) ^ (a & c) ^ (b2 & c);
        var temp2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + temp1) | 0; d = c; c = b2; b2 = a; a = (temp1 + temp2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b2) | 0; H[2] = (H[2] + c) | 0;
      H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0;
      H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var result = '';
    for (i=0; i<8; i++) result += toHex(H[i]);
    return result;
  }
  function hmacInner(key, msg) {
    var keyBytes = [];
    if (key.length > 64) {
      key = sha256(key);
      for (var i=0; i<32; i++) keyBytes.push(parseInt(key.substr(i*2,2),16));
    } else {
      for (var i=0; i<key.length; i++) keyBytes.push(key.charCodeAt(i));
    }
    while (keyBytes.length < 64) keyBytes.push(0);
    var oPad = [], iPad = [];
    for (var i=0; i<64; i++) { oPad.push(keyBytes[i] ^ 0x5c); iPad.push(keyBytes[i] ^ 0x36); }
    var innerMsg = '';
    for (var i=0; i<64; i++) innerMsg += String.fromCharCode(iPad[i]);
    innerMsg += msg;
    var innerHash = sha256(innerMsg);
    var outerMsg = '';
    for (var i=0; i<64; i++) outerMsg += String.fromCharCode(oPad[i]);
    outerMsg += innerHash;
    return sha256(outerMsg);
  }
  return hmacInner(secret, message);
}

function verifyApiResponse(data) {
  // 验证 HMAC 签名
  if (!data || window._signingKey === 'offline' || !window._signingKey) {
    return true; // 离线模式跳过验证
  }
  var sig = data._sig;
  var ts = data._ts;
  // 如果响应缺少签名字段，说明后端未升级，容错放行
  if (!sig || !ts) {
    return true; // 兼容老后端（无签名版本）
  }
  // 检查时间戳是否在 5 分钟内
  if (Math.abs(Date.now() / 1000 - ts) > 300) {
    return false; // 签名过期
  }
  // 重建签名用的 JSON 字符串（按 key 排序，无空格）
  var copy = {};
  for (var k in data) {
    if (k !== '_sig' && k !== '_ts' && data.hasOwnProperty(k)) {
      copy[k] = data[k];
    }
  }
  copy._ts = ts;
  var raw = JSON.stringify(copy, Object.keys(copy).sort());
  // Python json.dumps(sort_keys=True) 输出的 key 顺序和 JS JSON.stringify 排序后一致
  // 但分隔符可能不同：Python默认有冒号后空格": "，JS没有":"
  // 统一为无空格格式（与后端 sign_response 保持一致）
  var expected = hmacSha256(raw, window._signingKey);
  return expected === sig;
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
    if (!verifyApiResponse(data)) {
      throw new Error('响应签名验证失败，可能被篡改');
    }
    return data;
  });
}
// ==================== 安全加固结束 ====================