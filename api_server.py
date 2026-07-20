from flask import Flask, request, jsonify, send_from_directory, Response
import json, os, secrets, time, re, threading, shutil, hmac, hashlib
from werkzeug.security import generate_password_hash, check_password_hash

# ============================================================
# 护眼精灵 Pro 后端服务 v2.0
# 核心规则：一个手机号只能绑定一个激活码
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, 'codes.json')
USAGE_FILE = os.path.join(BASE_DIR, 'usage_tracking.json')
LOG_FILE = os.path.join(BASE_DIR, 'audit.log')
DEFAULT_PASSWORD = 'lxx218360lxx'

# ============================================================
# 自动同步前端文件（从 GitHub 拉取最新版本，每次启动时执行）
# ============================================================
WWW_DIR = os.path.join(BASE_DIR, 'www')
if not os.path.isdir(WWW_DIR):
    os.makedirs(WWW_DIR, exist_ok=True)

GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/LXX218360/eye-guard-web/main/'
FRONTEND_FILES = ['app.js', 'index.html', 'style.css', 'hmac-security.js']

def _sync_frontend_from_github():
    """启动时从 GitHub 同步最新前端文件（通过版本号判断是否需要更新）"""
    import urllib.request
    for fname in FRONTEND_FILES:
        try:
            url = GITHUB_RAW_BASE + fname
            local_path = os.path.join(BASE_DIR, fname)
            # 下载远程文件
            req = urllib.request.Request(url, headers={'User-Agent': 'EyeGuard-Sync'})
            with urllib.request.urlopen(req, timeout=30) as resp:
                content = resp.read()
            remote_size = len(content)
            # 读取本地文件前500字节检查版本号
            need_update = not os.path.exists(local_path)
            if not need_update:
                try:
                    with open(local_path, 'rb') as f:
                        local_head = f.read(500).decode('utf-8', errors='ignore')
                    remote_head = content[:500].decode('utf-8', errors='ignore')
                    # 比较 Version: 行
                    import re
                    local_ver = re.search(r'Version:\s*([\d-]+v\d+)', local_head)
                    remote_ver = re.search(r'Version:\s*([\d-]+v\d+)', remote_head)
                    if remote_ver and local_ver:
                        need_update = remote_ver.group(1) > local_ver.group(1)
                    elif remote_ver and not local_ver:
                        need_update = True  # 远程有版本号，本地没有
                except:
                    need_update = True  # 解析失败，强制更新
            if need_update:
                with open(local_path, 'wb') as f:
                    f.write(content)
                www_path = os.path.join(WWW_DIR, fname)
                with open(www_path, 'wb') as f:
                    f.write(content)
                print(f'[同步] {fname}: 已更新 ({remote_size}B)')
            else:
                print(f'[同步] {fname}: 已是最新')
        except Exception as e:
            print(f'[同步] {fname}: 跳过 ({str(e)[:60]})')

# 在后台线程中执行同步（不阻塞启动）
threading.Thread(target=_sync_frontend_from_github, daemon=True).start()

PLAN_CONFIG = {
    'week':     {'label': '周卡', 'days': 7},
    'month':    {'label': '月卡', 'days': 30},
    'year':     {'label': '年卡', 'days': 365},
    'lifetime': {'label': '终身', 'days': 36500},
}

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024

_db_lock = threading.RLock()

# ============================================================
# CORS + OPTIONS preflight（解决 GitHub Pages 跨域问题）
# ============================================================

ALLOWED_ORIGINS = [
    'https://18073951649.pythonanywhere.com',
    'https://lxx218360.github.io',
    'http://localhost',
    'https://localhost',
    'null',
]

@app.before_request
def handle_options():
    """自动处理所有路由的 OPTIONS preflight 请求"""
    if request.method == 'OPTIONS':
        resp = Response('', status=204)
        origin = request.headers.get('Origin', '')
        if origin in ALLOWED_ORIGINS or origin.startswith('http://localhost') or origin.startswith('https://localhost'):
            resp.headers['Access-Control-Allow-Origin'] = origin
        else:
            resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        resp.headers['Access-Control-Max-Age'] = '86400'
        return resp

@app.after_request
def add_cors_and_sign(resp):
    origin = request.headers.get('Origin', '')
    if origin in ALLOWED_ORIGINS or origin.startswith('http://localhost') or origin.startswith('https://localhost'):
        resp.headers['Access-Control-Allow-Origin'] = origin
    else:
        resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    resp.headers['Access-Control-Max-Age'] = '86400'

    # 自动对 JSON 响应添加 HMAC 签名，并确保序列化格式与签名一致（无空格分隔符）
    if resp.content_type and resp.content_type.startswith('application/json'):
        try:
            body = resp.get_data(as_text=True)
            data = json.loads(body)
            path = request.path if hasattr(request, 'path') else ''
            if '/api/pubkey' not in path:
                if '_sig' not in data:
                    data = sign_response(data)
                # 无论签名是刚生成还是已有，都强制用无空格分隔符重新序列化
                # 确保实际输出与 sign_response 签名时使用的格式一致
                new_body = json.dumps(data, ensure_ascii=False, default=str, sort_keys=True, separators=(',', ':'))
                resp.set_data(new_body)
                resp.headers['Content-Type'] = 'application/json; charset=utf-8'
        except Exception:
            pass
    return resp

# ============================================================
# 工具函数
# ============================================================

_rate_limits = {}
_rate_lock = threading.Lock()

def rate_limit_check(key, max_requests=30, window_seconds=60):
    with _rate_lock:
        now = time.time()
        if key not in _rate_limits:
            _rate_limits[key] = []
        _rate_limits[key] = [t for t in _rate_limits[key] if now - t < window_seconds]
        if len(_rate_limits[key]) >= max_requests:
            return False
        _rate_limits[key].append(now)
        return True

def is_valid_phone(phone):
    return bool(phone and re.match(r'^1[3-9]\d{9}$', phone))

def get_client_ip():
    xff = request.headers.get('X-Forwarded-For', '')
    if xff:
        return xff.split(',')[0].strip()
    return request.remote_addr or 'unknown'

def audit_log(action, detail=''):
    try:
        ts = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
        line = f"[{ts}] [{get_client_ip()}] {action} | {detail}\n"
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(line)
    except Exception:
        pass

# ============================================================
# 原子文件操作
# ============================================================

def atomic_write_json(filepath, data, indent=2):
    tmp = filepath + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)
    os.replace(tmp, filepath)

def backup_file(filepath):
    if os.path.exists(filepath):
        ts = time.strftime('%Y%m%d%H%M%S')
        bak = filepath + f'.bak.{ts}'
        shutil.copy2(filepath, bak)
        try:
            dirname = os.path.dirname(filepath) or '.'
            basename = os.path.basename(filepath)
            baks = sorted([f for f in os.listdir(dirname) if f.startswith(basename + '.bak.')], reverse=True)
            for old in baks[3:]:
                os.remove(os.path.join(dirname, old))
        except Exception:
            pass

def load_db():
    with _db_lock:
        if os.path.exists(DB_FILE):
            try:
                with open(DB_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                dirname = os.path.dirname(DB_FILE) or '.'
                basename = os.path.basename(DB_FILE)
                baks = sorted([f for f in os.listdir(dirname) if f.startswith(basename + '.bak.')], reverse=True)
                for bak_name in baks:
                    try:
                        with open(os.path.join(dirname, bak_name), 'r', encoding='utf-8') as f:
                            return json.load(f)
                    except Exception:
                        continue
                return {}
        return {}

def save_db(db):
    with _db_lock:
        backup_file(DB_FILE)
        atomic_write_json(DB_FILE, db)

def load_usage():
    with _db_lock:
        if os.path.exists(USAGE_FILE):
            try:
                with open(USAGE_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

def save_usage(data):
    with _db_lock:
        backup_file(USAGE_FILE)
        atomic_write_json(USAGE_FILE, data)

# ============================================================
# 密码管理（bcrypt 哈希，兼容旧版明文）
# ============================================================

def hash_password(pw):
    return generate_password_hash(pw, method='pbkdf2:sha256', salt_length=16)

def get_admin_password_hash():
    with _db_lock:
        db = load_db.__wrapped__() if hasattr(load_db, '__wrapped__') else _load_db_raw()
        return db.get('_config', {}).get('admin_password', DEFAULT_PASSWORD)

def _load_db_raw():
    """不加锁的内部 load_db，供 get_admin_password_hash 等已持锁场景调用"""
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def set_admin_password(new_pw):
    db = load_db()
    if '_config' not in db:
        db['_config'] = {}
    db['_config']['admin_password'] = hash_password(new_pw)
    save_db(db)

def check_password(pw):
    stored = get_admin_password_hash()
    if stored == pw:
        set_admin_password(pw)
        return True
    if stored.startswith('pbkdf2:'):
        return check_password_hash(stored, pw)
    return False

# ============================================================
# 激活码生成
# ============================================================

def generate_code(plan_type='month'):
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    suffix = ''.join(secrets.choice(chars) for _ in range(6))
    part2 = ''.join(secrets.choice(chars) for _ in range(4))
    return f'EYE-{suffix}-{part2}'

# ============================================================
# 时区统一（UTC+8）
# ============================================================

def get_today_utc8():
    return time.strftime('%Y-%m-%d', time.localtime(time.time() + 8 * 3600))

# ============================================================
# HMAC 签名
# ============================================================

def get_or_create_signing_key():
    db = load_db()
    if '_config' not in db:
        db['_config'] = {}
    key = db['_config'].get('signing_key', '')
    if not key or len(key) < 32:
        key = secrets.token_hex(32)
        db['_config']['signing_key'] = key
        save_db(db)
    return key

def _normalize_for_sign(data):
    """规范化数值，确保 Python 和 JS 的 JSON 序列化一致
    Python json.dumps(30.0) => "30.0"，但 JS JSON.stringify(30.0) => "30"
    统一：整数去 .0，非整数保留
    """
    if isinstance(data, dict):
        return {k: _normalize_for_sign(v) for k, v in data.items()}
    if isinstance(data, list):
        return [_normalize_for_sign(v) for v in data]
    if isinstance(data, float):
        if data == int(data):
            return int(data)
        # 限制小数位数到 10 位（避免浮点精度差异）
        return round(data, 10)
    return data

def sign_response(data):
    key = get_or_create_signing_key()
    ts = int(time.time())
    data['_ts'] = ts
    # 规范化数值后再签名，确保前后端 JSON 一致
    data = _normalize_for_sign(data)
    raw = json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
    sig = hmac.new(key.encode('utf-8'), raw.encode('utf-8'), hashlib.sha256).hexdigest()
    data['_sig'] = sig
    return data

def api_ok(data=None):
    if data is None:
        data = {'success': True}
    elif isinstance(data, dict) and 'success' not in data:
        data['success'] = True
    return jsonify(sign_response(data))

def api_err(msg, status=400):
    return jsonify(sign_response({'success': False, 'msg': msg})), status

FREE_DAILY_SECONDS = 300

# ============================================================
# 静态页面路由
# ============================================================

@app.route('/seller')
@app.route('/seller/')
def seller_panel():
    for fname in ['seller.html']:
        fpath = os.path.join(BASE_DIR, fname)
        if os.path.exists(fpath):
            return send_from_directory(BASE_DIR, fname)
    return '<h1>页面未找到</h1>', 404

# ============================================================
# 前端静态文件（PythonAnywhere 部署：前后端同域）
# 优先从 www/ 子目录找，回退到 BASE_DIR 根目录
# ============================================================

def _find_static_file(filename):
    """按优先级查找静态文件：www/ > BASE_DIR/
    返回 (fpath, search_dir, actual_name) 其中 actual_name 是磁盘上实际匹配的文件名
    """
    # 中文文件名兼容映射（PythonAnywhere 可能自动翻译扩展名）
    name_aliases = {
        'face_landmarker.task': ['face_landmarker.task', 'face_landmarker.任务'],
    }
    candidates = name_aliases.get(filename, [filename])
    for search_dir in [WWW_DIR, BASE_DIR]:
        for name in candidates:
            fpath = os.path.join(search_dir, name)
            if os.path.exists(fpath) and os.path.isfile(fpath):
                return fpath, search_dir, name
    return None, None, None

# ============================================================
# API：HMAC 签名公钥（前端验证响应完整性）
# ============================================================

@app.route('/api/pubkey', methods=['GET', 'POST'])
def api_pubkey():
    key = get_or_create_signing_key()
    return jsonify(sign_response({'key': key}))

# ============================================================
# API：服务端 Pro 校验
# ============================================================

@app.route('/api/pro_check', methods=['POST'])
def api_pro_check():
    data = request.get_json() or {}
    if not rate_limit_check(get_client_ip() + '_pro', 10, 60):
        return jsonify(sign_response({'valid': False, 'msg': '操作太频繁'})), 429

    code = data.get('code', '').strip().upper()
    phone = data.get('phone', '').strip()

    if not code or not phone:
        return jsonify(sign_response({'valid': False, 'msg': '参数缺失'})), 400

    db = load_db()
    if code not in db or code.startswith('_'):
        return jsonify(sign_response({'valid': False, 'msg': '激活码无效'}))

    rec = db[code]
    if not rec['used']:
        return jsonify(sign_response({'valid': False, 'msg': '激活码未激活'}))
    if rec.get('phone') != phone:
        return jsonify(sign_response({'valid': False, 'msg': '手机号不匹配'}))

    membership = _calc_membership(db, phone)
    is_pro = (membership['remaining_days'] > 0 or rec['plan'] == 'lifetime')
    if rec['plan'] == 'lifetime':
        membership['remaining_days'] = 99999
        membership['remaining_seconds'] = 99999 * 86400

    return jsonify(sign_response({
        'valid': True, 'is_pro': is_pro, 'plan': rec['plan'],
        'phone': rec.get('phone', ''),
        'remaining_days': membership['remaining_days'],
        'remaining_seconds': membership['remaining_seconds'],
        'expires_at': membership['expires_at'],
        'total_codes': membership['total_codes'],
        'active_codes_count': membership['active_codes_count']
    }))

# ============================================================
# API：激活码生成
# ============================================================

@app.route('/api/generate', methods=['POST'])
def api_generate():
    data = request.get_json() or {}
    if not rate_limit_check(get_client_ip() + '_gen', 10, 60):
        return jsonify({'success': False, 'msg': '操作太频繁，请稍后再试'}), 429
    if not check_password(data.get('password', '')):
        return jsonify({'success': False, 'msg': '密码错误'}), 403

    plan = data.get('plan', 'month')
    if plan not in PLAN_CONFIG:
        return jsonify({'success': False, 'msg': '无效的套餐类型'}), 400

    try:
        count = max(1, min(int(data.get('count', 1)), 50))
    except (ValueError, TypeError):
        return jsonify({'success': False, 'msg': '数量必须是数字'}), 400

    phone = data.get('phone', '')
    if phone and not is_valid_phone(phone):
        return jsonify({'success': False, 'msg': '手机号格式不正确'}), 400

    with _db_lock:  # 持有锁完成整个读-生成-写周期，防止激活码冲突
        db = load_db()
        config = db.get('_config', {})
        codes_db = {k: v for k, v in db.items() if not k.startswith('_')}
        codes = []
        max_attempts = count * 100
        attempts = 0
        for _ in range(count):
            code = generate_code(plan)
            attempts += 1
            while code in codes_db and attempts < max_attempts:
                code = generate_code(plan)
                attempts += 1
            if attempts >= max_attempts:
                return jsonify({'success': False, 'msg': '激活码空间不足'}), 500
            codes_db[code] = {
                'plan': plan, 'phone': phone or '', 'used': False, 'created_at': time.time()
            }
            codes.append(code)
        codes_db['_config'] = config
        save_db(codes_db)
    audit_log('生成激活码', f'plan={plan}, count={count}, by={get_client_ip()}')
    return jsonify({'success': True, 'codes': codes})

# ============================================================
# API：激活（一个手机号只能绑定一个激活码）
# ============================================================

@app.route('/api/activate', methods=['POST'])
def api_activate():
    data = request.get_json() or {}
    if not rate_limit_check(get_client_ip() + '_act', 10, 60):
        return jsonify({'success': False, 'msg': '操作太频繁'}), 429

    code = data.get('code', '').strip().upper()
    phone = data.get('phone', '').strip()

    if not code or not phone:
        return jsonify({'success': False, 'msg': '参数缺失'}), 400
    if not is_valid_phone(phone):
        return jsonify({'success': False, 'msg': '手机号格式不正确'}), 400

    with _db_lock:  # 持有锁完成整个读-检查-写周期，防止并发激活同一手机号
        db = load_db()
        if code not in db or code.startswith('_'):
            return jsonify({'success': False, 'msg': '激活码无效'})

        rec = db[code]

        if rec.get('phone') and rec['phone'] != phone:
            return jsonify({'success': False, 'msg': '该激活码与手机号不匹配'})

        if rec['used']:
            if rec.get('phone') == phone:
                result = _calc_membership(db, phone)
                result['success'] = True
                result['msg'] = '该手机号已激活'
                result['plan'] = rec['plan']
                return jsonify(result)
            return jsonify({'success': False, 'msg': '该激活码已被其他手机号绑定'})

        for c, r in db.items():
            if c == code or c.startswith('_'):
                continue
            if r.get('used') and r.get('phone') == phone:
                return jsonify({'success': False, 'msg': '该手机号已绑定其他激活码，一个手机号只能绑定一个'})

        rec['used'] = True
        rec['phone'] = phone
        rec['activated_at'] = time.time()
        save_db(db)

    audit_log('激活', f'code={code}, phone={phone}, plan={rec["plan"]}')

    db = load_db()
    result = _calc_membership(db, phone)
    result['success'] = True
    result['msg'] = '激活成功'
    result['plan'] = rec['plan']
    result['is_renewal'] = result.get('total_codes', 1) > 1
    return jsonify(result)

# ============================================================
# 会员叠加计算
# ============================================================

def _calc_membership(db, phone):
    total_remaining_seconds = 0
    active_codes = []
    all_codes = []
    now = time.time()
    for c, r in db.items():
        if c.startswith('_') or not r.get('used') or r.get('phone') != phone:
            continue
        all_codes.append(c)
        if r['plan'] == 'lifetime':
            total_remaining_seconds += PLAN_CONFIG['lifetime']['days'] * 86400
            active_codes.append(c)
        else:
            days = PLAN_CONFIG.get(r['plan'], {}).get('days', 30)
            a_at = r.get('activated_at', 0)
            if a_at:
                expire = a_at + days * 86400
                remain = expire - now
                if remain > 0:
                    total_remaining_seconds += remain
                    active_codes.append(c)

    return {
        'remaining_days': round(total_remaining_seconds / 86400, 1),
        'remaining_seconds': int(total_remaining_seconds),
        'total_codes': len(all_codes),
        'active_codes': active_codes,
        'active_codes_count': len(active_codes),
        'expires_at': now + total_remaining_seconds
    }

# ============================================================
# API：验证激活码
# ============================================================

@app.route('/api/verify', methods=['POST'])
def api_verify():
    data = request.get_json() or {}
    code = data.get('code', '').strip().upper()
    phone = data.get('phone', '').strip()

    if not code:
        return jsonify({'valid': False})

    db = load_db()
    if code not in db or code.startswith('_'):
        return jsonify({'valid': False, 'msg': '激活码不存在'})

    rec = db[code]
    if not rec['used']:
        return jsonify({'valid': False, 'msg': '激活码未激活'})
    if phone and rec.get('phone') != phone:
        return jsonify({'valid': False, 'msg': '手机号不匹配'})

    plan = rec['plan']
    activated_at = rec.get('activated_at', 0)
    result = _calc_membership(db, rec.get('phone', ''))

    return jsonify({
        'valid': True, 'plan': plan, 'phone': rec.get('phone', ''),
        'activated_at': activated_at,
        'remaining_days': result['remaining_days'],
        'remaining_seconds': result['remaining_seconds'],
        'total_codes': result['total_codes'],
        'active_codes': result['active_codes'],
        'active_codes_count': result['active_codes_count'],
        'expires_at': result['expires_at']
    })

# ============================================================
# API：激活码列表（管理面板）
# ============================================================

@app.route('/api/list', methods=['POST'])
def api_list():
    data = request.get_json() or {}
    if not check_password(data.get('password', '')):
        return jsonify({'success': False, 'msg': '密码错误'}), 403

    db = load_db()
    codes = {}
    now = time.time()
    for k, v in db.items():
        if k.startswith('_'):
            continue
        codes[k] = dict(v)
        if v.get('used') and v['plan'] != 'lifetime':
            days = PLAN_CONFIG.get(v['plan'], {}).get('days', 30)
            a_at = v.get('activated_at', 0)
            if a_at:
                expire = a_at + days * 86400
                codes[k]['expires_at'] = expire
                codes[k]['remaining_days'] = round(max(0, (expire - now) / 86400), 1)
            else:
                codes[k]['remaining_days'] = 0
        elif v.get('used') and v['plan'] == 'lifetime':
            codes[k]['remaining_days'] = 99999
        else:
            codes[k]['remaining_days'] = None
    return jsonify({'success': True, 'codes': codes})

# ============================================================
# API：删除激活码
# ============================================================

@app.route('/api/delete_code', methods=['POST'])
def api_delete_code():
    data = request.get_json() or {}
    if not check_password(data.get('password', '')):
        return jsonify({'success': False, 'msg': '密码错误'}), 403

    code = data.get('code', '').strip().upper()
    with _db_lock:
        db = load_db()
        if code in db and not code.startswith('_'):
            phone = db[code].get('phone', '')
            del db[code]
            save_db(db)
        else:
            return jsonify({'success': False, 'msg': '激活码不存在'})
    audit_log('删除激活码', f'code={code}, phone={phone}, by={get_client_ip()}')
    return jsonify({'success': True, 'msg': '已删除'})

# ============================================================
# API：撤销激活码
# ============================================================

@app.route('/api/revoke_code', methods=['POST'])
def api_revoke_code():
    data = request.get_json() or {}
    if not check_password(data.get('password', '')):
        return jsonify({'success': False, 'msg': '密码错误'}), 403

    code = data.get('code', '').strip().upper()
    with _db_lock:
        db = load_db()
        if code not in db or code.startswith('_'):
            return jsonify({'success': False, 'msg': '激活码不存在'})

        rec = db[code]
        if not rec['used']:
            return jsonify({'success': False, 'msg': '该激活码未被激活'})

        rec['used'] = False
        rec['phone'] = ''
        rec.pop('activated_at', None)
        rec['revoked_at'] = time.time()
        save_db(db)
    audit_log('撤销激活码', f'code={code}, by={get_client_ip()}')
    return jsonify({'success': True, 'msg': '已撤销'})

# ============================================================
# API：修复激活码（修改套餐）
# ============================================================

@app.route('/api/fix_code', methods=['POST'])
def api_fix_code():
    data = request.get_json() or {}
    if not check_password(data.get('password', '')):
        return jsonify({'success': False, 'msg': '密码错误'}), 403

    code = data.get('code', '').strip().upper()
    new_plan = data.get('plan', '')
    if not code or new_plan not in PLAN_CONFIG:
        return jsonify({'success': False, 'msg': '参数无效'}), 400

    with _db_lock:
        db = load_db()
        if code not in db or code.startswith('_'):
            return jsonify({'success': False, 'msg': '激活码不存在'})

        db[code]['plan'] = new_plan
        save_db(db)
    audit_log('修改套餐', f'code={code}, new_plan={new_plan}, by={get_client_ip()}')
    return jsonify({'success': True, 'msg': f'已修改为{PLAN_CONFIG[new_plan]["label"]}'})

# ============================================================
# API：校准
# ============================================================

@app.route('/api/calibrate', methods=['POST'])
def api_calibrate():
    data = request.get_json() or {}
    if not check_password(data.get('password', '')):
        return jsonify({'success': False, 'msg': '密码错误'}), 403

    db = load_db()
    issues = []
    checked = 0
    now = time.time()
    for code, rec in db.items():
        if code.startswith('_'):
            continue
        checked += 1
        if rec.get('used'):
            if rec['plan'] in ('month', 'year', 'week'):
                days = PLAN_CONFIG.get(rec['plan'], {}).get('days', 30)
                if rec.get('activated_at') and now > rec['activated_at'] + days * 86400:
                    issues.append({'code': code, 'description': '已过期',
                        'plan_name': PLAN_CONFIG.get(rec['plan'], {}).get('label', rec['plan']),
                        'phone': rec.get('phone', '')})
        if rec.get('revoked_at'):
            issues.append({'code': code, 'description': '已撤销',
                'plan_name': PLAN_CONFIG.get(rec['plan'], {}).get('label', rec['plan']),
                'phone': rec.get('phone', '')})
        if rec.get('phone') and not is_valid_phone(rec['phone']):
            issues.append({'code': code, 'description': '手机号格式异常',
                'plan_name': PLAN_CONFIG.get(rec['plan'], {}).get('label', rec['plan']),
                'phone': rec.get('phone', '')})

    return jsonify({'success': True, 'msg': '校准完成', 'report': {'checked': checked, 'issues': issues}})

# ============================================================
# API：用户列表
# ============================================================

@app.route('/api/users', methods=['POST'])
def api_users():
    data = request.get_json() or {}
    if not check_password(data.get('password', '')):
        return jsonify({'success': False, 'msg': '密码错误'}), 403

    db = load_db()
    phones = {}
    now = time.time()
    for code, rec in db.items():
        if code.startswith('_') or not rec.get('used'):
            continue
        phone = rec.get('phone', '')
        if not phone:
            continue
        if phone not in phones:
            phones[phone] = {'codes': [], 'membership': {}}
        days = PLAN_CONFIG.get(rec['plan'], {}).get('days', 0)
        activated_at = rec.get('activated_at', 0)
        expire = activated_at + days * 86400
        remaining = max(0, (expire - now) / 86400) if days < 36500 else 99999
        plan_label = PLAN_CONFIG.get(rec['plan'], {}).get('label', rec['plan'])
        phones[phone]['codes'].append({
            'code': code, 'plan': rec['plan'], 'plan_name': plan_label,
            'used': True, 'activated_at': activated_at,
            'expires_at': expire, 'remaining_days': round(remaining, 1)
        })

    for phone, info in phones.items():
        codes = info['codes']
        active = [c for c in codes if c['remaining_days'] > 0]
        if active:
            earliest = min(c['activated_at'] for c in active)
            latest_end = max(c['expires_at'] for c in active)
            total_rem = sum(c['remaining_days'] for c in active)
            info['membership'] = {
                'valid': True, 'remaining_days': round(total_rem, 1),
                'earliest_start': earliest, 'end_time': latest_end,
                'active_codes': [c['code'] for c in active]
            }
        else:
            info['membership'] = {
                'valid': False, 'remaining_days': 0,
                'earliest_start': None, 'end_time': None, 'active_codes': []
            }

    return jsonify({'success': True, 'phones': phones})

# ============================================================
# API：查询激活码状态
# ============================================================

@app.route('/api/check', methods=['POST'])
def api_check():
    data = request.get_json() or {}
    code = data.get('code', '').strip().upper()
    db = load_db()
    if code in db and not code.startswith('_'):
        rec = db[code]
        phone = rec.get('phone', '')
        if rec.get('used') and phone and len(phone) == 11:
            phone = phone[:3] + '****' + phone[7:]
        return jsonify({'exists': True, 'used': rec['used'], 'plan': rec['plan'], 'phone': phone})
    return jsonify({'exists': False})

# ============================================================
# API：修改密码
# ============================================================

@app.route('/api/change_password', methods=['POST'])
def api_change_password():
    data = request.get_json() or {}
    if not rate_limit_check(get_client_ip() + '_chpw', 5, 60):
        return jsonify({'success': False, 'msg': '操作太频繁'}), 429

    old_pw = data.get('old_password', '')
    new_pw = data.get('new_password', '')
    if not check_password(old_pw):
        return jsonify({'success': False, 'msg': '当前密码错误'}), 403
    if not new_pw or len(new_pw) < 6:
        return jsonify({'success': False, 'msg': '新密码至少6位'}), 400

    set_admin_password(new_pw)
    audit_log('修改密码', f'by={get_client_ip()}')
    return jsonify({'success': True, 'msg': '密码修改成功'})

# ============================================================
# API：健康检查
# ============================================================

@app.route('/api/health', methods=['GET'])
def api_health():
    return jsonify({'status': 'ok', 'time': time.time()})

# ============================================================
# 管理接口：从 GitHub 同步最新前端文件（免手动上传）
# ============================================================

@app.route('/admin/update', methods=['GET', 'POST'])
def admin_update():
    """从 GitHub 仓库同步最新前端文件到 PythonAnywhere
    访问 https://18073951649.pythonanywhere.com/admin/update 即可触发
    """
    import urllib.request
    password = request.args.get('pwd') or (request.get_json() or {}).get('pwd', '')
    if not check_password(password):
        return jsonify({'error': '需要密码'}), 403

    # 支持直接上传：POST JSON body 中带 files 字段，绕过 CDN 缓存
    body = request.get_json(silent=True) or {}
    if body.get('direct'):
        results = {}
        for fname, content_b64 in body.get('files', {}).items():
            try:
                import base64
                content = base64.b64decode(content_b64)
                for target_dir in [WWW_DIR, BASE_DIR]:
                    fpath = os.path.join(target_dir, fname)
                    with open(fpath, 'wb') as f:
                        f.write(content)
                results[fname] = f'OK ({len(content)} bytes)'
            except Exception as e:
                results[fname] = f'FAIL: {str(e)[:100]}'
        return jsonify({'success': True, 'results': results})

    # GitHub 仓库中的前端文件（通过 jsdelivr CDN 代理，国内可访问）
    base_url = 'https://cdn.jsdelivr.net/gh/LXX218360/eye-guard-web@main/'
    files_to_sync = ['app.js', 'index.html', 'style.css', 'hmac-security.js']
    results = {}
    for fname in files_to_sync:
        try:
            url = base_url + fname
            req = urllib.request.Request(url, headers={'User-Agent': 'PythonAnywhere-Update'})
            with urllib.request.urlopen(req, timeout=60) as resp:
                content = resp.read()
            # 同时写入 www/ 和根目录（兼容两种查找逻辑）
            for target_dir in [WWW_DIR, BASE_DIR]:
                fpath = os.path.join(target_dir, fname)
                with open(fpath, 'wb') as f:
                    f.write(content)
            results[fname] = f'OK ({len(content)} bytes)'
        except Exception as e:
            results[fname] = f'FAIL: {str(e)[:100]}'
    return jsonify({'success': True, 'results': results})

# ============================================================
# API：免费试用时长追踪
# ============================================================

@app.route('/api/free_usage', methods=['POST'])
def api_free_usage():
    data = request.get_json() or {}
    phone = data.get('phone', '').strip()
    if not phone:
        phone = data.get('device_fp', '').strip()

    if not phone:
        return jsonify({'success': False, 'msg': '缺少标识'}), 400

    if len(phone) == 11 and not is_valid_phone(phone):
        return jsonify({'success': False, 'msg': '手机号格式不正确'}), 400

    usage = load_usage()
    today = get_today_utc8()

    if phone not in usage:
        usage[phone] = {'total_seconds': 0, 'last_reset': today}
    elif usage[phone].get('last_reset') != today:
        usage[phone]['total_seconds'] = 0
        usage[phone]['last_reset'] = today

    action = data.get('action', 'check')
    seconds = data.get('seconds', 0)
    minutes = data.get('minutes', 0)
    if minutes and not seconds:
        seconds = int(minutes * 60)
    seconds = max(0, seconds)

    if action == 'report':
        # 重新加载以获取最新数据，减少并发丢失（完整方案需用锁）
        usage = load_usage()
        if phone in usage and usage[phone].get('last_reset') == today:
            usage[phone]['total_seconds'] = max(0, usage[phone].get('total_seconds', 0) + seconds)
        else:
            usage[phone] = {'total_seconds': seconds, 'last_reset': today}
        save_usage(usage)
        remaining = max(0, FREE_DAILY_SECONDS - usage[phone]['total_seconds'])
        return jsonify({
            'success': True,
            'used_today': usage[phone]['total_seconds'],
            'used_minutes': round(usage[phone]['total_seconds'] / 60, 1),
            'remaining_today': remaining,
            'remaining_minutes': round(remaining / 60, 1),
            'limit': FREE_DAILY_SECONDS
        })
    else:
        remaining = max(0, FREE_DAILY_SECONDS - usage[phone].get('total_seconds', 0))
        return jsonify({
            'success': True,
            'used_today': usage[phone].get('total_seconds', 0),
            'used_minutes': round(usage[phone].get('total_seconds', 0) / 60, 1),
            'remaining_today': remaining,
            'remaining_minutes': round(remaining / 60, 1),
            'limit': FREE_DAILY_SECONDS
        })

# ============================================================
# 前端静态文件（必须放在所有 /api/ 路由之后，否则会被通配符拦截）
# ============================================================

@app.route('/')
def serve_index():
    """主页面（覆盖上面的 placeholder）"""
    for fname in ['index.html', 'eye-guard-user.html', 'eye-guard-user-readonly.html']:
        fpath, sdir, actual_name = _find_static_file(fname)
        if fpath:
            try:
                resp = send_from_directory(sdir, actual_name)
                resp.headers['Cache-Control'] = 'no-cache'
                return resp
            except Exception:
                continue
    return '<h1>护眼精灵</h1><p>未找到 index.html，请上传到 Files 根目录或 www/ 子目录</p>', 404

@app.route('/<path:filename>')
def serve_static(filename):
    """提供前端静态文件（JS/CSS/HTML/模型等）"""
    fpath, sdir, actual_name = _find_static_file(filename)
    if fpath:
        try:
            resp = send_from_directory(sdir, actual_name)
            fsize = os.path.getsize(fpath)
            if fsize > 100000:
                resp.headers['Cache-Control'] = 'public, max-age=86400'
            else:
                resp.headers['Cache-Control'] = 'no-cache'
            return resp
        except Exception:
            return '<h1>404</h1><p>File not found</p>', 404
    return '<h1>404</h1><p>File not found</p>', 404

# ============================================================
# 启动
# ============================================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    db = load_db()
    if '_config' not in db:
        db['_config'] = {'admin_password': DEFAULT_PASSWORD}
        save_db(db)

    print('=' * 50)
    print('护眼精灵 Pro 后端服务 v2.0')
    print('=' * 50)
    print(f'API地址: http://0.0.0.0:{port}')
    print(f'创作者面板: http://0.0.0.0:{port}/seller')
    print(f'初始密码: {DEFAULT_PASSWORD}')
    print(f'数据库: {DB_FILE}')
    print('=' * 50)
    app.run(host='0.0.0.0', port=port, debug=False)
