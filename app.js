/* ==========================================================
     护眼精灵 - 完整功能实现
     ========================================================== */

  // ===================== 三层防盗保护 =====================
  (function() {
    // 第1层：禁用右键菜单
    document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      return false;
    }, true);
    // 第2层：禁用 F12 / Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+U
    document.addEventListener('keydown', function(e) {
      if (e.key === 'F12') { e.preventDefault(); return false; }
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) { e.preventDefault(); return false; }
      if (e.ctrlKey && e.key === 'U') { e.preventDefault(); return false; }
    }, true);
    // 第3层：DevTools检测（优化版 — 避免误判）
    (function detectDevTools() {
      const threshold = 300;            // 300px阈值，排除地址栏/书签栏/滚动条等正常差异
      let confirmCount = 0;             // 连续确认计数
      const requiredConfirmations = 3; // 需要连续3次（约6秒）才触发锁定
      let locked = false;
      const check = function() {
        const wDiff = window.outerWidth - window.innerWidth;
        const hDiff = window.outerHeight - window.innerHeight;
        const detected = (wDiff > threshold) || (hDiff > threshold);
        if (detected) {
          confirmCount++;
          if (confirmCount >= requiredConfirmations && !locked) {
            locked = true;
            document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:CONSTANTS.DEVTOOLS_BG;color:CONSTANTS.DEVTOOLS_TEXT;font-size:18px;">&#x1F6AB; 检测到开发者工具，页面已锁定</div>';
          }
        } else {
          confirmCount = 0;
          locked = false;
        }
      };
      window.addEventListener('resize', check);
      setInterval(check, 2000);
    })();
  })();

  // ===================== Mobile Detection =====================
  const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const IS_TABLET = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // ===================== 常量定义 =====================
  const CONSTANTS = {
    DEFAULT_AVATAR_GRADIENT: 'linear-gradient(135deg,#c8874d,#5a8f6a)',
    DEVTOOLS_BG: '#0a0e17',
    DEVTOOLS_TEXT: '#fff',
    PRIMARY: '#c8874d',
    SECONDARY: '#5a8f6a',
    INFO: '#6a9ec8',
    SUCCESS: '#5a8f6a',
    WARNING: '#c8c464',
    DANGER: '#c86464',
    DIST_GOOD_08: 'rgba(106,155,106,0.8)',
    DIST_GOOD_09: 'rgba(106,155,106,0.9)',
    DIST_GOOD_07: 'rgba(106,155,106,0.7)',
    DIST_GOOD_085: 'rgba(106,155,106,0.85)',
    DIST_WARN_08: 'rgba(196,148,60,0.8)',
    DIST_WARN_09: 'rgba(196,148,60,0.9)',
    DIST_WARN_07: 'rgba(196,148,60,0.7)',
    DIST_WARN_085: 'rgba(196,148,60,0.85)',
    DIST_BAD_08: 'rgba(196,78,78,0.8)',
    DIST_BAD_07: 'rgba(196,78,78,0.7)',
    DIST_BAD_085: 'rgba(196,78,78,0.85)',
    CHART_COLORS: ['#c8874d', '#5a8f6a', '#6a9ec8', '#c89a6a', '#8a6ac8', '#6ac8a8', '#c86a7a'],
    ERROR: '#e74c3c',
    WECHAT_GREEN: '#07c160',
    ALIPAY_BLUE: '#1677ff',
    GOLD: '#ffd700',
    MUTED_TEXT: '#8a8578',
    AXIS_LINE: '#d8d3c9',
    SPLIT_LINE: '#ece8e0',
    TOOLTIP_BG: 'rgba(28,37,56,0.92)',
    TOOLTIP_BORDER: '#334155',
    TOOLTIP_TEXT: '#f1f5f9',
    HINT_BG: 'rgba(200,135,77,0.1)',
    HINT_BORDER: 'rgba(200,135,77,0.3)',
    CANVAS_GREEN_05: 'rgba(16,185,129,0.5)',
    CANVAS_GREEN_07: 'rgba(16,185,129,0.7)',
    CANVAS_GREEN_03: 'rgba(106,155,106,0.3)',
    BUTTON_WARN_BG: 'rgba(196,148,60,0.8)',
    BUTTON_SUCCESS_BG: 'rgba(90,143,106,0.8)',
    BUTTON_GOOD_BG: 'rgba(106,155,106,0.8)',
    BUTTON_MUTED_BG: 'rgba(140,130,115,0.6)',
  };


  // 自动识别设备并应用对应布局
  (function() {
    const body = document.body;
    if (IS_MOBILE) body.classList.add('device-mobile');
    if (IS_TABLET) body.classList.add('device-tablet');
    if (!IS_MOBILE && !IS_TABLET) body.classList.add('device-desktop');
    // 横竖屏检测
    function updateOrientation() {
      if (window.innerWidth > window.innerHeight && IS_MOBILE) {
        body.classList.add('landscape');
        body.classList.remove('portrait');
      } else {
        body.classList.remove('landscape');
        body.classList.add('portrait');
      }
    }
    updateOrientation();
    window.addEventListener('resize', updateOrientation);
  })();

  // ===================== IndexedDB =====================
  const DB_NAME = 'EyeHealthTerminal';
  const DB_VERSION = 2;
  let db = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains('settings')) database.createObjectStore('settings', { keyPath: 'key' });
        if (!database.objectStoreNames.contains('sessions')) database.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        if (!database.objectStoreNames.contains('calibration')) database.createObjectStore('calibration', { keyPath: 'key' });
        if (!database.objectStoreNames.contains('used_codes')) database.createObjectStore('used_codes', { keyPath: 'key' });
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function dbPut(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(data);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  function dbGet(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function dbGetAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function dbClear(storeName) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  function dbCount(storeName) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // ===================== App State =====================
  const ROLE_MAP = { student:'备考学生', office:'上班族', parent:'家长', other:'其他' };
  const SCENE_PRESETS = {
    office:  { name:'办公', dist:45, distWarn:55, time:30, blink:10, blinkWarn:15 },
    reading: { name:'阅读', dist:40, distWarn:50, time:20, blink:12, blinkWarn:17 },
    gaming:  { name:'游戏', dist:55, distWarn:65, time:25, blink:8,  blinkWarn:13 },
    video:   { name:'影视', dist:80, distWarn:90, time:40, blink:15, blinkWarn:20 },
    custom:  { name:'自定义', dist:45, distWarn:55, time:30, blink:10, blinkWarn:15 }
  };

  const DEVICE_DEFS = {
    hardware:  { name:'硬件终端',     icon:'&#x1F4F7;', desc:'外接AI摄像头模块，通过USB接入电脑',     connType:'usb',    click:'usb' },
    laptop:   { name:'笔记本摄像头', icon:'&#x1F4BB;', desc:'电脑自带摄像头，调用getUserMedia',        connType:'camera', click:'camera' },
    phone:    { name:'手机',         icon:'&#x1F4F1;', desc:'通过蓝牙连接手机，手机摄像头作为辅助监测', connType:'bluetooth', click:'bluetooth' },
    tablet:   { name:'平板',         icon:'&#x1F4F1;', desc:'通过蓝牙连接平板，平板摄像头作为辅助监测', connType:'bluetooth', click:'bluetooth' },
    'usb-sensor': { name:'USB传感器', icon:'&#x1F4E1;', desc:'外接环境光/距离传感器，通过USB接入',     connType:'usb',    click:'usb' },
    'bt-le':     { name:'蓝牙BLE',   icon:'&#x1F535;', desc:'蓝牙低功耗设备，支持智能灯带、环境光传感器', connType:'bluetooth', click:'bluetooth' }
  };

  let appState = {
    user: { nickname:'', role:'student', avatarColor:CONSTANTS.DEFAULT_AVATAR_GRADIENT, firstTime:true, avatarImage:'' },
    devices: {},
    permissions: { camera:'prompt', bluetooth:'prompt', usb:'prompt', notification:'default', autoRequestNotification: true },
    scene: 'office',
    thresholds: { distance:40, distanceWarn:50, intervalMin:0, intervalSec:30, interval:30, blink:10, blinkWarn:15, posture:70, postureWarn:80, ear:22, alertDuration:3 },
    alertSound: true,
    alertPersistDuration: 5,
    alertDurationDistance: 5,
    alertDurationPosture: 5,
    alertDurationBlink: 5,
    alertPaused: false,
    eyeMode: false,
    calibrationData: { distance: null, posture: null, ear: null },
    connectedDevices: { hardware:false, laptop:false, phone:false, tablet:false, 'usb-sensor':false, 'bt-le':false },
    selectedMonitorDevice: null,
    exportFolderHandle: null,
    monitorActive: false,
    pro: { activated: false, code: null, activatedAt: null, planType: null, expiresAt: null },
    freeMinutesUsedToday: 0,
    freeMinutesDate: null,
    freeDailyLimit: 40,
    theme: 'dark'
  };

  // Init default device enabled states
  Object.keys(DEVICE_DEFS).forEach(k => { appState.devices[k] = true; });

  // ===================== Toast =====================
  let toastTimer = null;
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function showAlert(msg, type, icon) {
    const t = document.getElementById('alert-toast');
    document.getElementById('alert-toast-msg').textContent = msg;
    document.getElementById('alert-toast-icon').innerHTML = icon || '&#x1F4A1;';
    t.className = 'alert-toast show ' + (type || 'info');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove('show'); }, 3500);
  }
  function hideAlert() {
    document.getElementById('alert-toast').classList.remove('show');
    clearTimeout(toastTimer);
  }

  // ===================== Modal =====================
  let modalCallback = null;
  let modalCancelCallback = null;
  function showModal(title, desc, confirmText, isDanger, cb, cancelCb) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-desc').textContent = desc;
    const btn = document.getElementById('modal-confirm');
    btn.textContent = confirmText || '确认';
    btn.className = 'modal-btn ' + (isDanger ? 'modal-btn-danger' : 'modal-btn-confirm');
    modalCallback = cb;
    modalCancelCallback = cancelCb;
    document.getElementById('modal-overlay').classList.add('open');
  }
  document.getElementById('modal-cancel').onclick = () => { document.getElementById('modal-overlay').classList.remove('open'); if (modalCancelCallback) modalCancelCallback(); modalCallback = null; modalCancelCallback = null; };
  document.getElementById('modal-confirm').onclick = () => { document.getElementById('modal-overlay').classList.remove('open'); if (modalCallback) modalCallback(); modalCallback = null; modalCancelCallback = null; };

  // ===================== Navigation =====================
  const PAGE_TITLES = { dashboard:'数据概览', monitor:'实时监测', stats:'数据统计', report:'健康报告', settings:'提醒设置' };
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (!page) return;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById('page-' + page).classList.add('active');
      document.getElementById('page-title').textContent = PAGE_TITLES[page] || '';
      if (page === 'settings') { refreshStorageInfo(); backupSettings(); }
      if (page === 'monitor') refreshMonitorDeviceSelector();
      if (page === 'report') refreshReport();
      if (page === 'dashboard' || page === 'stats') {
        function tryInitCharts() {
          if (typeof echarts === 'undefined') { setTimeout(tryInitCharts, 500); return; }
          initAllCharts();
          // 初始化完成后加载真实数据
          setTimeout(function() {
            if (typeof dbGetAll === 'function' && typeof updateChartsWithRealData === 'function') {
              dbGetAll('sessions').then(function(recs) {
                var sessions = recs || [];
                var daily = {};
                sessions.forEach(function(r) {
                  var day = r.timestamp ? new Date(r.timestamp).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'}) : '今天';
                  if (!daily[day]) daily[day] = [];
                  daily[day].push(r);
                });
                updateChartsWithRealData(sessions, daily);
              });
            }
          }, 100);
        }
        setTimeout(tryInitCharts, 50);
      }
      // 切换到统计页面时，resize 图表确保尺寸正确（多次尝试确保动画完成）
      if (page === 'stats' || page === 'dashboard') {
        [100, 300, 600].forEach(function(delay) {
          setTimeout(function() {
            if (typeof echarts !== 'undefined') {
              document.querySelectorAll('.chart-container').forEach(function(el) {
                var inst = echarts.getInstanceByDom(el);
                if (inst) inst.resize();
              });
            }
          }, delay);
        });
      }
      // 同步底部Tab
      document.querySelectorAll('.bottom-tab-bar .tab-item').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === page);
      });
    });
  });

  // Settings shortcut
  function switchTab(tabName) {
    // 更新底部Tab激活状态
    document.querySelectorAll('.bottom-tab-bar .tab-item').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });
    
    // 映射到现有导航
    const navMap = { dashboard: 0, monitor: 1, stats: 2, report: 3, settings: 4 };
    const idx = navMap[tabName];
    if (idx !== undefined) {
      const navItems = document.querySelectorAll('.nav-item');
      if (navItems[idx]) navItems[idx].click();
    }
  }

  function toggleEyeCareMode() {
    var toggle = document.getElementById('eye-care-toggle');
    var sidebarToggle = document.getElementById('eye-mode-toggle');
    var isEyeCare = toggle.classList.contains('active');
    if (isEyeCare) {
      toggle.classList.remove('active');
      if (sidebarToggle) sidebarToggle.classList.remove('active');
      document.body.classList.remove('eye-care-mode');
      delete document.body.dataset.eyeCareBase;
      localStorage.setItem('eyeGuardEyeCare', 'false');
      // 恢复之前的主题
      restoreTheme();
    } else {
      toggle.classList.add('active');
      if (sidebarToggle) sidebarToggle.classList.add('active');
      document.body.classList.add('eye-care-mode');
      // 根据当前主题选择护眼基调：深色→深色护眼，亮色→浅色护眼
      var isDark = document.body.classList.contains('dark-mode') ||
        (!document.body.classList.contains('light-mode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.body.dataset.eyeCareBase = isDark ? 'dark' : 'light';
      localStorage.setItem('eyeGuardEyeCare', 'true');
      localStorage.setItem('eyeCareBaseTheme', isDark ? 'dark' : 'light');
    }
  }
  (function setupEyeCare() {
    var toggle = document.getElementById('eye-care-toggle');
    if (toggle) toggle.addEventListener('click', toggleEyeCareMode);
  })();

  // Settings shortcut
  document.getElementById('header-settings-btn').addEventListener('click', () => {
    if (typeof backupSettings === 'function') backupSettings();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('.nav-item[data-page="settings"]').classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-settings').classList.add('active');
    document.getElementById('page-title').textContent = '提醒设置';
    refreshStorageInfo();
    // 同步底部Tab
    document.querySelectorAll('.bottom-tab-bar .tab-item').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === 'settings');
    });
  });

  // ===================== User Profile =====================
  document.getElementById('user-profile-area').addEventListener('click', openUserEdit);
  document.getElementById('btn-close-user-edit').addEventListener('click', closeUserEdit);
  document.getElementById('user-edit-backdrop').addEventListener('click', closeUserEdit);

  function openUserEdit() {
    document.getElementById('edit-nickname').value = appState.user.nickname;
    document.getElementById('edit-phone').value = appState.user.phone || '';
    var editPhoneError = document.getElementById('edit-phone-error');
    if (editPhoneError) editPhoneError.textContent = '';
    selectRole(document.getElementById('edit-role-selector'), appState.user.role);
    selectColor(document.getElementById('edit-color-picker'), appState.user.avatarColor);
    // 恢复已上传的头像
    var editAvatarText = document.getElementById('edit-avatar-text');
    var editAvatarImg = document.getElementById('edit-avatar-img');
    var btnRemoveAvatar = document.getElementById('btn-remove-avatar');
    if (appState.user.avatarImage) {
      editAvatarImg.src = appState.user.avatarImage;
      editAvatarImg.style.display = 'block';
      editAvatarText.style.display = 'none';
      if (btnRemoveAvatar) btnRemoveAvatar.style.display = 'inline-block';
    } else {
      editAvatarImg.style.display = 'none';
      editAvatarText.style.display = 'block';
      if (btnRemoveAvatar) btnRemoveAvatar.style.display = 'none';
    }
    updateEditPreview();
    document.getElementById('user-edit-panel').classList.add('open');
    document.getElementById('user-edit-backdrop').classList.add('open');
  }

  function closeUserEdit() {
    document.getElementById('user-edit-panel').classList.remove('open');
    document.getElementById('user-edit-backdrop').classList.remove('open');
  }

  document.getElementById('btn-save-user-profile').addEventListener('click', saveUserProfile);

  async function saveUserProfile() {
    try {
    appState.user.nickname = document.getElementById('edit-nickname').value.trim();
    if (!appState.user.nickname) { showAlert('昵称不能为空', 'error', '&#x26A0;'); return; }
    appState.user.role = getSelectedRole(document.getElementById('edit-role-selector'));
    appState.user.avatarColor = getSelectedColor(document.getElementById('edit-color-picker'));
    // 头像图片数据已在上传时保存到 appState.user.avatarImage
    var editPhone = document.getElementById('edit-phone').value.trim();
    var editPhoneError = document.getElementById('edit-phone-error');
    if (editPhone && !/^1[3-9]\d{9}$/.test(editPhone)) {
      if (editPhoneError) editPhoneError.textContent = '请输入正确的11位手机号（1开头）';
      document.getElementById('edit-phone').focus();
      return;
    }
    if (editPhoneError) editPhoneError.textContent = '';
    if (editPhone) appState.user.phone = editPhone;
    await dbPut('settings', { key:'user', data: appState.user });
    renderUserProfile();
    closeUserEdit();
    showAlert('个人设置已保存', 'info', '&#x2705;');
    // 如果监测未启动，提醒用户前往监测页面
    if (!appState.monitorActive) {
      setTimeout(function() {
        showAlert('请切换到「实时监测」页面开启用眼健康监测', 'info', '&#x1F3AF;');
      }, 1500);
    }
    } catch(err) { console.warn('saveUserProfile error:', err); }
  }

  function renderUserProfile() {
    const u = appState.user;
    const avatar = document.getElementById('sidebar-avatar');
    if (!avatar) return; // 元素不存在时安全退出
    if (u.avatarImage) {
      var avatarImg = document.createElement('img');
      avatarImg.src = u.avatarImage;
      avatarImg.alt = '头像';
      avatarImg.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
      avatar.innerHTML = '';
      avatar.appendChild(avatarImg);
      avatar.style.background = 'transparent';
    } else {
      const initial = u.nickname ? u.nickname.charAt(0) : '?';
      avatar.textContent = initial;
      avatar.style.background = u.avatarColor;
    }
    var nameEl = document.getElementById('sidebar-user-name');
    var roleEl = document.getElementById('sidebar-user-role');
    if (nameEl) nameEl.textContent = u.nickname || '未设置';
    if (roleEl) roleEl.textContent = ROLE_MAP[u.role] || '未设置';
  }

  function updateEditPreview() {
    const c = getSelectedColor(document.getElementById('edit-color-picker'));
    const n = document.getElementById('edit-nickname').value.trim();
    var editAvatarText = document.getElementById('edit-avatar-text');
    var editAvatarImg = document.getElementById('edit-avatar-img');
    // 如果没有自定义头像，才更新文字预览
    if (!appState.user.avatarImage) {
      document.getElementById('edit-avatar-preview').style.background = c;
      editAvatarText.textContent = n ? n.charAt(0) : '用户';
    }
  }
  document.getElementById('edit-nickname').addEventListener('input', updateEditPreview);

  // ==================== 头像上传功能 ====================
  document.getElementById('avatar-file-input').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    // 验证文件类型和大小
    if (!file.type.startsWith('image/')) {
      showAlert('请选择图片文件', 'error', '&#x26A0;');
      e.target.value = '';
      return;
    }
    if (file.size > 512 * 1024) {
      showAlert('图片不能超过 512KB', 'error', '&#x26A0;');
      e.target.value = '';
      return;
    }
    // 读取并压缩图片为 base64
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        // 压缩到128x128以内
        var canvas = document.createElement('canvas');
        var maxSize = 128;
        var w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        var base64 = canvas.toDataURL('image/jpeg', 0.8);
        // 保存到 appState
        appState.user.avatarImage = base64;
        // 更新编辑面板预览
        var editAvatarImg = document.getElementById('edit-avatar-img');
        var editAvatarText = document.getElementById('edit-avatar-text');
        editAvatarImg.src = base64;
        editAvatarImg.style.display = 'block';
        editAvatarText.style.display = 'none';
        // 显示恢复默认按钮
        var btnRemove = document.getElementById('btn-remove-avatar');
        if (btnRemove) btnRemove.style.display = 'inline-block';
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // 清空input，允许重复选择同一文件
  });

  // 移除自定义头像，恢复默认
  function removeAvatarImage() {
    appState.user.avatarImage = '';
    var editAvatarImg = document.getElementById('edit-avatar-img');
    var editAvatarText = document.getElementById('edit-avatar-text');
    editAvatarImg.style.display = 'none';
    editAvatarText.style.display = 'block';
    var btnRemove = document.getElementById('btn-remove-avatar');
    if (btnRemove) btnRemove.style.display = 'none';
    updateEditPreview();
  }

  // 显示隐私保护声明弹窗（可随时查看）
  function showPrivacyModal() {
    var modal = document.getElementById('privacy-modal');
    if (modal) {
      modal.style.display = 'flex';
      // 修改按钮文字为"我知道了"（非首次查看）
      var btn = modal.querySelector('button');
      if (btn && localStorage.getItem('eye_privacy_accepted')) {
        btn.textContent = '我知道了';
      }
    }
  }

  function selectRole(container, role) {
    container.querySelectorAll('.role-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.role === role);
    });
  }
  function getSelectedRole(container) {
    const a = container.querySelector('.role-btn.active');
    return a ? a.dataset.role : 'student';
  }
  function selectColor(container, color) {
    container.querySelectorAll('.color-option').forEach(c => {
      c.classList.toggle('selected', c.dataset.color === color);
    });
  }
  function getSelectedColor(container) {
    const s = container.querySelector('.color-option.selected');
    return s ? s.dataset.color : CONSTANTS.DEFAULT_AVATAR_GRADIENT;
  }

  // Color picker delegation
  document.getElementById('edit-color-picker').addEventListener('click', (e) => {
    const opt = e.target.closest('.color-option');
    if (!opt) return;
    selectColor(document.getElementById('edit-color-picker'), opt.dataset.color);
    updateEditPreview();
  });
  document.getElementById('edit-role-selector').addEventListener('click', (e) => {
    const btn = e.target.closest('.role-btn');
    if (!btn) return;
    selectRole(document.getElementById('edit-role-selector'), btn.dataset.role);
  });

  // ===================== Welcome =====================
  function setupWelcome() {
    var overlay = document.getElementById('welcome-overlay');
    // 首次使用 或 没有绑定手机号，都需要显示设置面板
    if (!appState.user.firstTime && appState.user.phone) {
      overlay.classList.remove('open');
      return;
    }
    overlay.classList.add('open');
    document.getElementById('welcome-nickname').value = appState.user.nickname || '';
    document.getElementById('welcome-phone').value = appState.user.phone || '';
    var phoneError = document.getElementById('welcome-phone-error');
    if (phoneError) phoneError.textContent = '';
    selectRole(document.getElementById('welcome-role-selector'), appState.user.role || 'student');
    selectColor(document.getElementById('welcome-color-picker'), appState.user.avatarColor || CONSTANTS.DEFAULT_AVATAR_GRADIENT);
    // 修改按钮文字
    var btn = document.getElementById('btn-complete-welcome');
    if (btn) btn.textContent = appState.user.firstTime ? '开始使用' : '保存设置';
  }

  document.getElementById('welcome-color-picker').addEventListener('click', (e) => {
    const opt = e.target.closest('.color-option');
    if (!opt) return;
    selectColor(document.getElementById('welcome-color-picker'), opt.dataset.color);
  });
  document.getElementById('welcome-role-selector').addEventListener('click', (e) => {
    const btn = e.target.closest('.role-btn');
    if (!btn) return;
    selectRole(document.getElementById('welcome-role-selector'), btn.dataset.role);
  });

  document.getElementById('btn-complete-welcome').addEventListener('click', async () => {
    var nickname = document.getElementById('welcome-nickname').value.trim();
    var phone = document.getElementById('welcome-phone').value.trim();
    var phoneError = document.getElementById('welcome-phone-error');
    
    // 验证昵称
    if (!nickname) {
      showAlert('请输入昵称', 'error', '&#x26A0;');
      document.getElementById('welcome-nickname').focus();
      return;
    }
    if (nickname.length > 20) {
      showAlert('昵称不能超过20个字符', 'error', '&#x26A0;');
      return;
    }
    // 验证手机号
    if (!phoneError) phoneError = document.getElementById('welcome-phone-error');
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      if (phoneError) phoneError.textContent = '请输入正确的11位手机号（1开头）';
      document.getElementById('welcome-phone').focus();
      return;
    }
    if (phoneError) phoneError.textContent = '';
    
    appState.user.nickname = nickname;
    appState.user.role = getSelectedRole(document.getElementById('welcome-role-selector'));
    appState.user.avatarColor = getSelectedColor(document.getElementById('welcome-color-picker'));
    appState.user.phone = phone;
    appState.user.firstTime = false;
    await dbPut('settings', { key:'user', data: appState.user });
    if (typeof updateProUI === 'function') updateProUI();
    renderUserProfile();
    document.getElementById('welcome-overlay').classList.remove('open');
    showAlert('欢迎，' + nickname + '！设置已完成', 'info', '&#x1F441;');
    setTimeout(function() {
      showAlert('请切换到「实时监测」页面开始用眼健康监测', 'info', '&#x1F3AF;');
    }, 1500);
  });

  // ===================== Eye Mode (统一为 eye-care-mode) =====================
  document.getElementById('eye-mode-toggle').addEventListener('click', function() {
    toggleEyeCareMode();
  });

  // ===================== Calibration =====================
  let calSamples = { dist: [], ear: [], posture: [] };

  function setCalStatus(type, status, value) {
    const valEl = document.getElementById('cal-' + type);
    const statusEl = document.getElementById('cal-' + type + '-status');
    const btn = document.getElementById('btn-cal-' + type);
    if (valEl) valEl.textContent = value || '--';
    if (statusEl) {
      statusEl.className = 'calibration-item-status ' + status;
      if (status === 'done') statusEl.textContent = '已校准 ✓';
      else if (status === 'active') statusEl.textContent = '校准中...';
      else statusEl.textContent = '待校准';
    }
    if (btn) {
      btn.classList.toggle('calibrated', status === 'done');
      btn.disabled = status === 'active';
    }
  }

  function setCalProgress(type, percent, animating) {
    const fill = document.getElementById('cal-' + type + '-progress');
    if (fill) { fill.style.width = percent + '%'; fill.classList.toggle('animating', animating); }
  }

  function collectCalSample(type) {
    // 从当前监测数据中采集样本
    const distEl = document.getElementById('m-distance');
    const earEl = document.getElementById('m-ear');
    const postureEl = document.getElementById('m-posture');
    let sample = 0;
    if (type === 'dist') {
      // 距离采集：需要距离数据可用
      if (!distEl || distEl.textContent === '--') return false;
      sample = parseInt(distEl.textContent) || 0;
    } else if (type === 'ear') {
      // EAR采集：需要EAR数据可用
      if (!earEl || earEl.textContent === '--') return false;
      sample = parseFloat(earEl.textContent) || 0;
    } else if (type === 'posture') {
      // 坐姿采集：需要坐姿数据可用
      if (!postureEl || postureEl.textContent === '--') return false;
      sample = parseInt(postureEl.textContent) || 0;
    }
    return sample;
  }

  async function calibrateDistance() {
    try {
    if (!appState.monitorActive) { showAlert('请先启动摄像头监测', 'warn', '&#x26A0;'); return; }
    setCalStatus('dist', 'active', '采集中...');
    setCalProgress('dist', 0, true);
    calSamples.dist = [];
    showAlert('校准中：请坐在40cm处，保持不动3秒', 'info', '&#x1F3AF;');
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 200;
      setCalProgress('dist', Math.min(100, (elapsed / 3000) * 100), true);
      const s = collectCalSample('dist');
      if (s > 0) calSamples.dist.push(s);
    }, 200);
    await new Promise(r => setTimeout(r, 3000));
    clearInterval(interval);
    setCalProgress('dist', 100, false);
    if (calSamples.dist.length > 3) {
      // 去掉最大最小值取平均（仅用于参考显示）
      calSamples.dist.sort((a, b) => a - b);
      const trimmed = calSamples.dist.slice(1, -1);
      const avgDist = Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length);
      // 使用目标距离40cm作为基准（用户被告知的位置），确保校准后距离准确
      const targetDist = 40;
      await dbPut('calibration', { key: 'distance_baseline', value: targetDist, rawSamples: calSamples.dist, timestamp: Date.now() });
      // 保存校准时的像素分析参数
      appState.calibrationData.distance = { value: targetDist, skinRatio: currentSkinRatio || 0.15 };
      await dbPut('settings', { key:'calibrationData', data: appState.calibrationData });
      setCalStatus('dist', 'done', targetDist + ' cm');
      showAlert('距离校准完成：基准距离 ' + targetDist + 'cm', 'info', '&#x2705;');
    } else {
      setCalStatus('dist', 'pending', '未校准');
      showAlert('距离校准失败：未采集到足够数据，请确保摄像头画面中有面部', 'danger', '&#x26A0;');
    }
    } catch(err) { console.warn('calibrateDistance error:', err); setCalStatus('dist', 'pending', '未校准'); }
  }

  async function calibrateEAR() {
    try {
    if (!appState.monitorActive) { showAlert('请先启动摄像头监测', 'warn', '&#x26A0;'); return; }
    setCalStatus('ear', 'active', '采集中...');
    setCalProgress('ear', 0, true);
    calSamples.ear = [];
    showAlert('校准中：请保持睁眼状态2秒', 'info', '&#x1F3AF;');
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 200;
      setCalProgress('ear', Math.min(100, (elapsed / 2000) * 100), true);
      const s = collectCalSample('ear');
      if (s > 0) calSamples.ear.push(s);
    }, 200);
    await new Promise(r => setTimeout(r, 2000));
    clearInterval(interval);
    setCalProgress('ear', 100, false);
    if (calSamples.ear.length > 2) {
      calSamples.ear.sort((a, b) => a - b);
      const trimmed = calSamples.ear.slice(1, -1);
      const avgEAR = (trimmed.reduce((a, b) => a + b, 0) / trimmed.length).toFixed(3);
      await dbPut('calibration', { key: 'ear_baseline', value: parseFloat(avgEAR), rawSamples: calSamples.ear, timestamp: Date.now() });
      appState.calibrationData.ear = { value: parseFloat(avgEAR), rawValue: currentEARValue || 0.3 };
      await dbPut('settings', { key:'calibrationData', data: appState.calibrationData });
      setCalStatus('ear', 'done', avgEAR);
      showAlert('EAR基线校准完成：' + avgEAR, 'info', '&#x2705;');
    } else {
      setCalStatus('ear', 'pending', '未校准');
      showAlert('EAR校准失败：未采集到足够数据', 'danger', '&#x26A0;');
    }
    } catch(err) { console.warn('calibrateEAR error:', err); setCalStatus('ear', 'pending', '未校准'); }
  }

  async function calibratePosture() {
    try {
    if (!appState.monitorActive) { showAlert('请先启动摄像头监测', 'warn', '&#x26A0;'); return; }
    setCalStatus('posture', 'active', '采集中...');
    setCalProgress('posture', 0, true);
    calSamples.posture = [];
    var postureEl = document.getElementById('m-posture');
    console.log('[校准坐姿] 开始，当前原始值:', window.currentRawPostureScore, 'm-posture显示值:', postureEl ? postureEl.textContent : '元素不存在');
    showAlert('校准中：请坐直面向屏幕2秒', 'info', '&#x1F3AF;');
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 200;
      setCalProgress('posture', Math.min(100, (elapsed / 2000) * 100), true);
      // 采集原始值（未应用校准偏移），而非UI显示值
      const s = (typeof window.currentRawPostureScore === 'number' && !isNaN(window.currentRawPostureScore)) ? window.currentRawPostureScore : 0;
      console.log('[校准坐姿] 采集样本:', s, '原始值:', window.currentRawPostureScore, 'm-posture:', postureEl ? postureEl.textContent : 'N/A');
      if (s > 0) calSamples.posture.push(s);
    }, 200);
    await new Promise(r => setTimeout(r, 2000));
    clearInterval(interval);
    setCalProgress('posture', 100, false);
    console.log('[校准坐姿] 采集结束，样本数:', calSamples.posture.length, '样本:', calSamples.posture);
    if (calSamples.posture.length > 2) {
      calSamples.posture.sort((a, b) => a - b);
      const trimmed = calSamples.posture.slice(1, -1);
      const avgPosture = Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length);
      const factor = parseFloat((90 / avgPosture).toFixed(4));
      const normalizedY = window.currentNormalizedY || 0.35;
      await dbPut('calibration', { key: 'posture_baseline', factor: factor, value: avgPosture, normalizedY: normalizedY, rawSamples: calSamples.posture, timestamp: Date.now() });
      appState.calibrationData.posture = { factor: factor, normalizedY: normalizedY };
      await dbPut('settings', { key:'calibrationData', data: appState.calibrationData });
      setCalStatus('posture', 'done', factor + 'x');
      showAlert('坐姿基线校准完成：系数=' + factor + ' (原始=' + avgPosture + '\u00B0)', 'info', '&#x2705;');
      console.log('[校准坐姿] 成功，系数:', factor, '原始值:', avgPosture, 'normalizedY:', normalizedY);
    } else {
      setCalStatus('posture', 'pending', '未校准');
      showAlert('坐姿校准失败：未采集到足够数据（检测到' + calSamples.posture.length + '个样本，需至少3个）', 'danger', '&#x26A0;');
      console.warn('[校准坐姿] 失败，样本不足:', calSamples.posture.length);
    }
    } catch(err) { console.warn('calibratePosture error:', err); setCalStatus('posture', 'pending', '未校准'); }
  }

  async function calibrateAll() {
    try {
    if (!appState.monitorActive) { showAlert('请先启动摄像头监测', 'warn', '&#x26A0;'); return; }
    const btn = document.getElementById('btn-cal-all');
    btn.disabled = true;
    btn.textContent = '校准中，请保持坐姿不动5秒...';
    showAlert('一键校准：请坐在40cm处，坐直，保持睁眼5秒', 'info', '&#x1F3AF;');
    // 同时采集三类数据
    setCalStatus('dist', 'active', '采集中...');
    setCalStatus('ear', 'active', '采集中...');
    setCalStatus('posture', 'active', '采集中...');
    calSamples = { dist: [], ear: [], posture: [] };
    const interval = setInterval(() => {
      const d = collectCalSample('dist'); if (d > 0) calSamples.dist.push(d);
      const e = collectCalSample('ear'); if (e > 0) calSamples.ear.push(e);
      // 坐姿采集原始值（未应用校准偏移）
      const p = (typeof window.currentRawPostureScore === 'number' && !isNaN(window.currentRawPostureScore)) ? window.currentRawPostureScore : 0;
      if (p > 0) calSamples.posture.push(p);
    }, 500);
    await new Promise(r => setTimeout(r, 5000));
    clearInterval(interval);
    // 处理结果
    function avg(arr) {
      if (arr.length < 3) return null;
      arr.sort((a, b) => a - b);
      const t = arr.slice(1, -1);
      return t.reduce((a, b) => a + b, 0) / t.length;
    }
    const distResult = avg(calSamples.dist);
    const earResult = avg(calSamples.ear);
    const postureResult = avg(calSamples.posture);
    if (distResult !== null) {
      const targetDist = 40;
      await dbPut('calibration', { key: 'distance_baseline', value: targetDist, rawSamples: calSamples.dist, timestamp: Date.now() });
      appState.calibrationData.distance = { value: targetDist, skinRatio: currentSkinRatio || 0.15 };
      await dbPut('settings', { key:'calibrationData', data: appState.calibrationData });
      setCalStatus('dist', 'done', targetDist + ' cm');
    } else { setCalStatus('dist', 'pending', '未校准'); }
    if (earResult !== null) {
      const earVal = parseFloat(earResult.toFixed(3));
      await dbPut('calibration', { key: 'ear_baseline', value: earVal, rawSamples: calSamples.ear, timestamp: Date.now() });
      appState.calibrationData.ear = earVal;
      setCalStatus('ear', 'done', earVal.toFixed(3));
    } else { setCalStatus('ear', 'pending', '未校准'); }
    if (postureResult !== null) {
      const postureVal = Math.round(postureResult);
      const factor = parseFloat((90 / postureVal).toFixed(4));
      const normalizedY = window.currentNormalizedY || 0.35;
      await dbPut('calibration', { key: 'posture_baseline', factor: factor, value: postureVal, normalizedY: normalizedY, rawSamples: calSamples.posture, timestamp: Date.now() });
      appState.calibrationData.posture = { factor: factor, normalizedY: normalizedY };
      await dbPut('settings', { key:'calibrationData', data: appState.calibrationData });
      setCalStatus('posture', 'done', factor + 'x');
    } else { setCalStatus('posture', 'pending', '未校准'); }
    btn.disabled = false;
    btn.textContent = '一键校准全部';
    const count = (distResult !== null ? 1 : 0) + (earResult !== null ? 1 : 0) + (postureResult !== null ? 1 : 0);
    if (count === 3) showAlert('全部校准完成！', 'info', '&#x2705;');
    else showAlert('校准完成 ' + count + '/3 项，部分数据不足', 'warn', '&#x26A0;');
    } catch(err) {
      console.warn('calibrateAll error:', err);
      var btn2 = document.getElementById('btn-cal-all');
      if (btn2) { btn2.disabled = false; btn2.textContent = '一键校准全部'; }
    }
  }

  // 将校准函数暴露到全局，供HTML onclick调用
  window.calibrateDistance = calibrateDistance;
  window.calibrateEAR = calibrateEAR;
  window.calibratePosture = calibratePosture;
  window.calibrateAll = calibrateAll;

  // 页面加载时恢复校准状态
  async function restoreCalibration() {
    try {
      const distCal = await dbGet('calibration', 'distance_baseline');
      if (distCal) {
        setCalStatus('dist', 'done', distCal.value + ' cm');
        // 如果appState中没有距离校准数据，从calibration store恢复
        if (!appState.calibrationData.distance) {
          appState.calibrationData.distance = { value: distCal.value, skinRatio: distCal.skinRatio || 0.15 };
        }
      }
      const earCal = await dbGet('calibration', 'ear_baseline');
      if (earCal) {
        setCalStatus('ear', 'done', earCal.value.toFixed(3));
        if (!appState.calibrationData.ear) appState.calibrationData.ear = earCal.value;
      }
      const postureCal = await dbGet('calibration', 'posture_baseline');
      if (postureCal) {
        if (postureCal.factor && postureCal.factor > 0.5 && postureCal.factor < 2.0) {
          setCalStatus('posture', 'done', postureCal.factor + 'x');
          if (!appState.calibrationData.posture) {
            appState.calibrationData.posture = { factor: postureCal.factor, normalizedY: postureCal.normalizedY || 0.35 };
          }
        } else if (postureCal.value && postureCal.value > 10 && postureCal.value < 120) {
          // 兼容旧数据：显示原始值，但存储时会自动转换为系数
          setCalStatus('posture', 'done', postureCal.value + '\u00B0');
          if (!appState.calibrationData.posture) {
            const factor = parseFloat((90 / postureCal.value).toFixed(4));
            appState.calibrationData.posture = { factor: factor, normalizedY: postureCal.normalizedY || 0.35 };
          }
        }
      }
    } catch(err) { console.warn('Restore calibration error:', err); }
  }

  // ===================== Device Toggle =====================
  document.getElementById('device-status-grid').addEventListener('click', (e) => {
    // Toggle button
    const toggleBtn = e.target.closest('.device-toggle-btn');
    if (toggleBtn) {
      e.stopPropagation();
      const dev = toggleBtn.dataset.deviceToggle;
      toggleDeviceEnabled(dev);
      return;
    }
    // Card click -> connect
    const card = e.target.closest('.device-status-card');
    if (card) {
      const dev = card.dataset.deviceType;
      if (!appState.devices[dev]) return;
      connectDevice(dev);
    }
  });

  async function toggleDeviceEnabled(dev) {
    appState.devices[dev] = !appState.devices[dev];
    await dbPut('settings', { key:'devices', data: appState.devices });
    // 如果禁用的是当前正在监测的设备，自动停止监测并切换到可用设备
    if (!appState.devices[dev] && appState.monitorActive && appState.selectedMonitorDevice === dev) {
      try { stopMonitoring(); } catch(e) { console.warn('停止监测失败:', e); }
      showAlert('设备已禁用，监测已自动停止', 'warn', '&#x26A0;');
      // 自动切换到第一个可用设备
      var fallback = Object.keys(appState.devices).find(function(d) { return appState.devices[d] && DEVICE_DEFS[d] && DEVICE_DEFS[d].connType === 'camera'; });
      if (fallback) appState.selectedMonitorDevice = fallback;
      else appState.selectedMonitorDevice = null;
    }
    // 保存选择到数据库
    await dbPut('settings', { key:'selectedMonitorDevice', value: appState.selectedMonitorDevice });
    refreshDeviceCards();
    refreshSettingsDeviceList();
    refreshMonitorDeviceSelector();
    if (!appState.devices[dev]) {
      // 设备被禁用：断开连接
      appState.connectedDevices[dev] = false;
      await dbPut('settings', { key:'connectedDevices', data: appState.connectedDevices });
      // 如果该设备正在被监测使用，立即停止监测
      if (appState.selectedMonitorDevice === dev || (monitorStream !== null && DEVICE_DEFS[dev] && DEVICE_DEFS[dev].connType === 'camera')) {
        appState.selectedMonitorDevice = null;
        stopMonitoring();
      }
    }
  }

  function refreshDeviceCards() {
    Object.keys(DEVICE_DEFS).forEach(dev => {
      const card = document.getElementById('card-' + dev);
      if (!card) return;
      const toggle = card.querySelector('.device-toggle-btn');
      const indicator = document.getElementById('indicator-' + dev);
      if (!indicator) return; // 安全退出
      card.classList.toggle('disabled-device', !appState.devices[dev]);
      // 开关只表示启用/禁用，不表示连接状态
      if (appState.devices[dev]) {
        toggle.classList.add('active');
        toggle.style.background = '';
      } else {
        toggle.classList.remove('active');
        toggle.style.background = 'var(--muted)';
      }

      if (!appState.devices[dev]) {
        indicator.className = 'device-status-indicator disabled-status';
        indicator.innerHTML = '<span class="ds-dot"></span>已禁用';
      } else if (appState.connectedDevices[dev]) {
        card.classList.add('active-device');
        indicator.className = 'device-status-indicator connected';
        indicator.innerHTML = '<span class="ds-dot"></span>已连接';
      } else {
        card.classList.remove('active-device');
        indicator.className = 'device-status-indicator disconnected';
        indicator.innerHTML = '<span class="ds-dot"></span>未连接';
      }
    });
    updateHeaderDeviceCount();
  }

  function updateHeaderDeviceCount() {
    const count = Object.keys(DEVICE_DEFS).filter(d => appState.connectedDevices[d]).length;
    const el = document.getElementById('header-device-count');
    const badge = document.querySelector('.status-badge');
    el.textContent = count + ' 设备在线';
    if (count > 0) {
      badge.style.background = 'var(--accent2-light, rgba(5,150,105,0.08))';
      badge.style.color = 'var(--success)';
    } else {
      badge.style.background = 'var(--warning-light, rgba(245,158,11,0.08))';
      badge.style.color = 'var(--warning)';
    }
  }

  // ===================== Device Connection =====================
  async function connectDevice(dev) {
    const def = DEVICE_DEFS[dev];
    if (!def) return;

    try {
      if (def.connType === 'camera') {
        // 不在这里请求权限，等用户点击"开启监测"时在 startMonitoring 中请求
        appState.connectedDevices[dev] = true;
        appState.permissions.camera = 'prompt'; // 标记为待请求
        const camToggle = document.querySelector('[data-perm="camera"]');
        if (camToggle) { camToggle.classList.remove('active'); camToggle.classList.add('pending'); }
        await dbPut('settings', { key:'permissions', data: appState.permissions });
      } else if (def.connType === 'usb') {
        await navigator.serial.requestPort();
        appState.connectedDevices[dev] = true;
        appState.permissions.usb = 'granted';
        const usbToggle = document.querySelector('[data-perm="usb"]');
        if (usbToggle) usbToggle.classList.add('active');
      } else if (def.connType === 'bluetooth') {
        // 如果当前设备就是手机/平板，直接使用本机摄像头
        if (IS_MOBILE || IS_TABLET) {
          // 不在这里请求权限，等点击"开启监测"时再请求
          appState.connectedDevices[dev] = true;
          appState.permissions.camera = 'prompt'; // 标记为待请求
          const camToggle = document.querySelector('[data-perm="camera"]');
          if (camToggle) { camToggle.classList.remove('active'); camToggle.classList.add('pending'); }
        } else {
          await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
          appState.permissions.bluetooth = 'granted';
          const btToggle = document.querySelector('[data-perm="bluetooth"]');
          if (btToggle) btToggle.classList.add('active');
        }
        appState.connectedDevices[dev] = true;
      }

      await dbPut('settings', { key:'connectedDevices', data: appState.connectedDevices });
      await dbPut('settings', { key:'permissions', data: appState.permissions });
      refreshDeviceCards();
      refreshPermissionToggles();
      refreshMonitorDeviceSelector();
      updateHeaderDeviceCount();
      showAlert(def.name + ' 已连接', 'info', '&#x2705;');
    } catch(err) {
      console.warn('Device connection failed:', dev, err);
      if (err.name !== 'NotFoundError' && err.name !== 'CancelError' && err.name !== 'NotAllowedError') {
        showAlert('连接失败：' + (err.message || err.name), 'danger', '&#x26A0;');
      }
    }
  }

  // ===================== Settings Device List =====================
  function refreshSettingsDeviceList() {
    const container = document.getElementById('settings-device-list');
    if (!container) return;
    container.innerHTML = '';
    Object.keys(DEVICE_DEFS).forEach(dev => {
      const def = DEVICE_DEFS[dev];
      const item = document.createElement('div');
      item.className = 'settings-device-item';
      item.innerHTML = `
        <div class="settings-device-info">
          <span class="sdi-icon">${def.icon}</span>
          <div>
            <div class="sdi-name">${def.name}</div>
            <div class="sdi-desc">${def.desc}</div>
          </div>
        </div>
        <div class="toggle-switch ${appState.devices[dev] ? 'active' : ''}" data-settings-device-toggle="${dev}"></div>
      `;
      container.appendChild(item);
    });

    container.querySelectorAll('[data-settings-device-toggle]').forEach(toggle => {
      toggle.addEventListener('click', async () => {
        const dev = toggle.dataset.settingsDeviceToggle;
        appState.devices[dev] = !appState.devices[dev];
        await dbPut('settings', { key:'devices', data: appState.devices });
        if (appState.devices[dev]) {
          toggle.classList.add('active');
          toggle.style.background = '';
        } else {
          toggle.classList.remove('active');
          toggle.style.background = 'var(--muted)';
        }
        refreshDeviceCards();
        refreshMonitorDeviceSelector();
        if (!appState.devices[dev] && appState.connectedDevices[dev]) {
          appState.connectedDevices[dev] = false;
          await dbPut('settings', { key:'connectedDevices', data: appState.connectedDevices });
        }
      });
    });
  }

  // ===================== Permissions =====================
  document.querySelectorAll('[data-perm]').forEach(toggle => {
    toggle.addEventListener('click', async () => {
      const perm = toggle.dataset.perm;
      const errEl = document.getElementById('perm-error-' + perm);
      if (errEl) { errEl.classList.remove('show'); errEl.textContent = ''; }

      // 如果已经授权，再次点击=关闭权限
      if (appState.permissions[perm] === 'granted') {
        appState.permissions[perm] = 'denied';
        toggle.classList.remove('active');
        await dbPut('settings', { key:'permissions', data: appState.permissions });
        // 如果关闭的是摄像头权限且监测正在运行，立即停止监测并释放摄像头流
        if (perm === 'camera' && appState.monitorActive) {
          try { stopMonitoring(); } catch(e) { console.warn('停止监测失败:', e); }
          showAlert('摄像头权限已关闭，监测已自动停止', 'warn', '&#x26A0;');
        }
        return;
      }

      try {
        if (perm === 'camera') {
          // 弹窗确认后再请求摄像头权限
          showModal('请求摄像头权限', '护眼精灵需要使用摄像头来监测您的用眼健康状况。确认后将向浏览器请求摄像头访问权限。', '允许访问', false, async function() {
            try {
              const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
              const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: isMobile ? { ideal: 720, max: 1280 } : { ideal: 640, max: 1920 }, height: isMobile ? { ideal: 960, max: 1280 } : { ideal: 480, max: 1080 } }
              });
              stream.getTracks().forEach(t => t.stop());
              appState.permissions.camera = 'granted';
              toggle.classList.add('active');
              await dbPut('settings', { key:'permissions', data: appState.permissions });
              showAlert('摄像头权限已开启', 'info', '&#x2705;');
            } catch(err) {
              if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
                errEl.textContent = '用户取消了授权或浏览器不支持此API';
              } else {
                errEl.textContent = '错误：' + (err.message || err.name);
              }
              errEl.classList.add('show');
            }
          });
        } else if (perm === 'bluetooth') {
          // 真正请求蓝牙设备权限（硬件交互）
          const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
          if (!navigator.bluetooth) {
            errEl.textContent = isIOS ? 'iOS设备不支持Web Bluetooth API，请使用Android或桌面Chrome/Edge' : '您的浏览器不支持Web Bluetooth，请使用Chrome/Edge最新版';
            errEl.classList.add('show');
            return;
          }
          try {
            console.log('[权限] 请求蓝牙设备...');
            await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
            appState.permissions.bluetooth = 'granted';
            toggle.classList.add('active');
            showAlert('蓝牙权限已授权', 'info', '&#x2705;');
          } catch (btErr) {
            appState.permissions.bluetooth = 'denied';
            await dbPut('settings', { key:'permissions', data: appState.permissions });
            console.warn('[权限] 蓝牙请求失败:', btErr.name, btErr.message);
            if (btErr.name === 'NotAllowedError') {
              errEl.textContent = '用户取消了蓝牙设备选择';
            } else if (btErr.name === 'SecurityError') {
              errEl.textContent = '当前环境不支持蓝牙请求（请使用 HTTPS 或 localhost）';
            } else {
              errEl.textContent = '蓝牙请求失败：' + (btErr.message || btErr.name);
            }
            errEl.classList.add('show');
            toggle.classList.remove('active');
            return;
          }
        } else if (perm === 'usb') {
          // 真正请求USB端口权限（硬件交互）
          const isMobilePerm = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          if (!navigator.serial) {
            errEl.textContent = isMobilePerm ? '移动设备不支持Web Serial API，请使用桌面Chrome/Edge' : '您的浏览器不支持Web Serial，请使用Chrome/Edge最新版';
            errEl.classList.add('show');
            return;
          }
          try {
            console.log('[权限] 请求USB端口...');
            await navigator.serial.requestPort();
            appState.permissions.usb = 'granted';
            toggle.classList.add('active');
            showAlert('USB权限已授权', 'info', '&#x2705;');
          } catch (usbErr) {
            appState.permissions.usb = 'denied';
            await dbPut('settings', { key:'permissions', data: appState.permissions });
            console.warn('[权限] USB请求失败:', usbErr.name, usbErr.message);
            if (usbErr.name === 'NotAllowedError') {
              errEl.textContent = '用户取消了USB端口选择';
            } else if (usbErr.name === 'SecurityError') {
              errEl.textContent = '当前环境不支持USB请求（请使用 HTTPS 或 localhost）';
            } else {
              errEl.textContent = 'USB请求失败：' + (usbErr.message || usbErr.name);
            }
            errEl.classList.add('show');
            toggle.classList.remove('active');
            return;
          }
        } else if (perm === 'notification') {
          // 通知权限开关：点击时请求通知权限
          var currentPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'denied';
          if (currentPerm === 'granted') {
            // 已授权，点击关闭仅关闭自动请求标志（不影响已授权的权限）
            appState.permissions.autoRequestNotification = !appState.permissions.autoRequestNotification;
            if (appState.permissions.autoRequestNotification) {
              toggle.classList.add('active');
            } else {
              toggle.classList.remove('active');
              errEl.textContent = '已关闭通知（可在浏览器设置中重新开启）';
              errEl.classList.add('show');
            }
          } else if (currentPerm === 'default') {
            // 未授权，立即请求
            appState.permissions.autoRequestNotification = true;
            var notifResult2;
            if ((typeof Notification !== 'undefined') && typeof Notification.requestPermission === 'function') {
              var req2 = Notification.requestPermission();
              if (req2 && typeof req2.then === 'function') {
                notifResult2 = await req2;
              } else {
                notifResult2 = req2;
              }
            }
            appState.permissions.notification = notifResult2 || 'default';
            if (notifResult2 === 'granted') {
              toggle.classList.add('active');
              errEl.textContent = '桌面通知已开启！离开页面时会收到提醒';
              errEl.classList.add('show');
              // 发一条测试通知
              try { new Notification('眼部卫士', { body: '通知已开启，离开页面时将提醒您', icon: '', tag: 'test' }); } catch(e) {}
            } else {
              toggle.classList.remove('active');
              errEl.textContent = '通知权限被拒绝，请在浏览器地址栏左侧重新允许';
              errEl.classList.add('show');
            }
          } else {
            // denied
            errEl.textContent = '通知权限已被浏览器拒绝，请在浏览器设置中重新允许通知';
            errEl.classList.add('show');
            toggle.classList.remove('active');
          }
        }
        await dbPut('settings', { key:'permissions', data: appState.permissions });
      } catch(err) {
        console.warn('Permission denied:', perm, err);
        toggle.classList.remove('active');
        if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
          errEl.textContent = '用户取消了授权或浏览器不支持此API';
        } else {
          errEl.textContent = '错误：' + (err.message || err.name);
        }
        errEl.classList.add('show');
      }
    });
  });

  function refreshPermissionToggles() {
    Object.keys(appState.permissions).forEach(perm => {
      const toggle = document.getElementById('perm-toggle-' + perm);
      if (!toggle) return;
      if (perm === 'notification') {
        // 通知权限开关：基于实际的 Notification.permission 状态
        var actualPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'denied';
        toggle.classList.toggle('active', actualPerm === 'granted' && appState.permissions.autoRequestNotification !== false);
      } else if (perm !== 'autoRequestNotification') {
        toggle.classList.toggle('active', appState.permissions[perm] === 'granted');
      }
    });
  }

  // ===================== Scene Mode =====================
  document.getElementById('scene-mode-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('.scene-mode-btn');
    if (!btn) return;
    const scene = btn.dataset.scene;
    appState.scene = scene;
    document.querySelectorAll('.scene-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.scene === scene));
    applyScenePreset(scene);
  });

  function applyScenePreset(scene) {
    const preset = SCENE_PRESETS[scene];
    if (!preset) return;
    document.getElementById('scene-current-name').textContent = preset.name;
    if (scene === 'custom') {
      // Custom mode: keep current thresholds and show them
      const t = appState.thresholds;
      document.getElementById('scene-threshold-dist').textContent = t.distance + 'cm';
      document.getElementById('scene-threshold-time').textContent = t.interval + '分钟';
      document.getElementById('scene-threshold-blink').textContent = t.blink + '次/min';
      // 自动切换到设置页面让用户配置阈值
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById('page-settings').classList.add('active');
      const settingsNav = document.querySelector('.nav-item[data-page="settings"]');
      if (settingsNav) settingsNav.classList.add('active');
    } else {
      document.getElementById('scene-threshold-dist').textContent = preset.dist + 'cm';
      document.getElementById('scene-threshold-time').textContent = preset.time + '分钟';
      document.getElementById('scene-threshold-blink').textContent = preset.blink + '次/min';
      // Update sliders for preset modes
      appState.thresholds.distance = preset.dist;
      appState.thresholds.distanceWarn = preset.distWarn;
      appState.thresholds.interval = preset.time * 60;
      appState.thresholds.intervalMin = preset.time;
      appState.thresholds.intervalSec = 0;
      appState.thresholds.blink = preset.blink;
      appState.thresholds.blinkWarn = preset.blinkWarn;
      document.getElementById('slider-distance').value = preset.dist;
      document.getElementById('slider-distance-val').textContent = preset.dist + 'cm';
      var distWarnEl = document.getElementById('slider-distance-warn');
      if (distWarnEl) { distWarnEl.value = preset.distWarn; document.getElementById('slider-distance-warn-val').textContent = preset.distWarn + 'cm'; }
      var intMinEl = document.getElementById('setting-interval-min');
      var intSecEl = document.getElementById('setting-interval-sec');
      if (intMinEl) intMinEl.value = preset.time;
      if (intSecEl) intSecEl.value = 0;
      document.getElementById('slider-blink').value = preset.blink;
      document.getElementById('slider-blink-val').textContent = preset.blink + '次/min';
      var blinkWarnEl = document.getElementById('slider-blink-warn');
      if (blinkWarnEl) { blinkWarnEl.value = preset.blinkWarn; document.getElementById('slider-blink-warn-val').textContent = preset.blinkWarn + '次/min'; }
      var ps = document.getElementById('slider-posture');
      var pw = document.getElementById('slider-posture-warn');
      if (ps) { ps.value = appState.thresholds.posture; document.getElementById('slider-posture-val').textContent = appState.thresholds.posture + '°'; }
      if (pw) { pw.value = appState.thresholds.postureWarn; document.getElementById('slider-posture-warn-val').textContent = appState.thresholds.postureWarn + '°'; }
    }
    dbPut('settings', { key: 'scene', data: appState.scene });
  }

  // ===================== Threshold Sliders =====================
  document.getElementById('slider-distance').addEventListener('input', (e) => {
    const v = parseInt(e.target.value);
    document.getElementById('slider-distance-val').textContent = v + 'cm';
    appState.thresholds.distance = v;
    document.getElementById('scene-threshold-dist').textContent = v + 'cm';
    // 联动：warn 阈值不能低于 bad 阈值
    const warnEl = document.getElementById('slider-distance-warn');
    if (warnEl && +warnEl.value < v) {
      warnEl.value = v;
      appState.thresholds.distanceWarn = v;
      document.getElementById('slider-distance-warn-val').textContent = v + 'cm';
    }
  });
  document.getElementById('slider-distance-warn').addEventListener('input', (e) => {
    const v = +e.target.value;
    // 联动：warn 不能低于 bad
    const badEl = document.getElementById('slider-distance');
    if (badEl && v < +badEl.value) {
      e.target.value = +badEl.value;
      appState.thresholds.distanceWarn = +badEl.value;
      document.getElementById('slider-distance-warn-val').textContent = +badEl.value + 'cm';
      return;
    }
    appState.thresholds.distanceWarn = v;
    document.getElementById('slider-distance-warn-val').textContent = v + 'cm';
  });
  document.getElementById('setting-interval-min').addEventListener('input', (e) => {
    const v = parseInt(e.target.value) || 0;
    appState.thresholds.intervalMin = v;
    appState.thresholds.interval = v * 60 + appState.thresholds.intervalSec;
    const totalSec = appState.thresholds.interval;
    document.getElementById('scene-threshold-time').textContent = Math.floor(totalSec / 60) + '分' + (totalSec % 60) + '秒';
  });
  document.getElementById('setting-interval-sec').addEventListener('input', (e) => {
    const v = parseInt(e.target.value) || 0;
    appState.thresholds.intervalSec = v;
    appState.thresholds.interval = appState.thresholds.intervalMin * 60 + v;
    const totalSec = appState.thresholds.interval;
    document.getElementById('scene-threshold-time').textContent = Math.floor(totalSec / 60) + '分' + (totalSec % 60) + '秒';
  });
  document.getElementById('slider-blink').addEventListener('input', (e) => {
    const v = parseInt(e.target.value);
    document.getElementById('slider-blink-val').textContent = v + '次/min';
    appState.thresholds.blink = v;
    document.getElementById('scene-threshold-blink').textContent = v + '次/min';
    // 联动：warn 阈值不能低于 bad 阈值
    const warnEl = document.getElementById('slider-blink-warn');
    if (warnEl && +warnEl.value < v) {
      warnEl.value = v;
      appState.thresholds.blinkWarn = v;
      document.getElementById('slider-blink-warn-val').textContent = v + '次/min';
    }
  });
  document.getElementById('slider-blink-warn').addEventListener('input', (e) => {
    const v = +e.target.value;
    // 联动：warn 不能低于 bad
    const badEl = document.getElementById('slider-blink');
    if (badEl && v < +badEl.value) {
      e.target.value = +badEl.value;
      appState.thresholds.blinkWarn = +badEl.value;
      document.getElementById('slider-blink-warn-val').textContent = +badEl.value + '次/min';
      return;
    }
    appState.thresholds.blinkWarn = v;
    document.getElementById('slider-blink-warn-val').textContent = v + '次/min';
  });
  // ===================== Posture Threshold Sliders =====================
  function syncPostureSlider() {
    const v = parseInt(document.getElementById('slider-posture').value);
    const warnEl = document.getElementById('slider-posture-warn');
    document.getElementById('slider-posture-val').textContent = v + '°';
    appState.thresholds.posture = v;
    // 确保warn >= bad
    if (warnEl && parseInt(warnEl.value) < v) {
      warnEl.value = v;
      document.getElementById('slider-posture-warn-val').textContent = v + '°';
      appState.thresholds.postureWarn = v;
    }
  }
  function syncPostureWarnSlider() {
    const v = parseInt(document.getElementById('slider-posture-warn').value);
    const badEl = document.getElementById('slider-posture');
    document.getElementById('slider-posture-warn-val').textContent = v + '°';
    // 不能低于 bad：夹紧到 bad 阈值
    if (badEl && v < parseInt(badEl.value)) {
      const clamped = parseInt(badEl.value);
      document.getElementById('slider-posture-warn').value = clamped;
      document.getElementById('slider-posture-warn-val').textContent = clamped + '°';
      appState.thresholds.postureWarn = clamped;
      return;
    }
    appState.thresholds.postureWarn = v;
  }

  document.getElementById('slider-ear').addEventListener('input', (e) => {
    const v = parseInt(e.target.value);
    document.getElementById('slider-ear-val').textContent = '0.' + String(v).padStart(2, '0');
    appState.thresholds.ear = v;
  });

  // Save thresholds on change
  ['slider-distance', 'slider-distance-warn', 'slider-blink', 'slider-blink-warn', 'slider-posture', 'slider-posture-warn', 'slider-ear'].forEach(id => {
    document.getElementById(id).addEventListener('change', async () => {
      await dbPut('settings', { key:'thresholds', data: appState.thresholds });
    });
  });

  // ===================== Settings Save/Cancel =====================
  let settingsBackup = null;

  function backupSettings() {
    settingsBackup = JSON.parse(JSON.stringify(appState.thresholds));
    settingsBackup._alertSound = appState.alertSound;
    settingsBackup._alertPersistDuration = appState.alertPersistDuration;
    settingsBackup._alertDurationDistance = appState.alertDurationDistance;
    settingsBackup._alertDurationPosture = appState.alertDurationPosture;
    settingsBackup._alertDurationBlink = appState.alertDurationBlink;
  }

  function cancelSettings() {
    if (!settingsBackup) { showAlert('没有需要恢复的设置', 'info'); return; }
    appState.thresholds = { distance: settingsBackup.distance, distanceWarn: settingsBackup.distanceWarn, intervalMin: settingsBackup.intervalMin, intervalSec: settingsBackup.intervalSec, interval: settingsBackup.interval, blink: settingsBackup.blink, blinkWarn: settingsBackup.blinkWarn, posture: settingsBackup.posture, postureWarn: settingsBackup.postureWarn, ear: settingsBackup.ear, alertDuration: settingsBackup.alertDuration };
    appState.alertSound = settingsBackup._alertSound;
    appState.alertPersistDuration = settingsBackup._alertPersistDuration;
    appState.alertDurationDistance = settingsBackup._alertDurationDistance;
    appState.alertDurationPosture = settingsBackup._alertDurationPosture;
    appState.alertDurationBlink = settingsBackup._alertDurationBlink;
    refreshSettingsUI();
    showAlert('设置已恢复为上次保存的值', 'info');
  }

  async function saveSettings() {
    const distSlider = document.getElementById('slider-distance');
    const intervalMinEl = document.getElementById('setting-interval-min');
    const intervalSecEl = document.getElementById('setting-interval-sec');
    const blinkSlider = document.getElementById('slider-blink');
    const earSlider = document.getElementById('slider-ear');
    if (distSlider) appState.thresholds.distance = +distSlider.value;
    if (intervalMinEl) appState.thresholds.intervalMin = +intervalMinEl.value;
    if (intervalSecEl) appState.thresholds.intervalSec = +intervalSecEl.value;
    appState.thresholds.interval = appState.thresholds.intervalMin * 60 + appState.thresholds.intervalSec;
    if (blinkSlider) appState.thresholds.blink = +blinkSlider.value;
    if (earSlider) appState.thresholds.ear = +earSlider.value;
    const distWarnSlider = document.getElementById('slider-distance-warn');
    const blinkWarnSlider = document.getElementById('slider-blink-warn');
    const postureSlider = document.getElementById('slider-posture');
    const postureWarnSlider = document.getElementById('slider-posture-warn');
    if (distWarnSlider) appState.thresholds.distanceWarn = +distWarnSlider.value;
    if (blinkWarnSlider) appState.thresholds.blinkWarn = +blinkWarnSlider.value;
    if (postureSlider) appState.thresholds.posture = +postureSlider.value;
    if (postureWarnSlider) appState.thresholds.postureWarn = +postureWarnSlider.value;

    await dbPut('settings', { key: 'thresholds', data: appState.thresholds });
    await dbPut('settings', { key: 'alertSound', value: appState.alertSound });
    await dbPut('settings', { key: 'alertPersistDuration', value: appState.alertPersistDuration });
    await dbPut('settings', { key: 'alertDurationDistance', value: appState.alertDurationDistance });
    await dbPut('settings', { key: 'alertDurationPosture', value: appState.alertDurationPosture });
    await dbPut('settings', { key: 'alertDurationBlink', value: appState.alertDurationBlink });

    settingsBackup = JSON.parse(JSON.stringify(appState.thresholds));
    settingsBackup._alertSound = appState.alertSound;
    settingsBackup._alertPersistDuration = appState.alertPersistDuration;
    settingsBackup._alertDurationDistance = appState.alertDurationDistance;
    settingsBackup._alertDurationPosture = appState.alertDurationPosture;
    settingsBackup._alertDurationBlink = appState.alertDurationBlink;

    showAlert('设置已保存', 'success');
  }

  function refreshSettingsUI() {
    const distSlider = document.getElementById('slider-distance');
    const distVal = document.getElementById('slider-distance-val');
    if (distSlider) distSlider.value = appState.thresholds.distance;
    if (distVal) distVal.textContent = appState.thresholds.distance + 'cm';

    const intervalMinEl = document.getElementById('setting-interval-min');
    const intervalSecEl = document.getElementById('setting-interval-sec');
    if (intervalMinEl) intervalMinEl.value = appState.thresholds.intervalMin;
    if (intervalSecEl) intervalSecEl.value = appState.thresholds.intervalSec;

    const blinkSlider = document.getElementById('slider-blink');
    const blinkVal = document.getElementById('slider-blink-val');
    if (blinkSlider) blinkSlider.value = appState.thresholds.blink;
    if (blinkVal) blinkVal.textContent = appState.thresholds.blink + '次/min';

    const earSlider = document.getElementById('slider-ear');
    const earVal = document.getElementById('slider-ear-val');
    if (earSlider) earSlider.value = appState.thresholds.ear;
    if (earVal) earVal.textContent = '0.' + String(appState.thresholds.ear).padStart(2, '0');

    const distWarnSlider = document.getElementById('slider-distance-warn');
    const distWarnVal = document.getElementById('slider-distance-warn-val');
    if (distWarnSlider) distWarnSlider.value = appState.thresholds.distanceWarn;
    if (distWarnVal) distWarnVal.textContent = appState.thresholds.distanceWarn + 'cm';

    const blinkWarnSlider = document.getElementById('slider-blink-warn');
    const blinkWarnVal = document.getElementById('slider-blink-warn-val');
    if (blinkWarnSlider) blinkWarnSlider.value = appState.thresholds.blinkWarn;
    if (blinkWarnVal) blinkWarnVal.textContent = appState.thresholds.blinkWarn + '次/min';

    const postureSlider = document.getElementById('slider-posture');
    const postureVal = document.getElementById('slider-posture-val');
    if (postureSlider) postureSlider.value = appState.thresholds.posture;
    if (postureVal) postureVal.textContent = appState.thresholds.posture + '°';

    const postureWarnSlider = document.getElementById('slider-posture-warn');
    const postureWarnVal = document.getElementById('slider-posture-warn-val');
    if (postureWarnSlider) postureWarnSlider.value = appState.thresholds.postureWarn;
    if (postureWarnVal) postureWarnVal.textContent = appState.thresholds.postureWarn + '°';

    const soundToggle = document.getElementById('setting-alert-sound');
    if (soundToggle) {
      soundToggle.classList.toggle('active', appState.alertSound);
    }

    const durSliderDist = document.getElementById('setting-alert-duration-distance');
    const durValDist = document.getElementById('alert-duration-distance-val');
    if (durSliderDist) durSliderDist.value = appState.alertDurationDistance;
    if (durValDist) durValDist.textContent = appState.alertDurationDistance + '秒';

    const durSliderPosture = document.getElementById('setting-alert-duration-posture');
    const durValPosture = document.getElementById('alert-duration-posture-val');
    if (durSliderPosture) durSliderPosture.value = appState.alertDurationPosture;
    if (durValPosture) durValPosture.textContent = appState.alertDurationPosture + '秒';

    const durSliderBlink = document.getElementById('setting-alert-duration-blink');
    const durValBlink = document.getElementById('alert-duration-blink-val');
    if (durSliderBlink) durSliderBlink.value = appState.alertDurationBlink;
    if (durValBlink) durValBlink.textContent = appState.alertDurationBlink + '秒';
  }

  // ===================== Storage Info =====================
  async function refreshStorageInfo() {
    try {
      const sc = await dbCount('sessions');
      const ss = await dbCount('settings');
      const sc2 = await dbCount('calibration');
      document.getElementById('storage-count-sessions').textContent = sc;
      document.getElementById('storage-count-settings').textContent = ss;
      document.getElementById('storage-count-calibration').textContent = sc2;
    } catch(err) { console.warn('Storage info error:', err); }
  }

  // ===================== Export/Import =====================
  document.getElementById('btn-export-data').addEventListener('click', async () => {
    try {
      const data = {
        _version: 1,
        _exportedAt: new Date().toISOString(),
        sessions: await dbGetAll('sessions'),
        settings: await dbGetAll('settings'),
        calibration: await dbGetAll('calibration')
      };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type:'application/json' });
      const filename = 'eye-health-backup-' + new Date().toISOString().slice(0,10) + '.json';

      if (appState.exportFolderHandle) {
        try {
          const fileHandle = await appState.exportFolderHandle.getFileHandle(filename, { create:true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          showAlert('数据已导出到：' + appState.exportFolderHandle.name + '/' + filename, 'info', '&#x1F4BE;');
          return;
        } catch(err) {
          console.warn('Folder write failed, fallback to download:', err);
        }
      }
      // Fallback: browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      showAlert('数据已导出：' + filename, 'info', '&#x1F4BE;');
    } catch(err) {
      showAlert('导出失败：' + err.message, 'danger', '&#x26A0;');
    }
  });

  document.getElementById('btn-import-data').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
  });

  document.getElementById('import-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    showModal('导入数据', '确定要导入 ' + file.name + ' 吗？当前数据不会被覆盖，导入数据将合并。', '开始导入', false, async () => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data._version) throw new Error('无效的备份文件');
        let sessionCount = 0, settingCount = 0, calCount = 0;
        if (data.sessions && Array.isArray(data.sessions)) {
          for (const s of data.sessions) { await dbPut('sessions', s); sessionCount++; }
        }
        if (data.settings && Array.isArray(data.settings)) {
          for (const s of data.settings) { await dbPut('settings', s); settingCount++; }
        }
        if (data.calibration && Array.isArray(data.calibration)) {
          for (const c of data.calibration) { await dbPut('calibration', c); calCount++; }
        }
        showAlert('导入完成：' + sessionCount + ' 条监测、' + settingCount + ' 条设置、' + calCount + ' 条校准', 'info', '&#x2705;');
        await restoreAllSettings();
        refreshStorageInfo();
      } catch(err) {
        showAlert('导入失败：' + err.message, 'danger', '&#x26A0;');
      }
    });
  });

  // ===================== Folder Picker =====================
  document.getElementById('btn-pick-folder').addEventListener('click', async () => {
    if (!window.showDirectoryPicker) {
      showAlert('当前浏览器不支持文件夹选择 API，导出将使用浏览器默认下载位置', 'warn', '&#x26A0;');
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode:'readwrite' });
      appState.exportFolderHandle = handle;
      await dbPut('settings', { key:'exportFolder', data: { name: handle.name } });
      document.getElementById('export-folder-path').textContent = '已选择：' + handle.name;
      document.getElementById('btn-pick-folder').classList.add('selected');
      showAlert('导出文件夹已设置：' + handle.name, 'info', '&#x1F4C1;');
    } catch(err) {
      if (err.name !== 'AbortError') {
        showAlert('选择文件夹失败：' + err.message, 'danger', '&#x26A0;');
      }
    }
  });

  // ===================== Clear Data =====================
  document.getElementById('btn-clear-all-data').addEventListener('click', () => {
    document.getElementById('clear-data-confirm').classList.add('show');
  });
  document.getElementById('btn-clear-cancel').addEventListener('click', () => {
    document.getElementById('clear-data-confirm').classList.remove('show');
  });
  // 清理前导出备份链接
  document.getElementById('link-export-before-clear').addEventListener('click', () => {
    document.getElementById('btn-export-data').click();
  });

  document.getElementById('btn-clear-confirm').addEventListener('click', async () => {
    try {
      var scope = document.querySelector('input[name="clear-scope"]:checked');
      var clearMode = scope ? scope.value : 'sessions';

      if (clearMode === 'sessions') {
        // 仅清除监测记录
        await dbClear('sessions');
        document.getElementById('clear-data-confirm').classList.remove('show');
        showAlert('监测记录已清除，设置与激活码已保留', 'info', '&#x1F5D1;');
      } else {
        // 清除所有数据（包括Pro激活状态，换手机号登录需要重新激活）
        await dbClear('sessions');
        await dbClear('settings');
        await dbClear('calibration');

        // 重置Pro状态（不恢复，需要重新激活）
        appState.pro = { activated: false, code: null, activatedAt: null, planType: null, expiresAt: null };
        _proVerified = false;
        window._proServerValidated = false;
        window._proServerValid = false;

        document.getElementById('clear-data-confirm').classList.remove('show');
        // 清除隐私协议已接受标记，下次需要重新阅读
        localStorage.removeItem('eye_privacy_accepted');
        showAlert('所有数据已清除，Pro状态已重置，请重新激活', 'info', '&#x1F5D1;');
        // Re-init defaults
        Object.keys(DEVICE_DEFS).forEach(k => { appState.devices[k] = true; });
        appState.connectedDevices = {};
        appState.user = { nickname:'', role:'student', avatarColor:CONSTANTS.DEFAULT_AVATAR_GRADIENT, firstTime:true, avatarImage:'' };
        appState.thresholds = { distance:45, distanceWarn:55, intervalMin:0, intervalSec:30, interval:30, blink:10, blinkWarn:15, posture:70, postureWarn:80, ear:22 };
        appState.permissions = {};
        appState.exportFolderHandle = null;
        appState.boundPhone = null;
        renderUserProfile();
        refreshDeviceCards();
        refreshPermissionToggles();
        refreshSettingsDeviceList();
        // 先显示隐私协议，确认后再进入欢迎面板
        showPrivacyNotice();
      }
      refreshStorageInfo();
    } catch(err) {
      showAlert('清除失败：' + err.message, 'danger', '&#x26A0;');
    }
  });

  document.getElementById('btn-clear-browser-cache').addEventListener('click', () => {
    showAlert('请手动操作：按 Ctrl+Shift+Delete 打开浏览器清除缓存面板，或在浏览器设置中清除浏览数据', 'warn', '&#x1F4DD;');
  });

  // ===================== Monitor Device Selector =====================
  function refreshMonitorDeviceSelector() {
    const container = document.getElementById('monitor-device-selector');
    container.innerHTML = '';
    let hasAvailable = false;
    Object.keys(DEVICE_DEFS).forEach(dev => {
      const def = DEVICE_DEFS[dev];
      const enabled = appState.devices[dev];
      const connected = appState.connectedDevices[dev];
      const selected = appState.selectedMonitorDevice === dev;
      const chip = document.createElement('div');
      let statusClass = 'device-chip';
      let statusIcon = '';
      let clickHandler = null;
      if (!enabled) {
        statusClass += ' disabled';
        statusIcon = ' <span style="font-size:10px;color:var(--muted);opacity:0.6;">(已禁用)</span>';
      } else if (connected || (def.connType === 'camera')) {
        // camera 类型设备不需要预先连接即可选择
        statusClass += selected ? ' active' : (connected ? ' connected' : ' available');
        hasAvailable = true;
        statusIcon = selected ? '<span class="device-check">&#x2713;</span>' : (connected ? ' <span style="font-size:10px;color:var(--success);">●</span>' : ' <span style="font-size:10px;color:var(--muted);">○</span>');
        clickHandler = function() {
          appState.selectedMonitorDevice = dev;
          dbPut('settings', { key:'selectedMonitorDevice', value: dev });
          refreshMonitorDeviceSelector();
        };
      } else {
        statusClass += ' available';
        hasAvailable = true;
        statusIcon = ' <span style="font-size:10px;color:var(--muted);">○</span>';
        clickHandler = function() {
          connectDevice(dev);
        };
      }
      chip.className = statusClass;
      chip.dataset.device = dev;
      chip.innerHTML = '<span class="device-icon">' + def.icon + '</span>' + def.name + statusIcon;
      if (clickHandler) {
        chip.addEventListener('click', clickHandler);
      } else {
        chip.style.cursor = 'not-allowed';
        chip.style.opacity = '0.5';
      }
      container.appendChild(chip);
    });
    // Update title
    const titleEl = document.getElementById('monitor-device-title');
    if (titleEl) titleEl.textContent = '所有设备（点击选择或连接）';
  }

  // ===================== Real-time Monitoring =====================

  let monitorStream = null;
  let monitorAnimFrame = null; // setTimeout ID for monitor loop
  let monitorSessionStart = null;
  let monitorAlertCount = 0;
  let blinkHistory = [];
  let lastBlinkTime = 0;
  let monitorTooCloseStart = null;
  let lastBeepTime = 0;

  // 声音提醒相关变量
  let badStatusStartTime = {};
  let lastSoundAlertTime = 0;
  const SOUND_COOLDOWN = 15000; // 全局冷却：同一声音15秒内不重复

  let lastFallbackBrightness = undefined;
  let lastFrameBrightness = undefined;
  let lastEAR = undefined;
  let monitorCanvasCtx = null;

  // ====== MediaPipe Face Landmarker ======
  let faceLandmarker = null;
  let mediapipeInitializing = false;
  let mediapipeLastVideoTime = -1;

  // 暴露到 window 方便调试
  Object.defineProperty(window, 'faceLandmarker', {
    get: function() { return faceLandmarker; },
    set: function(v) { faceLandmarker = v; }
  });

  // 异步初始化 MediaPipe Face Landmarker
  // ============================================================
  // AI 模型本地缓存（IndexedDB）— 首次下载后永久复用
  // ============================================================
  var MODEL_CACHE_DB = 'eyeguard_model_cache';
  var MODEL_CACHE_STORE = 'models';
  var MODEL_CACHE_KEY = 'face_landmarker_task_v1';
  var MODEL_CACHE_VERSION = '20260718'; // 模型文件版本，变化时自动刷新缓存

  /**
   * 从 IndexedDB 读取缓存的模型文件，返回 Blob 或 null
   */
  function getCachedModel() {
    return new Promise(function(resolve) {
      try {
        var req = indexedDB.open(MODEL_CACHE_DB, 1);
        req.onupgradeneeded = function(e) {
          e.target.result.createObjectStore(MODEL_CACHE_STORE);
        };
        req.onsuccess = function(e) {
          try {
            var db = e.target.result;
            var tx = db.transaction(MODEL_CACHE_STORE, 'readonly');
            var store = tx.objectStore(MODEL_CACHE_STORE);
            var getReq = store.get(MODEL_CACHE_KEY);
            getReq.onsuccess = function() {
              var result = getReq.result;
              if (result && result.version === MODEL_CACHE_VERSION && result.blob instanceof Blob) {
                console.log('[模型缓存] 命中本地缓存: ' + (result.blob.size / 1024 / 1024).toFixed(1) + 'MB');
                resolve(result.blob);
              } else {
                resolve(null); // 无缓存或版本不匹配
              }
            };
            getReq.onerror = function() { resolve(null); };
            tx.oncomplete = function() { db.close(); };
          } catch(err) { resolve(null); }
        };
        req.onerror = function() { resolve(null); };
      } catch(err) { resolve(null); }
    });
  }

  /**
   * 将模型文件写入 IndexedDB 缓存
   */
  function setCachedModel(blob) {
    return new Promise(function(resolve) {
      try {
        var req = indexedDB.open(MODEL_CACHE_DB, 1);
        req.onupgradeneeded = function(e) {
          e.target.result.createObjectStore(MODEL_CACHE_STORE);
        };
        req.onsuccess = function(e) {
          try {
            var db = e.target.result;
            var tx = db.transaction(MODEL_CACHE_STORE, 'readwrite');
            var store = tx.objectStore(MODEL_CACHE_STORE);
            store.put({ version: MODEL_CACHE_VERSION, blob: blob, timestamp: Date.now() }, MODEL_CACHE_KEY);
            tx.oncomplete = function() {
              console.log('[模型缓存] 已保存到本地: ' + (blob.size / 1024 / 1024).toFixed(1) + 'MB');
              db.close();
              resolve(true);
            };
            tx.onerror = function() { db.close(); resolve(false); };
          } catch(err) { resolve(false); }
        };
        req.onerror = function() { resolve(false); };
      } catch(err) { resolve(false); }
    });
  }

  /**
   * 加载模型：优先从 IndexedDB 缓存读取，缓存未命中时从网络下载并缓存
   * 返回 Blob URL（调用方负责 revokeObjectURL）
   */
  async function loadModelWithCache() {
    // 1. 尝试从缓存读取
    var cachedBlob = await getCachedModel();
    if (cachedBlob) {
      var url = URL.createObjectURL(cachedBlob);
      return { url: url, fromCache: true };
    }

    // 2. 缓存未命中，从网络下载（优先官方CDN，再同域/PyAnywhere）
    console.log('[模型缓存] 本地无缓存，从网络下载...');
    var blob = null;
    // 官方CDN源优先（稳定可靠，全球加速）
    var sources = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/face_landmarker.task',
      'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      'face_landmarker.task'
    ];
    // GitHub Pages 等外部部署时，追加 PythonAnywhere 作为备用源
    var apiBase = typeof API_BASE_URL !== 'undefined' && API_BASE_URL ? API_BASE_URL : '';
    if (apiBase && location.hostname.indexOf('pythonanywhere.com') === -1) {
      sources.push(apiBase + '/face_landmarker.task');
    }
    for (var i = 0; i < sources.length; i++) {
      try {
        console.log('[模型缓存] 尝试: ' + sources[i]);
        var resp = await fetch(sources[i]);
        if (resp.ok) {
          blob = await resp.blob();
          console.log('[模型缓存] 下载成功: ' + sources[i] + ' (' + (blob.size / 1024 / 1024).toFixed(1) + 'MB)');
          break;
        }
      } catch(srcErr) {
        console.warn('[模型缓存] 下载失败: ' + sources[i] + ' - ' + srcErr.message);
      }
    }
    if (!blob) throw new Error('所有模型下载源均失败，请检查网络');

    // 3. 写入缓存
    await setCachedModel(blob);

    // 4. 返回 Blob URL
    var url = URL.createObjectURL(blob);
    return { url: url, fromCache: false };
  }

  async function initFaceLandmarker() {
    if (faceLandmarker) return;
    // 超时保护：如果初始化卡住超过8秒，重置标志允许重试（减少等待时间）
    if (mediapipeInitializing && window._mpiInitStart && Date.now() - window._mpiInitStart > 8000) {
      console.warn('MediaPipe 初始化超时(8s)，重置标志重试');
      mediapipeInitializing = false;
    }
    if (mediapipeInitializing) return;
    // 如果MediaPipe还没加载好，等待加载完成后自动初始化
    if (!window._mediapipeReady || !window.FaceLandmarker) {
      console.log('MediaPipe tasks-vision 尚未加载完成，等待中...');
      if (!window._mediapipeLoading && typeof loadMediaPipe === 'function') {
        loadMediaPipe();
      }
      // 2秒后重试（减少等待）
      setTimeout(initFaceLandmarker, 2000);
      return;
    }
    mediapipeInitializing = true;
    window._mpiInitStart = Date.now();

    // 更新UI状态为加载中
    var algoInfoEl = document.getElementById('algo-info');
    if (algoInfoEl) algoInfoEl.innerHTML = '&#x1F9E0; 算法: AI模型加载中，请稍候...';
    var _blobUrlToRevoke = null; // 跟踪blob URL以便后续释放，声明在try外部

    try {
      console.log('MediaPipe: 开始加载WASM...');
      // 进度：阶段3 - 加载WASM运行时
      window._updateAILoadingProgress && window._updateAILoadingProgress(50, '加载AI推理引擎(WASM)...');
      const vision = await window.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
      );
      console.log('MediaPipe: WASM加载完成，开始加载模型...');
      // 进度：阶段4 - 加载面部检测模型
      window._updateAILoadingProgress && window._updateAILoadingProgress(70, '加载468点面部关键点模型...');
      if (algoInfoEl) algoInfoEl.innerHTML = '&#x1F9E0; 算法: AI模型加载中 (70%)...';

      // 使用缓存机制加载模型
      var modelResult = await loadModelWithCache();
      var modelPath = modelResult.url;
      _blobUrlToRevoke = modelResult.url;
      if (modelResult.fromCache) {
        console.log('MediaPipe: 使用本地缓存的模型（秒加载）');
        window._updateAILoadingProgress && window._updateAILoadingProgress(85, '从本地缓存加载模型...');
      } else {
        console.log('MediaPipe: 使用新下载的模型');
      }

      // 先尝试GPU，失败后降级CPU（关闭不需要的blendshapes和transformation计算以提升性能）
      try {
        faceLandmarker = await window.FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'GPU'
          },
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
          runningMode: 'VIDEO',
          numFaces: 1
        });
      } catch(gpuErr) {
        console.warn('MediaPipe GPU模式失败，降级CPU:', gpuErr.message);
        faceLandmarker = await window.FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'CPU'
          },
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
          runningMode: 'VIDEO',
          numFaces: 1
        });
      }
      // 模型加载成功后释放blob URL，避免内存泄漏
      if (_blobUrlToRevoke) { URL.revokeObjectURL(_blobUrlToRevoke); _blobUrlToRevoke = null; }
      if (algoInfoEl) algoInfoEl.innerHTML = '&#x1F9E0; 算法: MediaPipe 468点3D面部关键点 + EAR几何计算 (已加载)';
      console.log('MediaPipe Face Landmarker 初始化成功');
      // 进度：完成！启用监测按钮
      window._updateAILoadingProgress && window._updateAILoadingProgress(100, 'AI模型加载完成，可以开始监测');
      window._enableStartButton && window._enableStartButton(true);
      // 如果正在监测中，更新状态提示为AI模式
      if (appState && appState.monitorActive) {
        updateMonitorStatus('face', 'good', '画面分析: AI面部检测运行中');
        updateMonitorStatus('ear', 'good', '眨眼检测: 运行中');
        updateMonitorStatus('dist', 'good', '距离估算: 运行中');
        updateMonitorStatus('posture', 'good', '坐姿检测: 运行中');
      }
    } catch(err) {
      // 初始化失败时释放blob URL，避免内存泄漏
      if (_blobUrlToRevoke) { URL.revokeObjectURL(_blobUrlToRevoke); }
      console.warn('MediaPipe 初始化失败，将使用像素分析降级方案:', err.message || err);
      if (algoInfoEl) algoInfoEl.innerHTML = '&#x1F9E0; 算法: 像素分析模式（AI模型加载失败，已自动降级）';
      // AI模型加载失败，也启用按钮（使用降级模式）
      window._updateAILoadingProgress && window._updateAILoadingProgress(100, 'AI加载失败，已切换到像素分析模式');
      window._enableStartButton && window._enableStartButton(true, '开启监测(降级模式)');
      if (IS_MOBILE) {
        console.warn('移动端MediaPipe加载失败，可能是设备内存不足或网络问题，已自动降级为像素分析');
      }
    } finally {
      mediapipeInitializing = false;
      // 初始化完成（无论成功或失败）后重置预初始化标志，允许后续重试
      if (!faceLandmarker) {
        window._mediapipePreinit = false;
      }
    }
  }

  // 标准 EAR 计算：使用6个眼睛关键点
  // 左眼: 33(外角), 160(上1), 158(上2), 133(内角), 153(下1), 144(下2)
  // 右眼: 362(内角), 385(上1), 387(上2), 263(外角), 373(下1), 380(下2)
  function calculateEAR(landmarks) {
    if (!landmarks || landmarks.length < 400) return 0.3; // 防护：landmarks无效时返回默认值
    try {
    // 左眼 EAR
    const lp1 = landmarks[33], lp2 = landmarks[160], lp3 = landmarks[158];
    const lp4 = landmarks[133], lp5 = landmarks[153], lp6 = landmarks[144];
    const leftVert = (Math.abs(lp2.y - lp6.y) + Math.abs(lp3.y - lp5.y)) / 2;
    const leftHoriz = Math.abs(lp1.x - lp4.x);
    const leftEAR = leftHoriz > 0.0001 ? leftVert / leftHoriz : 0.3;

    // 右眼 EAR
    const rp1 = landmarks[362], rp2 = landmarks[385], rp3 = landmarks[387];
    const rp4 = landmarks[263], rp5 = landmarks[373], rp6 = landmarks[380];
    const rightVert = (Math.abs(rp2.y - rp6.y) + Math.abs(rp3.y - rp5.y)) / 2;
    const rightHoriz = Math.abs(rp1.x - rp4.x);
    const rightEAR = rightHoriz > 0.0001 ? rightVert / rightHoriz : 0.3;

    return (leftEAR + rightEAR) / 2;
    } catch(e) { return 0.3; }
  }

  // 从关键点计算面部宽度（归一化坐标，需乘以画面宽度得到像素宽度）
  function getFaceWidthPx(landmarks, videoWidth) {
    // 点234=左脸颊边缘，点454=右脸颊边缘
    return Math.abs(landmarks[454].x - landmarks[234].x) * videoWidth;
  }

  // 从关键点计算头部姿态角度
  function getHeadPosture(landmarks) {
    try {
      // 使用眼睛中点和鼻尖的相对位置估算俯仰角(pitch)
      const noseTip = landmarks[1];
      const leftEye = landmarks[33];
      const rightEye = landmarks[263];
      const eyeMidY = (leftEye.y + rightEye.y) / 2;
      const eyeMidX = (leftEye.x + rightEye.x) / 2;

      // 水平偏转（左右倾斜 roll）：两眼连线与水平线的角度
      const eyeAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 180 / Math.PI;

      // 俯仰角（pitch）：鼻尖相对于眼睛中线的垂直偏移
      const noseOffset = noseTip.y - eyeMidY;
      const pitchDeg = Math.round(90 - (noseOffset - 0.06) * 300);

      // 水平偏转（yaw）：鼻尖相对于两眼中点的水平偏移（有正负，表示左偏/右偏）
      const yawOffset = noseTip.x - eyeMidX;
      // 左右倾斜角度（度）：绝对值越大越偏
      const yawDeg = Math.round(Math.abs(yawOffset) * 300);

      // 前后姿态评分（pitch为主）：坐直时pitch≈90
      let pitchRawScore = Math.round(pitchDeg - Math.abs(eyeAngle) * 0.2);
      if (isNaN(pitchRawScore) || !isFinite(pitchRawScore)) pitchRawScore = 85;
      pitchRawScore = Math.min(120, Math.max(10, pitchRawScore));
      // 暴露原始值（未应用校准系数）供校准采集使用
      window.currentRawPostureScore = pitchRawScore;
      // 应用校准系数：将当前计算值按比例缩放到标准（校准位置=90°）
      let pitchScore = pitchRawScore;
      const calPosture = appState.calibrationData && appState.calibrationData.posture;
      if (calPosture && calPosture.factor && calPosture.factor > 0.5 && calPosture.factor < 2.0) {
        pitchScore = Math.round(pitchRawScore * calPosture.factor);
      } else if (calPosture && calPosture.value && calPosture.value > 10 && calPosture.value < 120) {
        const factor = 90 / calPosture.value;
        pitchScore = Math.round(pitchRawScore * factor);
        appState.calibrationData.posture = { factor: factor, normalizedY: calPosture.normalizedY || 0.35 };
      }
      if (isNaN(pitchScore) || !isFinite(pitchScore)) pitchScore = 85;
      pitchScore = Math.min(120, Math.max(10, pitchScore));

      // 左右姿态评分：yawDeg越小越好（0=正中），15度内正常
      let yawScore = Math.max(20, Math.round(100 - yawDeg * 3));

      return { pitch: pitchDeg || 0, roll: eyeAngle || 0, yaw: yawOffset || 0, yawDeg: yawDeg || 0, pitchScore: pitchScore, yawScore: yawScore, score: Math.min(pitchScore, yawScore) };
    } catch(e) {
      return { pitch: 90, roll: 0, yaw: 0, yawDeg: 0, pitchScore: 85, yawScore: 85, score: 50 };
    }
  }

  // ===================== Pro 授权系统 =====================
  var PLAN_CONFIG = {
    week: { price: '2.88', label: '周卡', days: 7, name: 'Pro 周卡' },
    month: { price: '8.88', label: '月卡', days: 30, name: 'Pro 月卡' },
    year: { price: '88.8', label: '年卡', days: 365, name: 'Pro 年卡' },
    lifetime: { price: '商议', label: '终身', days: 36500, name: 'Pro 终身版' }
  };
  // Embedded QR code images (base64) - single-file mode
  var EMBEDDED_QR_WECHAT = 'data:image/png;base64,' +
    '' +
    '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' +
    'LOCEHGDbtm1w+vRpLekTJ07AF7/4jzAyoj9S9O/+7u/g+uuv1x6/efToUfjGN74BJ06ckKSoytrb2wvjExNa3pQMuvvuu+GGG26A' +
    'CxcuKNONjIzAl770JXjjjTe0NHfvfg7efvttmD9/viJVWa+jR4+i5Dxw4ADcf/990NDQiEqvB4eurtWwadMm6Ozs1KZ+4okn4Kc/' +
    '/SmMj48r0zU1NcHmzZuhpaUlwKkM2TI8XW5RbG8D69b9IfzZn/0vuOyyyyQp6K2n9vb2sN0Vr37961+HF198UWj7YHXiHRGKwa5d' +
    'u+DQoUPyI2crmJychNdffx1Fk4KHH34Y2tvbFSkiFaXBerOjowM+//nPw6JFi7Rs165dGzk6WiyEjV5dY2MjPPjgg3Dttddq065Y' +
    'sQLa2tqq8itspYz3Af0PHjwITz75JLz77rtU0Y3gs5/9LNx8882aOAowPDwEj3/tcRgYGIg/jOTnkaNHYWhoyKict91+O2z4xCfK' +
    '9hez9b/r6uqiEZcd0haFdxSh6rpr1y6+YsUK/5g71fXZZ5/lk5OTWr779u3jq1ev1tILXnWfVatW8UOHDkkUFeld0urvHSmJ4e99' +
    'TOlDpYe9Uo7z3Lx5M29qatLSXblyJT906JDcntN6P4tez549i7b9vffeGz9KVYL169ejaG7s6eF9fX04eYn6YXDP5s184cKFzvzJ' +
    '1se0Pyfxe1P5dPTIUdJRqphPW1sb379/v3F/wtLz4r1NH1B9dgaOsVXJefToUf/4Zhf+7B1jayOf0HPgXq/Vn0L076tX738eOS5T' +
    'd9XBBj0mHRMMpazoxPz0Ir2DVwpM6UOlR+Eb0kshDg+sRqbQjV3rcHZOavd0c5sSmjK5eHr9kIKGhn2z9idbMO3Pif1TlI/YfKqQ' +
    '9PLdNNB+l7CcqK6uh5oZIl+S1EtWZMXGM+k4pBgJFrHJM41iAG1aWSViCFxjmLLh9HOAoeQ1CD+fIuYQQdooiqZLk59Z2ZnIRzjH' +
    'lsZtqfwLtPWlCAjZM00+WqzjpHmu5GnOT5z7HFPIEPnauawyRMWK5Z3agYxvI8MHZ2+EQUqsmtLGPmx9KhJNfYOgmPBtpe1ocLQN' +
    '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';
  var EMBEDDED_QR_ALIPAY = 'data:image/png;base64,' +
    '' +
    '/9j/4QDSRXhpZgAATU0AKgAAAAgABgEAAAQAAAABAAACsAEBAAQAAAABAAACpAExAAIAAAAQAAAAVodpAAQAAAABAAAAegESAAMA' +
    'AAABAAAAAAEyAAIAAAAUAAAAZgAAAABBbmRyb2lkIEdhbGxlcnkAMjAyNjowNzoxMyAxOTowMDo0MwAAA5J8AAIAAAABAAAAAJKG' +
    'AAIAAAABAAAAAJIIAAQAAAABAAAAAAAAAAAAAQEyAAIAAAAUAAAAtgAAAAAyMDI2OjA3OjEzIDE5OjAwOjQzAP/gABBKRklGAAEB' +
    'AAABAAEAAP/iAhhJQ0NfUFJPRklMRQABAQAAAggAAAAABDAAAG1udHJSR0IgWFlaIAfgAAEAAQAAAAAAAGFjc3AAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAABAAD21gABAAAAANMtAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAACWRlc2MAAADwAAAAZHJYWVoAAAFUAAAAFGdYWVoAAAFoAAAAFGJYWVoAAAF8AAAAFHd0cHQAAAGQAAAAFHJUUkMAAAGk' +
    'AAAAKGdUUkMAAAGkAAAAKGJUUkMAAAGkAAAAKGNwcnQAAAHMAAAAPG1sdWMAAAAAAAAAAQAAAAxlblVTAAAARgAAABwARABpAHMA' +
    'cABsAGEAeQAgAFAAMwAgAEcAYQBtAHUAdAAgAHcAaQB0AGgAIABzAFIARwBCACAAVAByAGEAbgBzAGYAZQByAABYWVogAAAAAAAA' +
    'g94AAD2+////u1hZWiAAAAAAAABKvgAAsTYAAAq5WFlaIAAAAAAAACg7AAARDAAAyM1YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEA' +
    'AAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABl' +
    'ACAASQBuAGMALgAgADIAMAAxADb/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB' +
    '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' +
    'qsvaeEZDUKiRPFv9SimE7Q3JAZR5SVHA0dCr3XKEsmf+vriAPDfM/Tx2kEA3Olp+EjlwsFLIbMvjBSGktO+RlM6a8iMjtO9FzGdT' +
    'ih8gcpsvcnqMmVVR5dj6nx9OZbUfKKIkUxqHHS2VSfAYioI0ok0B5jjpZLpVgsTiMXjRDlcCG0IQw/bGYKLk2HIc7cyxAUDyksQq' +
    'jtJIABJG0RTe2ozb0/eSxADwRNeerkqzKYahjnzXTvCJcL9WhCIgjQ+ZRiL8jc26nUspXlzFvGBK/wDMAV4h5VuAwupIBOysWoLo' +
    'jW7q1J59Z4ah67zx1ryms8/c1swM4KzllI5iZGS6m8DU+ZNXzat5/gKewUy05TfG4WnoE5nEZJZgZnMJvjsNhcJgutmuIipEZwlU' +
    'cJ8q/KX59jhPlX5S93x/5921PbwKndcfZ/199385+nnu7vrXOz+rn8R4FTuuP6QGvv8AOfp4/hc9OfwWCYWkJndEWxZ2VFAPESWI' +
    'AsqcTtzPIKrMTyUFrDa3HulMRDh7rPdqwWvdtBmkeGrqA8JokLIKgzEhpEQsrxEAJKKSWAiGGHEDEmBwQPQqt12Fbq9QGvgPwMqG' +
    'LmZp5iQ1YqVDPDGl5CyqTeyPCf3kWG/C6cRs3Ok5a7t2dmvmdu6sispNJlXZMaC6/q3Rtk/VObdDZvT3M6osstMk5xGSVEz3Mic0' +
    'bnnQFKziup1TFCyqaVVMaYouj6cxVQ4qZ4iU0rJ5fFl8vlgUtGjIis7cQVFLMWUooCgsSXcKigAc2d1QWuWAudojm9sgRH3pm8qj' +
    'AWVdeereIyNxLGSHFz9rsQ4rwnAdIblgAzABCUWIUMbDiL3uXpqe9F4kL5AaBygdGYQssdQsKIVVgWVX9lCwUsBa7I68yHhxFJQ9' +
    'uspOjGaEd5jlRljvFM9c3NWdI50a9cv6R1lZwUvlJXOUEiywpzM3U3JsLnbW0iy3ktZZGV9VMooaS1PXM1lVKy6p6zrCo8JT+Flm' +
    'HmtVTiYQsdMZiE0tITO6ItizsqKAeIksQBZU4nbmeQVWYnkoLWG1uPdK4iHD3We7Vgm920F6R4auoDwmiQsgqDMSGkRCVeIliSik' +
    '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';
  var _selectedPlan = 'week';

  function validateActivationCode(code, planType) {
    code = (code || '').trim().toUpperCase();
    // Support both old format (EYE-XXXX-XXXX-XXXX) and new format (EYE-XXXXXX-XXXX)
    var isNewFormat = code.match(/^EYE-[A-Z0-9]{6}-[A-Z0-9]{4}$/);
    var isOldFormat = code.match(/^EYE-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    if (!isNewFormat && !isOldFormat)
      return { valid: false, msg: '格式无效，正确格式: EYE-XXXXXX-XXXX' };
    // For new format, accept any valid format (random generation)
    if (isNewFormat) return { valid: true, msg: '' };
    // Old format: check checksum
    var parts = code.replace('EYE-', '').split('-');
    var baseCheck = parts[2].charCodeAt(0) + parts[2].charCodeAt(1);
    var planOffset = { week: 3, month: 1, year: 2, lifetime: 0 };
    if ((baseCheck + (planOffset[planType] || 0)) % 7 !== 0)
      return { valid: false, msg: '激活码校验失败，请检查输入' };
    return { valid: true, msg: '' };
  }

  function selectPlan(plan) {
    _selectedPlan = plan;
    document.querySelectorAll('.plan-card').forEach(function(c) { c.classList.remove('selected'); });
    var card = document.querySelector('.plan-card[data-plan="' + plan + '"]');
    if (card) card.classList.add('selected');
    var cfg = PLAN_CONFIG[plan] || PLAN_CONFIG['month'];
    var label = document.getElementById('pro-price-label');
    if (label && cfg) label.textContent = cfg.name + ' ' + cfg.price + '元';
  }



  function generateActivationCode(planType) {
    // 激活码由服务器生成，本地不生成
    return '';
  }

  var _proStep = 1;

  function updateStepIndicator(step) {
    for (var i = 1; i <= 3; i++) {
      var dot = document.getElementById('pro-step-dot-' + i);
      if (dot) {
        dot.style.background = i <= step ? CONSTANTS.GOLD : 'var(--muted)';
        dot.style.opacity = i <= step ? '1' : '0.4';
      }
    }
  }

  function showStep(step) {
    _proStep = step;
    updateStepIndicator(step);
    var steps = ['pro-step-1', 'pro-step-2', 'pro-step-3'];
    steps.forEach(function(id, idx) {
      var el = document.getElementById(id);
      if (el) el.style.display = (idx === step - 1) ? 'block' : 'none';
    });
  }

  function goToStep1() { showStep(1); }

  function goToStep2() {
    var cb = document.getElementById('pro-qq-check');
    if (!cb || !cb.checked) return;
    showStep(2);
    selectPlan('month');
    switchPayMethod('wechat');
  }

  function goToStep3() {
    showStep(3);
    // 自动填充已绑定的手机号到输入框
    var phoneInput = document.getElementById('pro-phone-input');
    var boundPhone = appState.user.phone || appState.pro.boundPhone || appState.boundPhone || '';
    if (phoneInput && boundPhone) {
      phoneInput.value = boundPhone;
    }
  }

  // Checkbox listener
  (function() {
    setTimeout(function() {
      var cb = document.getElementById('pro-qq-check');
      var btn = document.getElementById('btn-step1-next');
      if (cb && btn) {
        cb.addEventListener('change', function() {
          if (cb.checked) {
            btn.disabled = false;
            btn.style.background = 'var(--gradient-primary)';
            btn.style.color = '#fff';
            btn.style.border = 'none';
          } else {
            btn.disabled = true;
            btn.style.background = 'var(--bg3)';
            btn.style.color = 'var(--muted)';
            btn.style.border = '1px solid var(--rule)';
          }
        });
      }
    }, 100);
  })();


  var _currentPayMethod = 'wechat';
  function switchPayMethod(method) {
    _currentPayMethod = method;
    var qrImg = document.getElementById('pro-qrcode-img');
    var qrPlaceholder = document.getElementById('pro-qrcode-placeholder');
    var tabW = document.getElementById('pay-tab-wechat');
    var tabA = document.getElementById('pay-tab-alipay');
    if (method === 'wechat') {
      tabW.style.background = CONSTANTS.WECHAT_GREEN; tabW.style.color = CONSTANTS.DEVTOOLS_TEXT; tabW.style.borderColor = CONSTANTS.WECHAT_GREEN;
      tabA.style.background = 'transparent'; tabA.style.color = 'var(--ink)'; tabA.style.borderColor = 'var(--rule)';
    } else {
      tabA.style.background = CONSTANTS.ALIPAY_BLUE; tabA.style.color = CONSTANTS.DEVTOOLS_TEXT; tabA.style.borderColor = CONSTANTS.ALIPAY_BLUE;
      tabW.style.background = 'transparent'; tabW.style.color = 'var(--ink)'; tabW.style.borderColor = 'var(--rule)';
    }
    if (qrImg) qrImg.style.display = 'none';
    if (qrPlaceholder) qrPlaceholder.style.display = 'flex';
    if (qrPlaceholder) qrPlaceholder.innerHTML = '<div style="font-size:2rem;margin-bottom:4px;">&#x1F4B3;</div><div>加载中...</div>';
    var qrSrc = null;
    if (method === 'wechat' && typeof EMBEDDED_QR_WECHAT !== 'undefined') qrSrc = EMBEDDED_QR_WECHAT;
    if (method === 'alipay' && typeof EMBEDDED_QR_ALIPAY !== 'undefined') qrSrc = EMBEDDED_QR_ALIPAY;
    if (qrSrc) {
      var testImg = new Image();
      testImg.onload = function() {
        qrImg.src = qrSrc;
        qrImg.style.display = 'block';
        qrPlaceholder.style.display = 'none';
      };
      testImg.onerror = function() {
        if (qrPlaceholder) qrPlaceholder.innerHTML = '<div style="font-size:1.5rem;margin-bottom:4px;">&#x274C;</div><div>图片加载失败</div>';
      };
      testImg.src = qrSrc;
    }
  }

  function showProModal() {
    var actArea = document.getElementById('pro-activated-area');
    // Reset to step 1 for non-activated users
    var cb = document.getElementById('pro-qq-check');
    if (cb) cb.checked = false;
    var btn = document.getElementById('btn-step1-next');
    if (btn) { btn.disabled = true; btn.style.background = 'var(--bg3)'; btn.style.color = 'var(--muted)'; btn.style.border = '1px solid var(--rule)'; }
    var m = document.getElementById('pro-modal');
    if (m) { m.style.display = 'flex'; setTimeout(function(){ m.classList.add('open'); }, 10); }

    // 如果本地显示已激活，打开弹窗时实时联网验证（防止撤销后未刷新页面）
    if (appState.pro.activated && appState.pro.code && API_BASE_URL && appState.pro.planType !== 'lifetime') {
      var verifyInfo = document.getElementById('pro-activated-info');
      if (verifyInfo) verifyInfo.textContent = '正在验证激活状态...';
      // 使用服务端 Pro 校验（带 HMAC 签名验证）
      checkProOnServer().then(function(isValid) {
        if (isValid) {
          _proVerified = true;
          renderProModalActivated();
        } else {
          // checkProOnServer 已处理清除逻辑
          updateProUI();
        }
      }).catch(function() {
        // 网络错误时信任本地缓存
        if (isPro()) renderProModalActivated();
      });
      // 先显示加载状态
      var step1 = document.getElementById('pro-step-1');
      var step2 = document.getElementById('pro-step-2');
      var step3 = document.getElementById('pro-step-3');
      if (step1) step1.style.display = 'none';
      if (step2) step2.style.display = 'none';
      if (step3) step3.style.display = 'none';
      if (actArea) actArea.style.display = 'block';
      updateStepIndicator(3);
      return;
    }

    if (isPro()) {
      renderProModalActivated();
    } else {
      if (actArea) actArea.style.display = 'none';
      // Show step 1
      showStep(1);
    }
  }

  // 渲染Pro已激活区域（含会员权益展示）
  function renderProModalActivated() {
    var step1 = document.getElementById('pro-step-1');
    var step2 = document.getElementById('pro-step-2');
    var step3 = document.getElementById('pro-step-3');
    var actArea = document.getElementById('pro-activated-area');
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'none';
    if (step3) step3.style.display = 'none';
    if (actArea) actArea.style.display = 'block';
    updateStepIndicator(3);
    var info = document.getElementById('pro-activated-info');
    var cfg = PLAN_CONFIG[appState.pro.planType || 'month'];
    var phone = appState.pro.boundPhone || appState.boundPhone || '';
    var maskedPhone = phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '-';
    var maskedCode = appState.pro.code ? appState.pro.code.substring(0, 8) + '****' : '-';
    var expireText = '';
    var totalCodes = appState.pro.totalCodes || 1;
    if (appState.pro.expiresAt && appState.pro.planType !== 'lifetime') {
      var d = new Date(appState.pro.expiresAt);
      var daysLeft = Math.ceil((appState.pro.expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
      daysLeft = Math.max(0, daysLeft);
      var dateStr = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
      expireText = ' | 到期: <strong>' + dateStr + '</strong>（剩余 ' + daysLeft + ' 天）';
      if (totalCodes > 1) {
        expireText += '<br><span style="font-size:0.68rem;">(' + totalCodes + ' 个激活码叠加)</span>';
      }
    }
    if (info) {
      info.innerHTML = (cfg ? cfg.name : 'Pro') + ' | 绑定: ' + maskedPhone + '<br>' +
        '<span style="font-size:0.72rem;opacity:0.7;">激活码: ' + maskedCode + expireText + '</span>';
    }
  }

  // 打开续费面板（跳转到步骤2的激活码输入）
  function openRenewPanel() {
    var actArea = document.getElementById('pro-activated-area');
    var step2 = document.getElementById('pro-step-2');
    if (actArea) actArea.style.display = 'none';
    if (step2) {
      showStep(2);
      // 预设手机号（已绑定的）
      var phoneInput = document.getElementById('pro-phone-input');
      var phone = appState.user.phone || appState.pro.boundPhone || appState.boundPhone || '';
      if (phoneInput && phone) {
        phoneInput.value = phone;
        phoneInput.readOnly = true;
        phoneInput.style.background = 'var(--bg3)';
      }
      var msgEl = document.getElementById('pro-activate-msg');
      if (msgEl) {
        msgEl.textContent = '请输入新的激活码续费/升级，时长将自动叠加';
        msgEl.style.color = 'var(--accent)';
      }
    }
  }

  function hideProModal() { var m = document.getElementById('pro-modal'); if (m) { m.classList.remove('open'); setTimeout(function(){ m.style.display = 'none'; }, 300); } }



  // API endpoint for online verification (configurable)
  // 智能检测：同域部署时 API_BASE_URL 留空（同源请求），跨域时自动指向 PythonAnywhere
  var _savedUrl = localStorage.getItem('eye_api_url');
  var API_BASE_URL = '';
  if (_savedUrl) {
    API_BASE_URL = _savedUrl;
  } else if (location.hostname.indexOf('pythonanywhere.com') === -1 && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    // GitHub Pages 等外部部署，需要指定后端地址
    API_BASE_URL = 'https://18073951649.pythonanywhere.com';
  }

  function setApiUrl(url) {
    API_BASE_URL = url;
    localStorage.setItem('eye_api_url', url);
  }

  var _proBadgeClickCount = 0;
  var _proBadgeClickTimer = null;
  function onProBadgeClick() {
    _proBadgeClickCount++;
    clearTimeout(_proBadgeClickTimer);
    _proBadgeClickTimer = setTimeout(function() { _proBadgeClickCount = 0; }, 2000);
    if (_proBadgeClickCount >= 5) {
      _proBadgeClickCount = 0;
      var config = document.getElementById('pro-api-config');
      var input = document.getElementById('pro-api-url-input');
      if (config) {
        config.style.display = config.style.display === 'none' ? 'block' : 'none';
        if (input && config.style.display === 'block') input.value = API_BASE_URL;
      }
    }
  }

  function saveUserApiUrl() {
    var input = document.getElementById('pro-api-url-input');
    var status = document.getElementById('pro-api-status');
    if (!input) return;
    var url = input.value.trim();
    if (url && !url.startsWith('http')) {
      url = 'http://' + url;
    }
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    setApiUrl(url);
    if (status) {
      status.textContent = '已保存: ' + (url || '未设置');
      status.style.color = 'var(--accent)';
      setTimeout(function() { status.textContent = ''; }, 2000);
    }
  }

  function activatePro() {
    var input = document.getElementById('pro-activate-input');
    var phoneInput = document.getElementById('pro-phone-input');
    var msgEl = document.getElementById('pro-activate-msg');
    var code = (input.value || '').trim().toUpperCase();
    var phone = (phoneInput ? phoneInput.value.trim() : '');
    // 强制使用用户已绑定的手机号，防止输入不同手机号绕过绑定
    var boundPhone = appState.user.phone || appState.pro.boundPhone || appState.boundPhone || '';
    if (boundPhone && phone !== boundPhone) {
      phone = boundPhone;
      if (phoneInput) { phoneInput.value = boundPhone; phoneInput.readOnly = true; phoneInput.style.background = 'var(--bg3)'; phoneInput.style.opacity = '0.8'; phoneInput.style.cursor = 'not-allowed'; }
    }
    msgEl.textContent = ''; msgEl.style.color = 'var(--muted)';

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      msgEl.textContent = '请输入正确的11位手机号'; msgEl.style.color = 'var(--danger)'; return;
    }
    if (!code) { msgEl.textContent = '请输入激活码'; msgEl.style.color = 'var(--danger)'; return; }

    msgEl.textContent = '正在联网验证...'; msgEl.style.color = 'var(--muted)';

    // 强制联网验证
    if (API_BASE_URL === null || API_BASE_URL === undefined) {
      msgEl.textContent = '未配置验证服务器，请联系管理员'; msgEl.style.color = 'var(--danger)'; return;
    }
    msgEl.textContent = '正在联网验证激活码...'; msgEl.style.color = 'var(--muted)';
    safeApiFetch(API_BASE_URL + '/api/activate', {
      method: 'POST',
      body: JSON.stringify({ code: code, phone: phone })
    })
    .then(function(data) {
      if (data.success) {
        handleActivationSuccess(code, phone, data);
      } else {
        msgEl.textContent = data.msg || '激活失败'; msgEl.style.color = 'var(--danger)';
      }
    }).catch(function(err) {
      msgEl.textContent = '网络连接失败，请检查网络后重试'; msgEl.style.color = 'var(--danger)';
    });
  }

  function handleActivationSuccess(code, phone, data) {
    var msgEl = document.getElementById('pro-activate-msg');
    var planType = data.plan || 'month';
    var remainingDays = data.remaining_days || PLAN_CONFIG[planType].days;
    var isRenewal = data.is_renewal || false;

    // 优先使用服务器返回的精确到期时间戳，否则用剩余天数估算
    var expiresAt;
    if (data.expires_at) {
      expiresAt = data.expires_at * 1000; // 秒转毫秒
    } else {
      expiresAt = Date.now() + remainingDays * 24 * 60 * 60 * 1000;
    }

    // 记录使用过的激活码（防止重复利用）
    dbPut('used_codes', { key: code, value: { phone: phone, activatedAt: Date.now(), planType: planType } });

    // 更新本地会员状态
    appState.pro = {
      activated: true,
      code: code,
      activatedAt: Date.now(),
      planType: planType,
      expiresAt: expiresAt,
      boundPhone: phone,
      totalCodes: data.total_codes || 1,
      isRenewal: isRenewal
    };
    _proVerified = true;
    dbPut('settings', { key: 'proLicense', value: appState.pro });
    dbPut('settings', { key: 'boundPhone', value: phone });

    // 同步手机号到用户信息
    if (phone && !appState.user.phone) {
      appState.user.phone = phone;
      dbPut('settings', { key: 'user', data: appState.user });
    }

    // Pro激活后停止免费计时器
    if (typeof stopFreeTimer === 'function') stopFreeTimer();

    if (isRenewal) {
      msgEl.textContent = '续费成功！已叠加 ' + data.added_days + ' 天，共剩余 ' + remainingDays + ' 天';
    } else {
      msgEl.textContent = '激活成功！已绑定 ' + phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') + '，有效期 ' + remainingDays + ' 天';
    }
    msgEl.style.color = 'var(--accent)';
    updateProUI();
    setTimeout(function() {
      renderProModalActivated();
    }, 1200);
  }

  function checkProExpired() {
    if (!appState.pro.activated) return false;
    if (appState.pro.planType === 'lifetime') return false;
    if (appState.pro.expiresAt && Date.now() > appState.pro.expiresAt) {
      // Expired
      appState.pro = { activated: false, code: null, activatedAt: null, planType: null, expiresAt: null };
      dbPut('settings', { key: 'proLicense', value: appState.pro });
      updateProUI();
      showAlert('Pro 会员已到期，请重新订阅', 'warn', '⏰');
      return true;
    }
    return false;
  }

  function updateProUI() {
    var sb = document.getElementById('pro-upgrade-sidebar');
    var tb = document.getElementById('pro-timer-badge');
    if (!sb) return;
    // Check expiration first
    checkProExpired();
    if (isPro()) {
      var cfg = PLAN_CONFIG[appState.pro.planType || 'month'];
      sb.classList.add('pro-activated');
      var labelText = 'Pro ' + (cfg ? cfg.label : '');
      if (appState.pro.expiresAt && appState.pro.planType !== 'lifetime') {
        var d = new Date(appState.pro.expiresAt);
        var dateStr = d.getMonth()+1 + '/' + d.getDate();
        labelText += ' (到期' + dateStr + ')';
      }
      sb.querySelector('.pro-upgrade-text').textContent = labelText;
      if (tb) tb.style.display = 'none';
      unlockProPages();
    } else {
      sb.classList.remove('pro-activated');
      sb.querySelector('.pro-upgrade-text').textContent = '升级解锁全部功能';
      lockProPages();
    }
  }

  function lockProPages() {
    // 数据统计页和健康报告页：Pro专属
    ['page-stats', 'page-report'].forEach(function(id) {
      var p = document.getElementById(id);
      if (p && !p.querySelector('.pro-locked-mask')) {
        p.classList.add('pro-lock-overlay');
        var c = p.firstElementChild; if (c) c.classList.add('pro-locked-blur');
        var mask = document.createElement('div'); mask.className = 'pro-locked-mask';
        mask.innerHTML = '<div class="lock-icon">🔒</div><div class="lock-text">此功能需要 Pro 版</div><button class="lock-btn" onclick="showProModal()">升级 Pro</button>';
        p.appendChild(mask);
      }
    });
  }

  function unlockProPages() {
    ['page-stats', 'page-report'].forEach(function(id) {
      var p = document.getElementById(id); if (!p) return;
      p.classList.remove('pro-lock-overlay');
      var b = p.querySelector('.pro-locked-blur'); if (b) b.classList.remove('pro-locked-blur');
      var m = p.querySelector('.pro-locked-mask'); if (m) m.remove();
    });
    // 解锁后立即初始化图表（如果是stats页面）
    if (typeof echarts !== 'undefined') {
      initAllCharts();
    }
  }

  var _freeTimerInterval = null, _freeSecondsRemaining = 0;
  var _proDailyTimerInterval = null, _proDailyUsedSeconds = 0; // Pro用户每日使用时长追踪
  window._freeServerQueried = false; // 标记是否已向服务器查询过免费试用剩余时间
  // _freeUsageReportTimer 在第5925行声明（联网免费试用追踪区域）
  var _pendingReportSeconds = 0; // 待上报的秒数（累计到整分钟再上报）

  // 获取今天的日期字符串（UTC+8，与服务器保持一致，防止跨时区日期错乱）
  function _getTodayStrUTC8() {
    var now = new Date();
    // 调整到UTC+8时区
    var utc8Time = now.getTime() + 8 * 3600 * 1000;
    var d = new Date(utc8Time);
    return d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate();
  }

  function startFreeTimer() {
    if (isPro()) { startProDailyTimer(); return; }
    var today = _getTodayStrUTC8();
    if (appState.freeMinutesDate !== today) {
      appState.freeMinutesUsedToday = 0;
      appState.freeMinutesDate = today;
    }

    // 联网查询服务器剩余时间（服务器为准，防止本地篡改）
    queryServerFreeUsage().then(function(serverUsedMinutes) {
      var totalLimitSec = appState.freeDailyLimit * 60;
      window._freeServerQueried = true;

      if (serverUsedMinutes < 0) {
        // 联网失败（-1），使用本地记录（可被篡改但聊胜于无）
        var savedUsed = 0;
        try { var s = localStorage.getItem('eyeguard_free_' + today); if (s) savedUsed = parseFloat(s) || 0; } catch(e) {}
        var localUsed = Math.max(savedUsed, appState.freeMinutesUsedToday || 0);
        _freeSecondsRemaining = Math.max(0, totalLimitSec - localUsed * 60);
        appState.freeMinutesUsedToday = localUsed;
        console.warn('[免费试用] 联网查询失败，使用本地记录: 已用 ' + localUsed + ' 分钟');
      } else {
        // 服务器查询成功，以服务器为准
        var serverUsedSec = Math.round(serverUsedMinutes * 60);
        _freeSecondsRemaining = Math.max(0, totalLimitSec - serverUsedSec);
        appState.freeMinutesUsedToday = Math.ceil(serverUsedMinutes);
      }

      var badge = document.getElementById('pro-timer-badge');
      if (badge) badge.style.display = 'flex';
      updateFreeTimerDisplay();

      // 如果已经用完
      if (_freeSecondsRemaining <= 0) {
        stopMonitoring();
        showAlert('今日免费试用时间已用完（' + appState.freeDailyLimit + '分钟），升级 Pro 解锁无限制使用', 'warn', '⏰');
        return;
      }

      // 启动本地秒级倒计时
      if (_freeTimerInterval) clearInterval(_freeTimerInterval);
      _freeTimerInterval = setInterval(function() {
        _freeSecondsRemaining--;
        _pendingReportSeconds++;
        appState.freeMinutesUsedToday = Math.ceil((totalLimitSec - _freeSecondsRemaining) / 60);
        updateFreeTimerDisplay();
        dbPut('settings', { key: 'freeTimeUsage', value: { date: today, minutes: appState.freeMinutesUsedToday } });

        // 每累计60秒，向服务器上报1分钟
        if (_pendingReportSeconds >= 60) {
          var minutesToReport = Math.floor(_pendingReportSeconds / 60);
          _pendingReportSeconds = _pendingReportSeconds % 60;
          reportServerFreeUsage(minutesToReport);
        }

        if (_freeSecondsRemaining <= 0) {
          clearInterval(_freeTimerInterval);
          _freeTimerInterval = null;
          // 停止前上报剩余秒数
          if (_pendingReportSeconds > 0) {
            reportServerFreeUsage(_pendingReportSeconds / 60);
            _pendingReportSeconds = 0;
          }
          stopMonitoring();
          showAlert('今日免费试用时间已用完（' + appState.freeDailyLimit + '分钟），升级 Pro 解锁无限制使用', 'warn', '⏰');
        }
      }, 1000);
    });
  }

  function stopFreeTimer() {
    if (_freeTimerInterval) {
      clearInterval(_freeTimerInterval);
      _freeTimerInterval = null;
    }
    // 停止时上报累计的待上报秒数
    if (_pendingReportSeconds > 0) {
      reportServerFreeUsage(_pendingReportSeconds / 60);
      _pendingReportSeconds = 0;
    }
    if (_freeUsageReportTimer) {
      clearInterval(_freeUsageReportTimer);
      _freeUsageReportTimer = null;
    }
    var b = document.getElementById('pro-timer-badge');
    if (b) b.style.display = 'none';
    stopProDailyTimer();
  }
  // Pro用户每日使用时长追踪（不限制使用时间，只统计）
  function startProDailyTimer() {
    var today = _getTodayStrUTC8();
    // 从IndexedDB恢复今日已用时长
    var todayKey = 'proDaily_' + today;
    dbGet('settings', todayKey).then(function(rec) {
      _proDailyUsedSeconds = (rec && rec.value) ? rec.value : 0;
      // 如果日期不是今天，说明跨天了，重置
      if (rec && rec.date && rec.date !== today) {
        _proDailyUsedSeconds = 0;
      }
      updateSidebarDailyTimer();
      // 启动秒级计时器
      if (_proDailyTimerInterval) clearInterval(_proDailyTimerInterval);
      _proDailyTimerInterval = setInterval(function() {
        _proDailyUsedSeconds++;
        // 每30秒持久化一次（减少IndexedDB写入频率）
        if (_proDailyUsedSeconds % 30 === 0) {
          dbPut('settings', { key: 'proDaily_' + today, value: _proDailyUsedSeconds, date: today });
        }
        updateSidebarDailyTimer();
      }, 1000);
    }).catch(function() {
      _proDailyUsedSeconds = 0;
      updateSidebarDailyTimer();
      if (_proDailyTimerInterval) clearInterval(_proDailyTimerInterval);
      _proDailyTimerInterval = setInterval(function() {
        _proDailyUsedSeconds++;
        if (_proDailyUsedSeconds % 30 === 0) {
          dbPut('settings', { key: 'proDaily_' + today, value: _proDailyUsedSeconds, date: today });
        }
        updateSidebarDailyTimer();
      }, 1000);
    });
  }
  function stopProDailyTimer() {
    if (_proDailyTimerInterval) {
      clearInterval(_proDailyTimerInterval);
      _proDailyTimerInterval = null;
    }
    // 停止时持久化
    if (_proDailyUsedSeconds > 0) {
      var today = _getTodayStrUTC8();
      dbPut('settings', { key: 'proDaily_' + today, value: _proDailyUsedSeconds, date: today });
    }
    var timerEl = document.getElementById('sidebar-daily-timer');
    if (timerEl && !isPro()) timerEl.style.display = 'none';
  }
  function updateFreeTimerDisplay() {
    var el = document.getElementById('pro-timer-remaining'); if (!el) return;
    var m = Math.floor(_freeSecondsRemaining / 60), s = _freeSecondsRemaining % 60;
    el.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    el.style.color = _freeSecondsRemaining <= 300 ? 'var(--danger)' : '';
    updateSidebarDailyTimer();
  }
  // 更新侧边栏中的每日使用时长显示（免费用户显示剩余，Pro用户显示已用）
  function updateSidebarDailyTimer() {
    var timerEl = document.getElementById('sidebar-daily-timer');
    var valueEl = document.getElementById('sidebar-daily-value');
    if (!timerEl || !valueEl) return;
    timerEl.style.display = 'flex';
    var totalLimit = appState.freeDailyLimit || 40;
    if (isPro()) {
      // Pro用户：显示今日已用时长（从免费计时器的逻辑推导）
      var usedMin = appState.freeMinutesUsedToday || 0;
      // Pro用户也需要追踪每日使用时间
      if (typeof _proDailyUsedSeconds !== 'undefined' && _proDailyUsedSeconds > 0) {
        usedMin = Math.ceil(_proDailyUsedSeconds / 60);
      }
      valueEl.textContent = usedMin + '分钟';
      timerEl.querySelector('.sdt-label').textContent = '今日已用';
    } else {
      // 免费用户：显示剩余时长
      var remaining = Math.floor(_freeSecondsRemaining / 60);
      valueEl.textContent = remaining + '分钟';
      timerEl.querySelector('.sdt-label').textContent = '今日剩余';
      valueEl.style.color = remaining <= 5 ? 'var(--danger)' : 'var(--accent)';
    }
  }
  var _proVerified = false;
  var _apiWarningShown = false;

  // ==================== 设备指纹生成 ====================
  var _deviceFingerprint = null;
  function generateDeviceFingerprint() {
    if (_deviceFingerprint) return _deviceFingerprint;
    try {
      var components = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
        (new Date()).getTimezoneOffset(),
        navigator.hardwareConcurrency || '',
        navigator.platform || '',
        navigator.maxTouchPoints || 0
      ];
      // Canvas指纹
      try {
        var canvas = document.createElement('canvas');
        canvas.width = 200; canvas.height = 50;
        var ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = CONSTANTS.PRIMARY;
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('EyeGuard_FP', 2, 15);
        ctx.fillStyle = 'rgba(102,204,0,0.7)';
        ctx.fillText('EyeGuard_FP', 4, 17);
        components.push(canvas.toDataURL());
      } catch(e) {}
      // WebGL指纹
      try {
        var gl = document.createElement('canvas').getContext('webgl');
        var ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) components.push(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
      } catch(e) {}
      var raw = components.join('|||');
      // 简单哈希
      var hash = 0;
      for (var i = 0; i < raw.length; i++) {
        var char = raw.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      _deviceFingerprint = 'fp_' + Math.abs(hash).toString(36) + '_' + raw.length.toString(36);
      return _deviceFingerprint;
    } catch(e) {
      _deviceFingerprint = 'fp_' + Date.now().toString(36);
      return _deviceFingerprint;
    }
  }

  // ==================== 联网免费试用追踪 ====================
  var _freeUsageReportTimer = null;
  var _serverFreeMinutesUsed = -1; // -1表示未联网查询

  function queryServerFreeUsage() {
    if (API_BASE_URL === null || API_BASE_URL === undefined || isPro()) return Promise.resolve(0);
    var fp = generateDeviceFingerprint();
    return safeApiFetch(API_BASE_URL + '/api/free_usage', {
      method: 'POST',
      body: JSON.stringify({ action: 'query', device_fp: fp })
    })
    .then(function(data) {
      if (data.success) {
        _serverFreeMinutesUsed = data.used_minutes;
        return data.used_minutes; // 返回已用分钟数
      }
      return -1; // 服务器返回失败，标记为未知
    }).catch(function() {
      return -1; // 网络错误，标记为未知（不能用0，否则断网=无限免费）
    });
  }

  function reportServerFreeUsage(minutes) {
    if (API_BASE_URL === null || API_BASE_URL === undefined || isPro()) return;
    if (minutes <= 0) return;
    var fp = generateDeviceFingerprint();
    fetch(API_BASE_URL + '/api/free_usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'report', device_fp: fp, minutes: Math.round(minutes * 10) / 10 })
    }).catch(function() {});
  }

  
  // ==================== 安全加固：服务端 Pro 校验 ====================
  window._proServerValidated = false;
  window._proServerValid = false;

  function checkProOnServer() {
    // 非激活状态不需要校验
    if (!appState.pro.activated || !appState.pro.code) return Promise.resolve(false);
    if (API_BASE_URL === null || API_BASE_URL === undefined) return Promise.resolve(!!appState.pro.activated);

    var phone = appState.pro.boundPhone || appState.user.phone || '';
    // 终身版也需要联网校验手机号绑定关系（防止换号后仍保留Pro）
    return safeApiFetch(API_BASE_URL + '/api/pro_check', {
      method: 'POST',
      body: JSON.stringify({ code: appState.pro.code, phone: phone })
    }).then(function(data) {
      window._proServerValidated = true;
      if (data.valid && data.is_pro) {
        window._proServerValid = true;
        // 同步服务器返回的到期时间
        if (data.expires_at) {
          appState.pro.expiresAt = data.expires_at * 1000;
        }
        if (data.remaining_days !== undefined && data.plan !== 'lifetime') {
          appState.pro.expiresAt = Date.now() + data.remaining_days * 24 * 60 * 60 * 1000;
        }
        if (data.active_codes_count) {
          appState.pro.totalCodes = data.active_codes_count;
        }
        dbPut('settings', { key: 'proLicense', value: appState.pro });
        return true;
      } else {
        window._proServerValid = false;
        // 服务器说无效，清除本地状态
        if (data.valid === false) {
          appState.pro = { activated: false, code: null, activatedAt: null, planType: null, expiresAt: null };
          _proVerified = false;
          dbPut('settings', { key: 'proLicense', value: appState.pro });
          updateProUI();
          showAlert('您的会员状态已在服务器端失效，请重新激活', 'warn', '⏰');
        }
        return false;
      }
    }).catch(function() {
      // 网络错误时：终身版信任本地缓存（离线容错），其他类型也信任本地
      window._proServerValidated = false;
      return !!appState.pro.activated;
    });
  }

  // 在 showProModal 中增强服务器校验

function isPro() {
    if (!appState.pro.activated) return false;
    // 如果已通过服务端校验，信任服务端结果
    if (window._proServerValidated) {
      return window._proServerValid;
    }
    // 未联网校验时，用本地缓存判断（离线容错）
    // 月卡/年卡必须已通过联网校验
    if (appState.pro.planType !== 'lifetime' && !_proVerified) return false;
    // 终身版：需要触发联网校验（校验手机号绑定关系），未校验前暂不显示Pro
    if (appState.pro.planType === 'lifetime' && !_proVerified) {
      // 触发异步校验，校验完成前暂时返回false
      if (API_BASE_URL && !window._lifetimeCheckTriggered) {
        window._lifetimeCheckTriggered = true;
        checkProOnServer().then(function(valid) {
          if (valid) {
            _proVerified = true;
            updateProUI();
          } else {
            appState.pro = { activated: false, code: null, activatedAt: null, planType: null, expiresAt: null };
            dbPut('settings', { key: 'proLicense', value: appState.pro });
            updateProUI();
            showAlert('终身版需要联网验证手机号绑定关系，验证失败已重置', 'warn', '&#x26A0;');
          }
        });
      }
      return false;
    }
    if (appState.pro.planType === 'lifetime') {
      // 已通过校验的终身版，离线时信任本地缓存
      return true;
    }
    if (appState.pro.expiresAt && Date.now() > appState.pro.expiresAt) {
      appState.pro = { activated: false, code: null, activatedAt: null, planType: null, expiresAt: null };
      dbPut('settings', { key: 'proLicense', value: appState.pro });
      updateProUI();
      return false;
    }
    return true;
  }

  var btnStartMonitor = document.getElementById('btn-start-monitor');
  if (btnStartMonitor) btnStartMonitor.addEventListener('click', startMonitoring);

  // ====== AI加载进度条和按钮控制 ======
  window._updateAILoadingProgress = function(percent, text) {
    var bar = document.getElementById('ai-loading-progress');
    var label = document.getElementById('ai-loading-text');
    if (bar) bar.style.width = Math.max(0, Math.min(100, percent)) + '%';
    if (label) label.textContent = text || '';
    // 同步更新全屏加载界面进度条
    var fullBar = document.getElementById('loading-progress-fill');
    var fullText = document.getElementById('loading-progress-text');
    if (fullBar) fullBar.style.width = Math.max(0, Math.min(100, percent)) + '%';
    if (fullText) fullText.textContent = text || '';
  };

  window._enableStartButton = function(enabled, customText) {
    var btn = document.getElementById('btn-start-monitor');
    var bar = document.getElementById('ai-loading-bar');
    var label = document.getElementById('ai-loading-text');
    if (!btn) return;
    if (enabled) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.textContent = customText || '开启监测';
      if (bar) { bar.style.transition = 'opacity 0.5s'; bar.style.opacity = '0'; setTimeout(function() { bar.style.display = 'none'; }, 500); }
      if (label) { label.style.transition = 'opacity 0.5s'; label.style.opacity = '0'; }
      // 加载完成：淡出全屏加载界面，显示主界面
      var loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
        loadingScreen.classList.add('hidden');
      }
    } else {
      btn.disabled = true;
      btn.style.opacity = '0.6';
      btn.style.cursor = 'not-allowed';
    }
  };

  // 权限引导弹窗：首次使用时提示用户即将请求摄像头和通知权限
  // 修复：合并引导弹窗和实际权限请求，避免用户需要点击两次（弹窗确认+浏览器授权）
  var _permissionGuideShown = false;
  function _showPermissionGuideAndRequest() {
    return new Promise(function(resolve) {
      // 防止重复弹出权限引导
      if (_permissionGuideShown) { resolve(); return; }

      // 检查是否需要请求任何权限（camera 或 notification 仍为 default/prompt 状态）
      var needCam = (!appState.permissions.camera || appState.permissions.camera === 'prompt' || appState.permissions.camera === 'default');
      var needNotif = (typeof Notification !== 'undefined') && Notification.permission === 'default';
      var needGuide = needCam || needNotif;
      console.log('[权限引导] needCamera=' + needCam + ', needNotification=' + needNotif + ', needGuide=' + needGuide);

      if (!needGuide) {
        // 所有权限已授权，直接继续
        _permissionGuideShown = true;
        resolve();
        return;
      }

      // 构建引导弹窗内容
      var items = [];
      if (needCam) {
        items.push('&#x1F4F7; <b>摄像头权限</b> — 用于实时面部检测、距离和坐姿监测');
      }
      if (needNotif) {
        items.push('&#x1F514; <b>通知权限</b> — 用于在用眼疲劳时推送提醒通知');
      }
      var guideHTML = '<div style="text-align:center;margin-bottom:16px;">'
        + '<div style="font-size:2rem;margin-bottom:8px;">&#x1F6E1;</div>'
        + '<div style="font-size:1rem;font-weight:600;color:var(--ink);margin-bottom:4px;">需要授权以下权限</div>'
        + '<div style="font-size:0.78rem;color:var(--muted);">点击下方按钮后，浏览器将弹出授权请求</div>'
        + '</div>'
        + '<div style="background:var(--bg-card);border-radius:10px;padding:14px;margin-bottom:16px;">'
        + items.map(function(item) {
          return '<div style="padding:8px 0;font-size:0.82rem;color:var(--ink);border-bottom:1px solid var(--border);">' + item + '</div>';
        }).join('')
        + '</div>'
        + '<div style="font-size:0.72rem;color:var(--muted);text-align:center;">&#x1F512; 权限仅在本地使用，不会上传任何视频数据</div>';

      showModal(
        '权限授权',
        '',
        '立即授权',
        false,
        function() {
          _permissionGuideShown = true; // 确认授权后才标记为已展示
          // 用户点击"立即授权"后，依次请求所有权限（避免并行请求被吞）
          (async function() {
            // 1. 先请求通知权限（轻量级，不阻塞其他）
            if (needNotif) {
              try {
                console.log('[权限引导] 正在请求通知权限...');
                if (typeof Notification !== 'undefined' && Notification.requestPermission) {
                  var permResult = await Notification.requestPermission();
                  appState.permissions.notification = permResult;
                  console.log('[权限引导] 通知权限结果:', permResult);
                }
              } catch(e) {
                console.warn('[权限引导] 通知权限请求异常:', e);
                var _isFile4 = window.location && window.location.protocol === 'file:';
                if (_isFile4) { console.log('[权限引导] file:// 协议下通知权限可能不可用'); }
              }
            }
            // 2. 再请求摄像头权限
            if (needCam) {
              try {
                console.log('[权限引导] 正在请求摄像头权限...');
                var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                var stream = await navigator.mediaDevices.getUserMedia({
                  video: { facingMode: 'user', width: isMobile ? { ideal: 720, max: 1280 } : { ideal: 640, max: 1920 }, height: isMobile ? { ideal: 960, max: 1280 } : { ideal: 480, max: 1080 } }
                });
                // 获取成功后立即释放（startMonitoring 会重新获取）
                stream.getTracks().forEach(function(t) { t.stop(); });
                appState.permissions.camera = 'granted';
                await dbPut('settings', { key:'permissions', data: appState.permissions });
                console.log('[权限引导] 摄像头权限已获取');
              } catch(camErr) {
                console.warn('[权限引导] 摄像头权限获取失败:', camErr.name, camErr.message);
                appState.permissions.camera = 'denied';
                await dbPut('settings', { key:'permissions', data: appState.permissions });
                var _isFile3 = window.location && window.location.protocol === 'file:';
                if (_isFile3) {
                  showAlert('浏览器不允许 file:// 协议访问摄像头，请通过 http://localhost 或 HTTPS 访问本页面', 'error', '&#x1F6AB;');
                }
              }
            }
            resolve();
          })();
        },
        function() {
          // 取消回调：用户点击取消时重置标志，避免阻塞
          _permissionGuideShown = false;
          resolve();
        }
      );
      // 替换 modal-desc 内容为 HTML
      var descEl = document.getElementById('modal-desc');
      if (descEl) {
        descEl.innerHTML = guideHTML;
      }
    });
  }

  async function startMonitoring() {
    // 防止重复调用
    if (appState.monitorActive) { showAlert('监测已在运行中', 'warn', '&#x26A0;'); return; }
    // 检查应用内摄像头权限状态：如果用户在设置中主动关闭了摄像头权限，弹窗提示重新开启
    if (appState.permissions.camera === 'denied') {
      showModal('摄像头权限已关闭', '您之前在设置中关闭了摄像头权限，监测需要摄像头才能工作。是否重新开启摄像头权限？', '重新开启', false, function() {
        appState.permissions.camera = 'prompt';
        dbPut('settings', { key:'permissions', data: appState.permissions });
        var camToggle = document.querySelector('[data-perm="camera"]');
        if (camToggle) camToggle.classList.remove('active');
        // 递归调用 startMonitoring 继续流程
        startMonitoring();
      });
      return;
    }
    // 联网检查：必须联网才能开始监测（离线模式跳过）
    var isOfflineBundle = (window.location && window.location.protocol === 'file:') || !!window._OFFLINE_MODEL_AVAILABLE;
    if (!navigator.onLine && !isOfflineBundle) {
      showAlert('当前无网络连接，请检查网络后重试', 'error', '&#x1F6AB;');
      return;
    }
    // 首次使用时显示权限引导弹窗（内含摄像头和通知权限的合并请求，避免用户点击两次）
    await _showPermissionGuideAndRequest();
    // 通知权限已在引导弹窗中请求过，此处仅兜底（如果引导弹窗被跳过但通知仍为default）
    if (appState.permissions.autoRequestNotification !== false) {
      try {
        if ((typeof Notification !== 'undefined') && Notification.permission === 'default') {
          console.log('[权限] 兜底：请求通知权限...');
          var notifResult;
          if (typeof Notification.requestPermission === 'function') {
            var req = Notification.requestPermission();
            if (req && typeof req.then === 'function') {
              notifResult = await req;
            } else {
              notifResult = req;
            }
          }
          console.log('[权限] 通知权限结果:', notifResult);
        }
      } catch(e) { console.warn('[权限] 通知权限请求异常:', e); }
    }
    const dev = appState.selectedMonitorDevice || 'laptop';
    if (!appState.devices[dev]) { showAlert('该设备已禁用', 'warn', '&#x26A0;'); return; }
    const def = DEVICE_DEFS[dev];
    // camera 类型设备不需要预先连接，直接尝试获取摄像头
    if (def && def.connType !== 'camera' && !appState.connectedDevices[dev]) {
      showAlert('请先连接 ' + def.name, 'warn', '&#x26A0;');
      return;
    }

    try {
      // 先停止旧摄像头流（防止泄漏）
      if (monitorStream) { try { monitorStream.getTracks().forEach(t => t.stop()); } catch(e) {} monitorStream = null; }
      // 预检查摄像头权限状态：如果已被永久拒绝，提示用户手动开启，不再自动弹窗请求
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permStatus = await navigator.permissions.query({name: 'camera'});
          if (permStatus.state === 'denied') {
            showAlert('摄像头权限已被拒绝，请在浏览器地址栏左侧的权限图标中允许摄像头访问', 'warn', '&#x26A0;');
            appState.permissions.camera = 'denied';
            await dbPut('settings', { key:'permissions', data: appState.permissions });
            refreshDeviceCards();
            var camToggle = document.querySelector('[data-perm="camera"]');
            if (camToggle) camToggle.classList.remove('active');
            return;
          }
        } catch(e) {}
      }
      console.log('[权限] 正在请求摄像头权限...');
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: isMobile ? { ideal: 720, max: 1280 } : { ideal: 640, max: 1920 }, height: isMobile ? { ideal: 960, max: 1280 } : { ideal: 480, max: 1080 } }
      });
      console.log('[权限] 摄像头权限已获取，stream tracks:', stream.getTracks().length);
      monitorStream = stream;
      // 监听摄像头权限被撤销（用户在浏览器设置中关闭权限）
      stream.getVideoTracks().forEach(function(track) {
        track.onended = function() {
          console.warn('[摄像头] 视频流已结束（权限可能被撤销）');
          if (appState.monitorActive) {
            stopMonitoring();
            showAlert('摄像头权限已变更，监测已自动停止', 'warn', '&#x26A0;');
            appState.permissions.camera = 'prompt';
            dbPut('settings', { key:'permissions', data: appState.permissions });
            refreshDeviceCards();
            var camToggle = document.querySelector('[data-perm="camera"]');
            if (camToggle) camToggle.classList.remove('active');
          }
        };
      });
      // 尝试获取摄像头实际焦距（用于精确FOV修正）
      window._cameraFocalLength = undefined;
      try {
        var videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && videoTrack.getSettings) {
          var settings = videoTrack.getSettings();
          if (settings.zoom && settings.focalLength) {
            // 某些浏览器支持 focalLength（单位mm）
            window._cameraFocalLength = settings.focalLength;
          }
        }
        // 尝试从 capabilities 获取焦距范围
        if (!window._cameraFocalLength && videoTrack && videoTrack.getCapabilities) {
          var caps = videoTrack.getCapabilities();
          if (caps.focusMode) {
            // 无法直接获取焦距，但可以标记摄像头能力
            window._cameraCapabilities = caps;
          }
        }
      } catch(e) {}
      const video = document.getElementById('monitor-video');
      if (!video) { showAlert('监测视频元素未找到', 'error', '&#x26A0;'); return; }
      video.srcObject = stream;
      // 移动端必须显式调用 play()
      try { await video.play(); } catch(playErr) { console.warn('Video play error:', playErr); }
      video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1);z-index:1;';
      var phEl = document.getElementById('monitor-placeholder'); if (phEl) phEl.style.display = 'none';
      var lbEl = document.getElementById('monitor-live-badge'); if (lbEl) lbEl.style.display = 'block';
      var slEl = document.getElementById('monitor-scan-line'); if (slEl) slEl.style.display = 'block';

      var canvasEl = document.getElementById('monitor-overlay-canvas');
      monitorCanvasCtx = canvasEl ? canvasEl.getContext('2d') : null;
      // 等待视频元数据加载完成后再设置canvas尺寸（移动端尤其重要）
      if (canvasEl) {
      if (video.readyState >= 1) {
        canvasEl.width = video.videoWidth || 640;
        canvasEl.height = video.videoHeight || 480;
      } else {
        canvasEl.width = 640; canvasEl.height = 480;
        video.onloadedmetadata = function() {
          canvasEl.width = video.videoWidth || 640;
          canvasEl.height = video.videoHeight || 480;
        };
      }
      }

      appState.monitorActive = true;
      appState.connectedDevices[dev] = true;
      appState.permissions.camera = 'granted';
      var liveDot = document.getElementById('dashboard-live-dot');
      if (liveDot) { liveDot.classList.remove('inactive'); liveDot.classList.add('active'); }
      const camToggle2 = document.querySelector('[data-perm="camera"]');
      if (camToggle2) camToggle2.classList.add('active');
      await dbPut('settings', { key:'permissions', data: appState.permissions });
      refreshDeviceCards();
      refreshMonitorDeviceSelector();

      // 确保 MediaPipe 正在初始化（后台预加载可能已在进行）
      if (!faceLandmarker && !mediapipeInitializing) {
        initFaceLandmarker();
      }

      monitorSessionStart = Date.now();
      monitorAlertCount = 0;
      blinkHistory = [];
      lastEAR = undefined;
      lastBlinkTime = 0;
      lastFrameBrightness = undefined;
      window._lastSaveTime = 0;
      // 重置全局平滑值，确保新监测会话从默认值开始
      window._smoothDistCm = 50;
      window._smoothPosture = 85;
      window._smoothEAR = 0.3;
      window._smoothBlinkRate = 0;
      window._faceLostFrames = 0;
      // 启动时立即显示就绪状态，像素分析模式可以立即工作
      if (faceLandmarker) {
        updateMonitorStatus('face', 'good', '画面分析: AI面部检测运行中');
        updateMonitorStatus('ear', 'good', '眨眼检测: 运行中');
        updateMonitorStatus('dist', 'good', '距离估算: 运行中');
        updateMonitorStatus('posture', 'good', '坐姿检测: 运行中');
      } else {
        updateMonitorStatus('face', 'good', '画面分析: 快速模式运行中 (AI加载中...)');
        updateMonitorStatus('ear', 'warn', '眨眼检测: 快速估算 (AI加载中...)');
        updateMonitorStatus('dist', 'warn', '距离估算: 快速估算 (AI加载中...)');
        updateMonitorStatus('posture', 'warn', '坐姿检测: 快速估算 (AI加载中...)');
      }

      // 页面可见性变化处理
      document.removeEventListener('visibilitychange', window._visHandler);
      window._visHandler = function() {
        // ========== 页面恢复可见 ==========
        if (!document.hidden && appState.monitorActive) {
          // 页面恢复可见，重置时间基准
          mediapipeLastVideoTime = -1;
          window._lastVideoCurrentTime = 0;
          window._lastActiveVideoTime = 0;
          window._monitorResuming = true;

          // 移动端：检查视频流是否还活着，可能需要重新获取
          if (IS_MOBILE && monitorStream) {
            var tracksEnded = monitorStream.getTracks().some(function(t) { return t.readyState === 'ended'; });
            var videoEl = document.getElementById('monitor-video');
            var videoDead = videoEl && videoEl.readyState < 2;
            if (tracksEnded || videoDead) {
              console.warn('[监测] 手机切换回来后视频流已失效，重新获取摄像头...');
              updateMonitorStatus('face', 'warn', '画面分析: 重新获取摄像头...');
              // 重新获取摄像头流
              navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 720, max: 1280 }, height: { ideal: 960, max: 1280 } }
              }).then(function(newStream) {
                // 停止旧流的所有轨道
                if (monitorStream) {
                  monitorStream.getTracks().forEach(function(t) { t.stop(); });
                }
                monitorStream = newStream;
                if (videoEl) {
                  videoEl.srcObject = newStream;
                  videoEl.play();
                }
                window._lastActiveVideoTime = performance.now();
                console.log('[监测] 摄像头流已恢复，tracks:', newStream.getTracks().length);
              }).catch(function(err) {
                console.error('[监测] 重新获取摄像头失败:', err);
                updateMonitorStatus('face', 'bad', '画面分析: 摄像头恢复失败');
                showAlert('摄像头恢复失败: ' + err.message, 'danger', '摄像头错误');
                stopMonitoring();
              });
            }
          }

          updateMonitorStatus('face', 'warn', '画面分析: 恢复中 (等待视频帧...)');
          var resumeCheck = setInterval(function() {
            var v = document.getElementById('monitor-video');
            if (v && v.readyState >= 2) {
              clearInterval(resumeCheck);
              window._monitorResuming = false;
              updateMonitorStatus('face', 'good', '画面分析: 运行中');
            }
          }, 500);
        }
        // ========== 页面切到后台 ==========
        if (document.hidden && appState.monitorActive) {
          window._backgroundTime = Date.now();
          // 桌面通知：页面切到后台时发送系统通知（Notification API 在页面 hidden 时也能工作）
          if (!IS_MOBILE && 'Notification' in window) {
            console.log('[通知] visibilitychange->hidden, Notification.permission =', Notification.permission);
            if (Notification.permission === 'granted' && appState.permissions.autoRequestNotification !== false) {
              try {
                var n = new Notification('眼部卫士 - 后台监测中', {
                  body: '您已离开页面，监测仍在后台运行。请保持正确的坐姿！',
                  icon: '',
                  tag: 'eye-guard-bg-' + Date.now(),
                  requireInteraction: false
                });
                console.log('[通知] 桌面通知已发送');
              } catch(e) { console.warn('[通知] 发送失败:', e); }
            }
          }
          // 后台时继续运行计时（保持监测不中断）
          if (!window._bgMonitorInterval) {
            window._bgMonitorInterval = setInterval(function() {
              if (!document.hidden) { clearInterval(window._bgMonitorInterval); window._bgMonitorInterval = null; return; }
              if (appState.monitorActive && monitorSessionStart) {
                const elapsed = Math.floor((Date.now() - monitorSessionStart) / 1000);
                const min = Math.floor(elapsed / 60);
                const sec = elapsed % 60;
                updateMetricValue('m-session-time', min + ':' + String(sec).padStart(2, '0'), 'good');
              }
            }, 1000);
          }
        }
      };
      document.addEventListener('visibilitychange', window._visHandler);

      // 额外：window.blur 事件在切出时比 visibilitychange 更早触发（此时页面还未 hidden）
      // 用于在切出瞬间就显示 DOM 弹窗（visibilitychange 的 document.hidden 此时仍为 false）
      window._blurHandler = function() {
        if (!appState.monitorActive || IS_MOBILE) return;
        // 立即显示 toast 弹窗（此时 DOM 还可渲染）
        showAlert('您已切换到其他应用，监测在后台运行中，请保持正确坐姿！', 'warn', '&#x26A0;');
        // 标题闪烁提醒
        // 不再闪烁标题，避免标签页名称乱变
        window._origTitle = document.title;
        addMonitorLog('warn', '用户切换到其他应用，监测在后台继续运行');
        // 桌面通知 —— 必须同时检查浏览器权限和应用内开关
        if ('Notification' in window && Notification.permission === 'granted' && appState.permissions.autoRequestNotification !== false) {
          try {
            new Notification('眼部卫士', {
              body: '您已切换到其他应用，监测仍在后台运行。请保持正确的坐姿！',
              icon: '',
              tag: 'eye-guard-background'
            });
          } catch(e) {}
        }
      };
      window._focusHandler = function() {
        // 恢复标题
        if (window._titleBlinkInterval) { clearInterval(window._titleBlinkInterval); window._titleBlinkInterval = null; }
        if (window._origTitle) { document.title = window._origTitle; window._origTitle = null; }
        // 弹 modal 确保用户看到
        // 后台提醒已通过 Notification API 发送，不再弹 Modal
      };
      window.addEventListener('blur', window._blurHandler);
      window.addEventListener('focus', window._focusHandler);

      runMonitorLoop(video);
      startFreeTimer();
      showAlert('监测已开启', 'info', '&#x1F441;');
      // 电脑版：检查桌面通知权限状态，引导用户开启
      if (!IS_MOBILE && 'Notification' in window) {
        if (Notification.permission === 'default') {
          // 权限未请求，弹 Modal 引导用户授权
          showModal('开启桌面通知', '为了在您离开页面时能收到提醒通知，请允许桌面通知权限。\n\n点击"允许通知"后，浏览器会弹出授权请求，请选择"允许"。', '允许通知', false, function() {
            Notification.requestPermission().then(function(perm) {
              console.log('[通知] 权限请求结果:', perm);
              if (perm === 'granted') {
                try { new Notification('眼部卫士', { body: '桌面通知已开启，离开页面时将提醒您保持坐姿', icon: '', tag: 'eye-guard-test' }); } catch(e) {}
                showAlert('桌面通知已开启', 'info', '&#x1F514;');
                refreshPermissionToggles();
              } else {
                showAlert('未开启通知权限，离开页面时将无法收到桌面提醒', 'warn', '&#x26A0;');
              }
            });
          });
        } else if (Notification.permission === 'denied') {
          // 权限被拒绝，提示用户去浏览器设置重新允许
          showAlert('桌面通知被拒绝，请在浏览器地址栏左侧点击锁图标，允许通知以接收后台提醒', 'warn', '&#x26A0;');
        }
        // 如果已授权(granted)，不弹任何提示
      }
      // 更新日志列表
      const logList = document.getElementById('monitor-log-list');
      if (logList) {
        const now = new Date();
        const timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0');
        logList.innerHTML = '<div class="log-item"><div class="log-time">' + timeStr + '</div><div class="log-icon monitor">&#x1F441;</div><div class="log-content"><div class="log-title">监测已启动</div><div class="log-desc">MediaPipe AI面部检测运行中</div></div><div class="log-tag good">运行中</div></div>';
      }
      // 更新按钮文本
      var startBtn = document.getElementById('btn-start-monitor');
      if (startBtn) {
        startBtn.textContent = '停止监测';
        startBtn.onclick = stopMonitoring;
      }
      var stopMonitorBtn = document.getElementById('btn-stop-monitor');
      if (stopMonitorBtn) stopMonitorBtn.style.display = '';
    } catch(err) {
      console.error('Camera error:', err);
      let hint = '摄像头访问失败: ' + err.message;
      if (err.name === 'NotAllowedError') {
        hint = '摄像头权限被拒绝，请在浏览器设置中允许摄像头访问';
      } else if (err.name === 'NotFoundError') {
        hint = '未检测到摄像头设备';
      } else if (location.protocol === 'file:' && IS_MOBILE) {
        hint = '提示：手机浏览器直接打开HTML文件无法使用摄像头。\n\n解决方案：\n1. 用电脑在同一WiFi下启动本地服务器访问\n2. 或将文件部署到HTTPS网站\n3. Chrome地址栏输入 chrome://flags/#unsafely-treat-insecure-origin-as-secure 添加此文件路径';
      } else if (location.protocol === 'file:') {
        hint = '提示：file:// 协议下浏览器可能限制摄像头访问。\n请通过 http://localhost 访问此页面';
      }
      showAlert(hint, 'danger', '摄像头错误');
      appState.monitorActive = false;
      var startBtn2 = document.getElementById('btn-start-monitor');
      if (startBtn2) { startBtn2.textContent = '开启监测'; startBtn2.onclick = startMonitoring; startBtn2.disabled = false; startBtn2.style.opacity = '1'; startBtn2.style.cursor = 'pointer'; }
      var stopBtn2 = document.getElementById('btn-stop-monitor');
      if (stopBtn2) stopBtn2.style.display = 'none';
      updateMonitorStatus('face', 'bad', '面部检测: 权限不足');
    }
  }

    let smoothSkinRatio = 0; let smoothEAR = 0; let lastSmoothEAR = 0;

  async function runMonitorLoop(video) {
    try {
    // 检查摄像头流是否仍然有效（用户可能在浏览器设置中撤销了权限）
    if (monitorStream) {
      var allEnded = monitorStream.getTracks().every(function(t) { return t.readyState === 'ended'; });
      if (allEnded) {
        console.warn('[监测] 检测到所有视频轨道已结束，停止监测');
        stopMonitoring();
        showAlert('摄像头权限已变更，监测已自动停止', 'warn', '&#x26A0;');
        return;
      }
    }
    if (!appState.monitorActive || video.readyState < 2) {
      if (appState.monitorActive) monitorAnimFrame = setTimeout(() => runMonitorLoop(video), video.readyState < 2 ? 200 : 50);
      return;
    }

    // 检测视频是否冻结（页面切到后台后回来）
    var frozenCheckNow = performance.now();
    // 使用 video.currentTime 作为辅助判断（更可靠，不依赖MediaPipe时间戳）
    var videoTimeChanged = Math.abs(video.currentTime - (window._lastVideoCurrentTime || 0)) > 0.01;
    window._lastVideoCurrentTime = video.currentTime;
    if (videoTimeChanged) window._lastActiveVideoTime = frozenCheckNow;
    var isFrozen = (frozenCheckNow - (window._lastActiveVideoTime || 0)) > 5000 && (window._lastActiveVideoTime || 0) > 0;
    if (isFrozen) {
      // 超过5秒没有新帧，视频可能冻结
      // 检查是否已经尝试恢复
      if (!window._videoRecoveryAttempted) {
        window._videoRecoveryAttempted = Date.now();
        console.warn('[监测] 视频冻结超过5秒，尝试恢复...');
        updateMonitorStatus('face', 'warn', '画面分析: 视频冻结，尝试恢复...');
        // 尝试重新播放视频
        var v = document.getElementById('monitor-video');
        if (v) {
          try { v.play(); } catch(e) {}
        }
      }
      // 冻结超过15秒：移动端尝试重新获取摄像头流
      var frozenDuration = frozenCheckNow - (window._lastActiveVideoTime || 0);
      if (frozenDuration > 15000 && IS_MOBILE && monitorStream) {
        var tracksEnded = monitorStream.getTracks().some(function(t) { return t.readyState === 'ended'; });
        if (tracksEnded || !window._videoRecoveryRetry) {
          window._videoRecoveryRetry = true;
          console.warn('[监测] 视频冻结超过15秒，重新获取摄像头...');
          updateMonitorStatus('face', 'warn', '画面分析: 重新获取摄像头...');
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 720, max: 1280 }, height: { ideal: 960, max: 1280 } }
          }).then(function(newStream) {
            if (monitorStream) monitorStream.getTracks().forEach(function(t) { t.stop(); });
            monitorStream = newStream;
            var vid = document.getElementById('monitor-video');
            if (vid) { vid.srcObject = newStream; vid.play(); }
            window._lastActiveVideoTime = performance.now();
            window._videoRecoveryAttempted = 0;
            window._videoRecoveryRetry = false;
            updateMonitorStatus('face', 'good', '画面分析: 已恢复');
            addMonitorLog('info', '视频冻结后自动恢复成功');
          }).catch(function(err) {
            console.error('[监测] 恢复失败:', err);
            window._videoRecoveryRetry = false;
          });
        }
      }
      // 跳过本帧避免异常值
      if (appState.monitorActive) monitorAnimFrame = setTimeout(() => runMonitorLoop(video), 500);
      return;
    }
    // 视频恢复后重置标记
    if (!isFrozen && window._videoRecoveryAttempted && frozenCheckNow - window._videoRecoveryAttempted > 3000) {
      window._videoRecoveryAttempted = 0;
    }

    // 每60秒检查一次会员状态和免费时长（防止监测期间Pro到期且免费时间耗尽）
    if (appState.monitorActive && (!window._lastMemberCheck || Date.now() - window._lastMemberCheck > 60000)) {
      window._lastMemberCheck = Date.now();
      // 定期联网同步会员状态（防止管理面板撤销后本地未更新）
      if (appState.pro.activated && appState.pro.code && API_BASE_URL && appState.pro.planType !== 'lifetime') {
        fetch(API_BASE_URL + '/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: appState.pro.code, phone: appState.pro.boundPhone || appState.user.phone || '' })
        }).then(function(r) {
          var ct = r.headers.get('content-type') || '';
          if (ct.indexOf('text/html') !== -1) throw new Error('API不可用');
          return r.json();
        }).then(function(d) {
          if (!d.valid) {
            // 服务端已失效（被撤销/删除），清除本地状态
            appState.pro = { activated: false, code: null, activatedAt: null, planType: null, expiresAt: null };
            _proVerified = false;
            dbPut('settings', { key: 'proLicense', value: appState.pro });
            updateProUI();
            stopMonitoring();
            showAlert('您的会员已被撤销（可能创作者删除了激活码），请重新激活', 'warn', '\u23F0');
          } else if (d.expires_at) {
            // 同步服务端最新的到期时间（覆盖本地值）
            var serverExpiresAt = d.expires_at * 1000;
            var localExpiresAt = appState.pro.expiresAt || 0;
            // 差异超过5分钟才更新（避免秒级抖动）
            if (Math.abs(serverExpiresAt - localExpiresAt) > 300000) {
              appState.pro.expiresAt = serverExpiresAt;
              appState.pro.planType = d.plan || appState.pro.planType;
              if (d.active_codes_count) appState.pro.totalCodes = d.active_codes_count;
              dbPut('settings', { key: 'proLicense', value: appState.pro });
              updateProUI();
              addMonitorLog('info', '会员状态已同步：剩余 ' + (d.remaining_days || '?') + ' 天');
            }
            _proVerified = true;
          }
        }).catch(function() { /* 网络错误忽略，保持本地状态 */ });
      }
      // Pro到期检查（本地）
      if (isPro() && appState.pro.planType !== 'lifetime' && appState.pro.expiresAt && Date.now() > appState.pro.expiresAt) {
        appState.pro = { activated: false, code: null, activatedAt: null, planType: null, expiresAt: null };
        _proVerified = false;
        dbPut('settings', { key: 'proLicense', value: appState.pro });
        updateProUI();
        startFreeTimer();
      }
      if (!isPro() && typeof _freeSecondsRemaining !== 'undefined' && _freeSecondsRemaining <= 0 && window._freeServerQueried) {
        stopMonitoring();
        showAlert('会员已到期，且今日免费试用时间已用完，请升级Pro或明天再试', 'warn', '\u23F0');
        return;
      }
    }

    const canvas = document.getElementById('monitor-overlay-canvas');
    const w = video.videoWidth;
    const h = video.videoHeight;
    var ctx = monitorCanvasCtx;
    if (!canvas || !ctx || w === 0 || h === 0) {
      if (appState.monitorActive) monitorAnimFrame = setTimeout(() => runMonitorLoop(video), loopInterval);
      return;
    }

    // 判断当前是否在监测页面（不在监测页面时跳过canvas绘制，但继续后台检测）
    var monitorPageVisible = document.getElementById('page-monitor').classList.contains('active');
    // 帧计数器
    window._monitorFrameCount = (window._monitorFrameCount || 0) + 1;
    // drawThisFrame：监测页面可见 + 人脸识别框未隐藏（默认显示）
    var showBox = window._showFaceBox !== false;
    var drawThisFrame = monitorPageVisible && showBox;

    if (monitorPageVisible) {
      if (drawThisFrame) {
        // 只在尺寸变化时重设 canvas（避免每帧重新分配内存导致内存泄漏）
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 计算 object-fit:cover 的缩放和偏移，确保 canvas 坐标与视频显示精确对齐
        var container = document.getElementById('monitor-video-container');
        var cw = container ? container.clientWidth : w;
        var ch = container ? container.clientHeight : h;
        var videoAspect = w / h;
        var containerAspect = cw / ch;
        var coverScale, coverOffX, coverOffY;
        if (containerAspect > videoAspect) {
          coverScale = ch / h;
          coverOffX = (cw - w * coverScale) / 2;
          coverOffY = 0;
        } else {
          coverScale = cw / w;
          coverOffX = 0;
          coverOffY = (ch - h * coverScale) / 2;
        }
        canvas.style.position = 'absolute';
        canvas.style.width = (w * coverScale) + 'px';
        canvas.style.height = (h * coverScale) + 'px';
        canvas.style.left = coverOffX + 'px';
        canvas.style.top = coverOffY + 'px';
      }
    }

    // EMA平滑状态初始化
    if (typeof window._smoothDistCm === 'undefined') window._smoothDistCm = 50;
    if (typeof window._smoothPosture === 'undefined') window._smoothPosture = 85;
    if (typeof window._smoothEAR === 'undefined') window._smoothEAR = 0.3;
    if (typeof window._smoothBlinkRate === 'undefined') window._smoothBlinkRate = 0;

    // 暴露当前帧数据供校准使用
    window.currentSkinRatio = 0;
    window.currentNormalizedY = 0.35;
    var currentEARValue = 0.3;

    // ====== 优先使用 MediaPipe Face Landmarker ======
    let mediapipeDetected = false;

    if (faceLandmarker) {
      try {
        const now = performance.now();
        if (now !== mediapipeLastVideoTime) {
          mediapipeLastVideoTime = now;
          const results = faceLandmarker.detectForVideo(video, now);

          if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            mediapipeDetected = true;
            window._faceLostFrames = 0; // 重置面部丢失计数器
            const landmarks = results.faceLandmarks[0]; // 468个归一化关键点 {x, y, z}

            // ---- EAR 几何计算 ----
            const earValueRaw = calculateEAR(landmarks);
            const earValue = (isNaN(earValueRaw) || !isFinite(earValueRaw)) ? 0.25 : earValueRaw;
            currentEARValue = earValue;

            // ---- 眨眼检测 ----
            let blinkDetected = false;
            if (typeof lastEAR !== 'undefined' && lastEAR > 0) {
              const earDropRatio = (lastEAR - earValue) / Math.max(0.01, lastEAR);
              if (earDropRatio > 0.2 && Date.now() - lastBlinkTime > 200) {
                blinkDetected = true;
              }
            }
            lastEAR = earValue;

            if (blinkDetected) {
              lastBlinkTime = Date.now();
              blinkHistory.push(Date.now());
            }

            // 每5秒清理一次过期的眨眼记录，避免每帧都创建新数组导致GC压力
            var nowBlink = Date.now();
            if (!window._lastBlinkCleanup || nowBlink - window._lastBlinkCleanup > 5000) {
              window._lastBlinkCleanup = nowBlink;
              const oneMinAgo = nowBlink - 60000;
              blinkHistory = blinkHistory.filter(function(t) { return t > oneMinAgo; });
            }
            // 用实际经过时间计算频率，而不是固定60秒
            let blinkRate = 0;
            if (blinkHistory.length >= 2) {
              var elapsed = Math.max(10, (blinkHistory[blinkHistory.length - 1] - blinkHistory[0]) / 1000); // 最小10秒窗口
              if (elapsed > 0) {
                blinkRate = Math.round((blinkHistory.length - 1) / (elapsed / 60)); // 次/分钟
              } else {
                blinkRate = blinkHistory.length;
              }
            } else if (blinkHistory.length === 1) {
              blinkRate = 1; // 只有1次眨眼，保守显示1
            }
            // 采集中保护：如果监测不到15秒，显示采集中
            if (monitorSessionStart && Date.now() - monitorSessionStart < 15000) {
              blinkRate = -1;
            }

            // ---- 距离估算：面部宽度法 ----
            // 点234=左脸颊，点454=右脸颊，宽度归一化值乘以视频宽度
            const faceWidthNorm = Math.abs(landmarks[454].x - landmarks[234].x);
            // 设备修正：手机/平板前置摄像头FOV比桌面广角更大，相同距离下面部占比偏小，需要修正
            // 优先使用实际摄像头焦距推算FOV，否则使用设备类型默认值
            var deviceFOVCorrection = 1.0;
            if (window._cameraFocalLength && window._cameraFocalLength > 0) {
              // 用实际焦距推算：FOV = 2 * atan(sensorWidth / (2 * focalLength))
              // 修正系数 = tan(35°) / tan(actualFOV/2)
              // 简化：假设 sensor 半宽归一化为1，focalLength 越小 FOV 越大
              var estimatedHalfFOV = Math.atan2(1, window._cameraFocalLength);
              var desktopHalfFOV = 35 * Math.PI / 180; // 桌面 70° → 半角35°
              deviceFOVCorrection = Math.tan(desktopHalfFOV) / Math.max(0.1, Math.tan(estimatedHalfFOV));
            } else if (IS_MOBILE) {
              deviceFOVCorrection = 1.50;   // 手机前置广角修正（65-85° FOV范围内取中值）
            } else if (IS_TABLET) {
              deviceFOVCorrection = 1.25; // 平板前置修正
            }
            // 头部偏转补偿：左右倾斜时面部宽度在画面中变窄，需要除以cos(roll)还原真实宽度
            var rollAngle = Math.atan2(landmarks[263].y - landmarks[33].y, landmarks[263].x - landmarks[33].x);
            var rollCompensation = Math.abs(Math.cos(rollAngle));
            if (rollCompensation < 0.5) rollCompensation = 0.5;
            var correctedFaceWidthNorm = faceWidthNorm * deviceFOVCorrection / rollCompensation;
            const faceWidthPx = correctedFaceWidthNorm * w;
            window.currentSkinRatio = correctedFaceWidthNorm;

            let distCm = 50;
            const calDist = appState.calibrationData.distance;
            if (calDist && calDist.skinRatio > 0.01) {
              distCm = Math.round(calDist.value * (calDist.skinRatio / Math.max(0.01, correctedFaceWidthNorm)));
            } else {
              // 无校准：经验公式，手机/平板/桌面使用不同的基准系数
              // 手机手持距离近（25-50cm），平板略远（30-60cm），桌面更远（40-80cm）
              var baseRef, baseDist;
              if (IS_MOBILE) {
                baseRef = 0.15; baseDist = 40; // 手机前置广角：面部占比0.15时约40cm
              } else if (IS_TABLET) {
                baseRef = 0.14; baseDist = 45; // 平板前置：面部占比0.14时约45cm
              } else {
                baseRef = 0.15; baseDist = 45; // 桌面：面部占比0.15时约45cm
              }
              distCm = Math.round(10 + baseDist * Math.pow(baseRef / Math.max(0.01, correctedFaceWidthNorm), 1.0));
              if (isNaN(distCm) || !isFinite(distCm) || distCm < 0) distCm = 50;
            }
            let clampedDist = Math.min(200, Math.max(8, distCm));

            // ---- 坐姿角度：头部姿态 ----
            const posture = getHeadPosture(landmarks);
            window.currentNormalizedY = landmarks[1].y; // 鼻尖Y坐标
            let clampedPosture = Math.min(120, Math.max(10, posture.score));

            // ---- EAR 显示值 ----
            let earDisplay = earValue;
            const calEar = appState.calibrationData.ear;
            if (calEar && calEar.rawValue > 0) {
              earDisplay = earValue / calEar.rawValue * 0.27;
            }
            earDisplay = Math.max(0.05, Math.min(0.45, earDisplay));
            let earNum = earDisplay;
            const earThreshold = appState.thresholds.ear / 100;

            // ---- EMA 平滑（NaN 安全版）----
            const alphaDist = 0.15, alphaPosture = 0.12, alphaEAR = 0.20, alphaBlink = 0.30;
            // NaN/Infinity 防护：如果当前值无效，使用上一帧的平滑值
            var safeDist = (isNaN(clampedDist) || !isFinite(clampedDist)) ? (window._smoothDistCm || 50) : clampedDist;
            var safePosture = (isNaN(clampedPosture) || !isFinite(clampedPosture)) ? (window._smoothPosture || 70) : clampedPosture;
            var safeEAR = (isNaN(earNum) || !isFinite(earNum)) ? (window._smoothEAR || 0.25) : earNum;
            // 初始化或更新平滑值（用 undefined 检查代替 === 0）
            if (window._smoothDistCm === undefined || isNaN(window._smoothDistCm)) window._smoothDistCm = safeDist;
            else window._smoothDistCm = window._smoothDistCm * (1 - alphaDist) + safeDist * alphaDist;
            if (window._smoothPosture === undefined || isNaN(window._smoothPosture)) window._smoothPosture = safePosture;
            else window._smoothPosture = window._smoothPosture * (1 - alphaPosture) + safePosture * alphaPosture;
            // 左右偏转平滑
            if (window._smoothYawScore === undefined || isNaN(window._smoothYawScore)) window._smoothYawScore = (posture.yawScore || 85);
            else window._smoothYawScore = window._smoothYawScore * (1 - alphaPosture) + (posture.yawScore || 85) * alphaPosture;
            if (window._smoothEAR === undefined || isNaN(window._smoothEAR)) window._smoothEAR = safeEAR;
            else window._smoothEAR = window._smoothEAR * (1 - alphaEAR) + safeEAR * alphaEAR;
            if (window._smoothBlinkRate === undefined || isNaN(window._smoothBlinkRate)) window._smoothBlinkRate = (blinkRate === -1 ? 0 : blinkRate);
            else window._smoothBlinkRate = (blinkRate === -1 ? window._smoothBlinkRate : window._smoothBlinkRate * (1 - alphaBlink) + blinkRate * alphaBlink);

            const smoothDistCm = Math.round(window._smoothDistCm);
            const smoothPosture = Math.round(window._smoothPosture);
            const smoothYawScore = Math.round(window._smoothYawScore);
            const smoothEAR = window._smoothEAR;
            const smoothBlinkRate = blinkRate === -1 ? -1 : Math.round(window._smoothBlinkRate);

            const distLevel = smoothDistCm < appState.thresholds.distance ? 'bad' : (smoothDistCm < appState.thresholds.distanceWarn ? 'warn' : 'good');
            // 前后姿态：用pitch评分判断（阈值越高越严格）
            const pitchLevel = smoothPosture > appState.thresholds.postureWarn ? 'good' : (smoothPosture > appState.thresholds.posture ? 'warn' : 'bad');
            // 左右偏转：用yaw评分判断（低于60分为不良）
            const yawLevel = smoothYawScore >= 60 ? 'good' : (smoothYawScore >= 40 ? 'warn' : 'bad');
            // 综合坐姿等级：任一维度不良则综合不良
            const postureLevel = (pitchLevel === 'bad' || yawLevel === 'bad') ? 'bad' : (pitchLevel === 'warn' || yawLevel === 'warn') ? 'warn' : 'good';
            const earLevel = smoothEAR < earThreshold * 0.7 ? 'bad' : (smoothEAR < earThreshold ? 'warn' : 'good');
            const blinkLevel = smoothBlinkRate < appState.thresholds.blink ? 'bad' : (smoothBlinkRate < appState.thresholds.blinkWarn ? 'warn' : 'good');

            // ---- 绘制468点可视化 ----
            // 面部边界框（手动镜像X坐标：video用CSS scaleX(-1)镜像，canvas不镜像所以需要手动翻转X）
            const faceLeft = Math.min(landmarks[234].x, landmarks[454].x) * w;
            const faceRight = Math.max(landmarks[234].x, landmarks[454].x) * w;
            const faceTop = Math.min(landmarks[10].y, landmarks[152].y) * h;
            const faceBottom = Math.max(landmarks[10].y, landmarks[152].y) * h;
            const boxW = faceRight - faceLeft;
            const boxH = faceBottom - faceTop;
            const drawX = w - faceRight;
            const drawY = faceTop;

            // 检测框（仅在绘制帧时绘制，降低GPU压力）
            if (drawThisFrame) {
            ctx.strokeStyle = distLevel === 'good' ? CONSTANTS.DIST_GOOD_08 : distLevel === 'warn' ? CONSTANTS.DIST_WARN_08 : CONSTANTS.DIST_BAD_08;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(drawX, drawY, boxW, boxH);
            ctx.setLineDash([]);

            // 状态标签
            ctx.fillStyle = distLevel === 'good' ? CONSTANTS.DIST_GOOD_09 : distLevel === 'warn' ? CONSTANTS.DIST_WARN_09 : 'rgba(196,78,78,0.9)';
            const labelText = smoothDistCm + 'cm ' + smoothPosture + '\u00B0';
            ctx.font = 'bold 13px sans-serif';
            const textW = ctx.measureText(labelText).width;
            ctx.fillRect(drawX, drawY - 22, textW + 12, 20);
            ctx.fillStyle = 'white';
            ctx.fillText(labelText, drawX + 6, drawY - 7);

            // 绘制关键点（每5个点采样一个，避免太密）
            ctx.fillStyle = CONSTANTS.CANVAS_GREEN_05;
            for (let i = 0; i < landmarks.length; i += 5) {
              const px = w - landmarks[i].x * w;
              const py = landmarks[i].y * h;
              ctx.beginPath();
              ctx.arc(px, py, 1.2, 0, Math.PI * 2);
              ctx.fill();
            }

            // 绘制眼睛轮廓（高亮）
            ctx.strokeStyle = CONSTANTS.CANVAS_GREEN_07;
            ctx.lineWidth = 1.5;
            // 左眼轮廓
            const leftEyeIdx = [33, 160, 158, 133, 153, 144];
            ctx.beginPath();
            for (let i = 0; i < leftEyeIdx.length; i++) {
              const px = w - landmarks[leftEyeIdx[i]].x * w;
              const py = landmarks[leftEyeIdx[i]].y * h;
              if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            // 右眼轮廓
            const rightEyeIdx = [362, 385, 387, 263, 373, 380];
            ctx.beginPath();
            for (let i = 0; i < rightEyeIdx.length; i++) {
              const px = w - landmarks[rightEyeIdx[i]].x * w;
              const py = landmarks[rightEyeIdx[i]].y * h;
              if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();

            // 十字准心
            const cx = drawX + boxW / 2;
            const cy = drawY + boxH / 2;
            ctx.strokeStyle = CONSTANTS.CANVAS_GREEN_03;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(cx - 15, cy); ctx.lineTo(cx + 15, cy);
            ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy + 15);
            ctx.stroke();
            ctx.setLineDash([]);
            } // end if monitorPageVisible

            // ---- 更新UI ----
            updateMetricValue('m-distance', smoothDistCm, distLevel);
            updateMetricValue('m-posture', smoothPosture + '\u00B0', postureLevel);
            updateMetricValue('m-ear', smoothEAR.toFixed(3), earLevel);
            if (smoothBlinkRate === -1) {
              updateMetricValue('m-blink-rate', '采集中', 'warn');
            } else {
              updateMetricValue('m-blink-rate', smoothBlinkRate, blinkLevel);
            }
            updateMonitorStatus('face', 'good', 'MediaPipe: 468点检测运行中');
            updateMonitorStatus('ear', earLevel, '眨眼检测: ' + smoothBlinkRate + '次/分 (EAR=' + smoothEAR.toFixed(3) + ')');
            updateMonitorStatus('dist', distLevel, '距离估算: ' + smoothDistCm + 'cm');
            updateMonitorStatus('posture', postureLevel, '坐姿检测: ' + smoothPosture + '\u00B0');
            updateDashboardAI(smoothBlinkRate, smoothDistCm, smoothPosture);
            updateMonitorStatus('face', 'good', '画面分析: 运行中');

            // 声音提醒：检测持续异常
            checkPersistentAlert(distLevel, 'distance');
            checkPersistentAlert(pitchLevel, 'pitch');
            checkPersistentAlert(yawLevel, 'yaw');
            checkPersistentAlert(earLevel, 'blink');

          }
        }
      } catch(err) {
        // MediaPipe 检测失败，降级到像素分析
        console.warn('MediaPipe detect error:', err);
      }
    }

    // ====== 降级方案：MediaPipe未加载或检测失败时使用像素分析 ======
    if (!mediapipeDetected) {
      let pixelData = null;
      if (ctx) {
        try {
          const imageData = ctx.getImageData(0, 0, w, h);
          pixelData = imageData.data;
        } catch(err) {}
      }

      if (pixelData) {
        const pixelCount = w * h;
        const stride = pixelCount > 307200 ? 8 : (pixelCount > 153600 ? 6 : 4);
        const step = stride * 4;

        // 场景统计
        let totalBrightness = 0, sampledPixels = 0;
        let totalY = 0, totalCb = 0, totalCr = 0;
        for (let i = 0; i < pixelData.length; i += step) {
          const r = pixelData[i], g = pixelData[i+1], b = pixelData[i+2];
          totalBrightness += (r + g + b) / 3;
          sampledPixels++;
          totalY += 0.299 * r + 0.587 * g + 0.114 * b;
          totalCb += 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          totalCr += 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        }
        const avgBrightness = totalBrightness / Math.max(1, sampledPixels);
        const meanY = totalY / Math.max(1, sampledPixels);
        const meanCb = totalCb / Math.max(1, sampledPixels);
        const meanCr = totalCr / Math.max(1, sampledPixels);

        const yMin = Math.max(35, meanY * 0.55);
        const yMax = Math.min(250, meanY * 1.35 + 40);
        const cbMin = Math.max(75, meanCb - 22);
        const cbMax = Math.min(145, meanCb + 22);
        const crMin = Math.max(120, meanCr - 22);
        const crMax = Math.min(190, meanCr + 22);

        // 肤色检测
        let skinPixels = 0, skinMinX = w, skinMaxX = 0, skinMinY = h, skinMaxY = 0;
        let skinTopSum = 0, skinLeftSum = 0, skinPixelCount = 0;
        let upperSkinPixels = 0, upperTotalPixels = 0;
        let lowerSkinPixels = 0, lowerTotalPixels = 0;
        const midY = Math.floor(h / 2);

        for (let i = 0; i < pixelData.length; i += step) {
          const r = pixelData[i], g = pixelData[i+1], b = pixelData[i+2];
          const Y = 0.299 * r + 0.587 * g + 0.114 * b;
          const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
          const isSkin = Y > yMin && Y < yMax && Cb > cbMin && Cb < cbMax && Cr > crMin && Cr < crMax && Cr > Cb + 2;
          const px = (i / 4) % w;
          const py = Math.floor((i / 4) / w);
          if (isSkin) {
            skinPixels++; skinTopSum += py; skinLeftSum += px; skinPixelCount++;
            if (px < skinMinX) skinMinX = px;
            if (px > skinMaxX) skinMaxX = px;
            if (py < skinMinY) skinMinY = py;
            if (py > skinMaxY) skinMaxY = py;
            if (py < midY) upperSkinPixels++; else lowerSkinPixels++;
          }
          if (py < midY) upperTotalPixels++; else lowerTotalPixels++;
        }

        const skinRatio = skinPixels / Math.max(1, sampledPixels);
        // 设备修正：手机/平板前置摄像头FOV更广，需要修正
        var deviceFOVCorrection2 = 1.0;
        if (window._cameraFocalLength && window._cameraFocalLength > 0) {
          var estimatedHalfFOV2 = Math.atan2(1, window._cameraFocalLength);
          var desktopHalfFOV2 = 35 * Math.PI / 180;
          deviceFOVCorrection2 = Math.tan(desktopHalfFOV2) / Math.max(0.1, Math.tan(estimatedHalfFOV2));
        } else if (IS_MOBILE) {
          deviceFOVCorrection2 = 1.50;
        } else if (IS_TABLET) {
          deviceFOVCorrection2 = 1.25;
        }
        const correctedSkinRatio = skinRatio * deviceFOVCorrection2;
        window.currentSkinRatio = correctedSkinRatio;
        const skinWidth = Math.max(1, skinMaxX - skinMinX) * deviceFOVCorrection2;
        const skinHeight = Math.max(1, skinMaxY - skinMinY) * deviceFOVCorrection2;
        const hasEnoughPixels = skinPixelCount > 5;

        if (hasEnoughPixels) {
          // 距离估算
          const normalizedSkinArea = (skinWidth * skinHeight) / Math.max(1, w * h);
          const combinedRatio = normalizedSkinArea * 0.7 + correctedSkinRatio * 0.3;
          let distCm = 50;
          const calDist = appState.calibrationData.distance;
          if (calDist && calDist.skinRatio > 0.001) {
            distCm = Math.round(calDist.value * Math.sqrt(Math.max(0.001, calDist.skinRatio) / Math.max(0.001, combinedRatio)));
          } else {
            // 无校准：不同设备使用不同的基准参数
            var fbRef, fbDist;
            if (IS_MOBILE) {
              fbRef = 0.22; fbDist = 30; // 手机基准
            } else if (IS_TABLET) {
              fbRef = 0.18; fbDist = 35; // 平板基准
            } else {
              fbRef = 0.18; fbDist = 45; // 桌面基准
            }
            distCm = Math.round(10 + fbDist * Math.pow(Math.max(0.001, fbRef) / Math.max(0.001, combinedRatio), 0.55));
            if (isNaN(distCm) || !isFinite(distCm) || distCm < 0) distCm = 50;
          }
          let clampedDist = Math.min(200, Math.max(8, distCm));

          // 坐姿
          const skinCenterY = skinTopSum / skinPixelCount;
          const skinCenterX = skinLeftSum / skinPixelCount;
          const normalizedY = skinCenterY / h;
          window.currentNormalizedY = normalizedY;
          const horizontalOffset = Math.abs(skinCenterX / w - 0.5);
          // 先计算原始值（固定基准0.35，未应用校准系数）供校准采集使用
          const rawPostureAngle = Math.round(90 - (normalizedY - 0.35) * 100 - horizontalOffset * 30);
          const rawClampedPosture = Math.min(120, Math.max(10, rawPostureAngle));
          window.currentRawPostureScore = rawClampedPosture;
          // 应用校准系数计算显示值
          let postureAngle = rawPostureAngle;
          const calPosture = appState.calibrationData && appState.calibrationData.posture;
          if (calPosture && calPosture.factor && calPosture.factor > 0.5 && calPosture.factor < 2.0) {
            postureAngle = Math.round(rawPostureAngle * calPosture.factor);
          } else if (calPosture && calPosture.value && calPosture.value > 10 && calPosture.value < 120) {
            // 兼容旧数据：转换为系数
            const factor = 90 / calPosture.value;
            postureAngle = Math.round(rawPostureAngle * factor);
            appState.calibrationData.posture = { factor: factor, normalizedY: calPosture.normalizedY || 0.35 };
          }
          let clampedPosture = Math.min(120, Math.max(10, postureAngle));

          // EAR
          const upperSkinRatio = upperSkinPixels / Math.max(1, upperTotalPixels);
          const lowerSkinRatio = lowerSkinPixels / Math.max(1, lowerTotalPixels);
          let earApprox = 0.3;
          if (upperSkinRatio > 0.001) earApprox = Math.max(0.05, Math.min(0.45, (lowerSkinRatio / upperSkinRatio) * 0.25));
          currentEARValue = earApprox;

          let blinkDetected = false;
          if (typeof lastEAR !== 'undefined') {
            const earDropRatio = (lastEAR - earApprox) / Math.max(0.01, lastEAR);
            if (earDropRatio > 0.15 && Date.now() - lastBlinkTime > 200) blinkDetected = true;
          }
          lastEAR = earApprox;
          lastFrameBrightness = avgBrightness;
          if (blinkDetected) { lastBlinkTime = Date.now(); blinkHistory.push(Date.now()); }

          // 每5秒清理一次过期的眨眼记录（备用检测路径）
          var nowBlink2 = Date.now();
          if (!window._lastBlinkCleanup || nowBlink2 - window._lastBlinkCleanup > 5000) {
            window._lastBlinkCleanup = nowBlink2;
            const oneMinAgo = nowBlink2 - 60000;
            blinkHistory = blinkHistory.filter(function(t) { return t > oneMinAgo; });
          }
          // 用实际经过时间计算频率，而不是固定60秒
          let blinkRate = 0;
          if (blinkHistory.length >= 2) {
            var elapsed2 = Math.max(10, (blinkHistory[blinkHistory.length - 1] - blinkHistory[0]) / 1000); // 最小10秒窗口
            if (elapsed2 > 0) {
              blinkRate = Math.round((blinkHistory.length - 1) / (elapsed2 / 60)); // 次/分钟
            } else {
              blinkRate = blinkHistory.length;
            }
          } else if (blinkHistory.length === 1) {
            blinkRate = 1; // 只有1次眨眼，保守显示1
          }
          // 采集中保护：如果监测不到15秒，显示采集中
          if (monitorSessionStart && Date.now() - monitorSessionStart < 15000) {
            blinkRate = -1;
          }

          let earDisplay = earApprox;
          const calEar = appState.calibrationData.ear;
          if (calEar && calEar.rawValue > 0) earDisplay = earApprox / calEar.rawValue * 0.27;
          earDisplay = Math.max(0.05, Math.min(0.45, earDisplay));
          let earNum = parseFloat(earDisplay.toFixed(2));
          const earThreshold = appState.thresholds.ear / 100;

          // EMA（NaN 安全版）
          const aD=0.15, aP=0.12, aE=0.20, aB=0.30;
          var safeDist2 = (isNaN(clampedDist) || !isFinite(clampedDist)) ? (window._smoothDistCm || 50) : clampedDist;
          var safePosture2 = (isNaN(clampedPosture) || !isFinite(clampedPosture)) ? (window._smoothPosture || 70) : clampedPosture;
          var safeEAR2 = (isNaN(earNum) || !isFinite(earNum)) ? (window._smoothEAR || 0.25) : earNum;
          if (window._smoothDistCm === undefined || isNaN(window._smoothDistCm)) window._smoothDistCm = safeDist2;
          else window._smoothDistCm = window._smoothDistCm*(1-aD)+safeDist2*aD;
          if (window._smoothPosture === undefined || isNaN(window._smoothPosture)) window._smoothPosture = safePosture2;
          else window._smoothPosture = window._smoothPosture*(1-aP)+safePosture2*aP;
          if (window._smoothEAR === undefined || isNaN(window._smoothEAR)) window._smoothEAR = safeEAR2;
          else window._smoothEAR = window._smoothEAR*(1-aE)+safeEAR2*aE;
          if (window._smoothBlinkRate === undefined || isNaN(window._smoothBlinkRate)) window._smoothBlinkRate = (blinkRate === -1 ? 0 : blinkRate);
          else window._smoothBlinkRate = (blinkRate === -1 ? window._smoothBlinkRate : window._smoothBlinkRate*(1-aB)+blinkRate*aB);

          const smoothDistCm = Math.round(window._smoothDistCm);
          const smoothPosture = Math.round(window._smoothPosture);
          const smoothEAR = window._smoothEAR;
          const smoothBlinkRate = blinkRate === -1 ? -1 : Math.round(window._smoothBlinkRate);

          const distLevel = smoothDistCm < appState.thresholds.distance ? 'bad' : (smoothDistCm < appState.thresholds.distanceWarn ? 'warn' : 'good');
          const postureLevel = smoothPosture > appState.thresholds.postureWarn ? 'good' : (smoothPosture > appState.thresholds.posture ? 'warn' : 'bad');
          const earLevel = smoothEAR < earThreshold * 0.7 ? 'bad' : (smoothEAR < earThreshold ? 'warn' : 'good');
          const blinkLevel = smoothBlinkRate < appState.thresholds.blink ? 'bad' : (smoothBlinkRate < appState.thresholds.blinkWarn ? 'warn' : 'good');

          // 绘制（仅在监测页面可见时绘制）
          const drawX = Math.max(0, skinCenterX - skinWidth / 2);
          const drawY = Math.max(0, Math.min(h - skinHeight, (skinCenterY / h) * h - skinHeight / 2));
          if (drawThisFrame) {
          ctx.strokeStyle = distLevel === 'good' ? CONSTANTS.DIST_GOOD_07 : distLevel === 'warn' ? CONSTANTS.DIST_WARN_07 : CONSTANTS.DIST_BAD_07;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(drawX, drawY, skinWidth, skinHeight);
          ctx.setLineDash([]);
          ctx.fillStyle = distLevel === 'good' ? CONSTANTS.DIST_GOOD_085 : distLevel === 'warn' ? CONSTANTS.DIST_WARN_085 : CONSTANTS.DIST_BAD_085;
          const labelText = smoothDistCm + 'cm ' + smoothPosture + '\u00B0';
          ctx.font = 'bold 12px sans-serif';
          const textW = ctx.measureText(labelText).width;
          ctx.fillRect(drawX, drawY - 20, textW + 10, 18);
          ctx.fillStyle = 'white';
          ctx.fillText(labelText, drawX + 5, drawY - 6);
          } // end if monitorPageVisible

          // UI
          updateMetricValue('m-distance', smoothDistCm, distLevel);
          updateMetricValue('m-posture', smoothPosture + '\u00B0', postureLevel);
          updateMetricValue('m-ear', smoothEAR.toFixed(2), earLevel);
          // 眨眼频率：使用时间间隔计算，不再显示"采集中"
          var displayBlinkRate = Math.round(smoothBlinkRate);
          if (displayBlinkRate < 0) displayBlinkRate = 0;
          updateMetricValue('m-blink-rate', displayBlinkRate + ' 次/分', displayBlinkRate < 10 ? 'bad' : (displayBlinkRate < 15 ? 'warn' : 'good'));
          updateMonitorStatus('face', 'warn', '降级模式: YCbCr肤色检测 (MediaPipe未就绪)');
          updateMonitorStatus('ear', earLevel, '眨眼检测: ' + smoothBlinkRate + '次/分');
          updateMonitorStatus('dist', distLevel, '距离估算: ' + smoothDistCm + 'cm');
          updateMonitorStatus('posture', postureLevel, '坐姿检测: ' + smoothPosture + '\u00B0');
          updateDashboardAI(smoothBlinkRate, smoothDistCm, smoothPosture);

          // 声音提醒：检测持续异常（降级模式）
          checkPersistentAlert(distLevel, 'distance');
          checkPersistentAlert(postureLevel, 'posture');
          checkPersistentAlert(earLevel, 'blink');

        } else {
          // 面部暂时不在画面中（可能太近、太远或转头）
          window._faceLostFrames = (window._faceLostFrames || 0) + 1;
          // 保持上一帧的平滑数据显示，但标记为搜索中
          var lostMsg = window._faceLostFrames < 30 ? '搜索面部中...' : (window._faceLostFrames < 60 ? '面部未检测到，请调整位置' : '长时间未检测到面部');
          updateMonitorStatus('face', 'warn', 'MediaPipe: ' + lostMsg);
          // 仍然显示上一帧的有效数据（不冻结）
          if (window._smoothDistCm !== undefined) {
            var lostDist = Math.round(window._smoothDistCm);
            var lostPosture = Math.round(window._smoothPosture || 70);
            var lostEAR = window._smoothEAR || 0.25;
            updateMetricValue('m-distance', lostDist, 'warn');
            updateMetricValue('m-posture', lostPosture + '\u00B0', 'warn');
            updateMetricValue('m-ear', lostEAR.toFixed(3), 'warn');
            updateMonitorStatus('dist', 'warn', '距离估算: ' + lostDist + 'cm (保持)');
            updateMonitorStatus('posture', 'warn', '坐姿检测: ' + lostPosture + '\u00B0 (保持)');
          }
        }
      } else {
        updateMonitorStatus('face', 'bad', '画面数据获取失败');
      }

      // 如果MediaPipe还没初始化，尝试初始化
      if (!faceLandmarker && !mediapipeInitializing) {
        initFaceLandmarker();
      }
    }

    // ====== 统一数据保存（无论是否检测到面部，都使用最新平滑值记录） ======
    if (monitorSessionStart && (!window._lastSaveTime || Date.now() - window._lastSaveTime > 10000)) {
      window._lastSaveTime = Date.now();
      // 使用全局平滑值，即使当前帧未检测到面部也能记录上一次有效数据
      var recordDist = (window._smoothDistCm !== undefined && !isNaN(window._smoothDistCm)) ? Math.round(window._smoothDistCm) : 50;
      var recordPosture = (window._smoothPosture !== undefined && !isNaN(window._smoothPosture)) ? Math.round(window._smoothPosture) : 70;
      var recordEAR = (window._smoothEAR !== undefined && !isNaN(window._smoothEAR)) ? window._smoothEAR : 0.25;
      var recordBlink = (window._smoothBlinkRate !== undefined && !isNaN(window._smoothBlinkRate)) ? Math.round(window._smoothBlinkRate) : -1;
      var sessionRecord = {
        id: Date.now() + '_' + Math.random().toString(36).substr(2,4),
        timestamp: new Date().toISOString(),
        blinkRate: recordBlink,
        distance: recordDist,
        ear: recordEAR,
        posture: recordPosture
      };
      dbPut('sessions', sessionRecord).catch(function(e) { console.warn('保存会话数据失败:', e); });
      if (!window._liveSessionData) window._liveSessionData = [];
      window._liveSessionData.push(sessionRecord);
      if (window._liveSessionData.length > 500) window._liveSessionData = window._liveSessionData.slice(-500);
      // 节流更新图表（每10秒一次）
      if (typeof updateChartsWithRealData === 'function') {
        try {
          var sessions = window._liveSessionData;
          var daily = {};
          sessions.forEach(function(r) {
            var day = r.timestamp ? new Date(r.timestamp).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'}) : '今天';
            if (!daily[day]) daily[day] = [];
            daily[day].push(r);
          });
          updateChartsWithRealData(sessions, daily);
        } catch(chartErr) { console.warn('更新图表失败:', chartErr); }
      }
    }

    // Session time
    if (monitorSessionStart) {
      const elapsed = Math.floor((Date.now() - monitorSessionStart) / 1000);
      const min = Math.floor(elapsed / 60);
      const sec = elapsed % 60;
      updateMetricValue('m-session-time', min + ':' + String(sec).padStart(2, '0'), 'good');
    }
    updateMetricValue('m-alert-count', monitorAlertCount, monitorAlertCount > 0 ? 'bad' : 'good');

    // 自适应帧率：监测页面50ms(20fps)，其他页面100ms(10fps)节省CPU
    var loopInterval = monitorPageVisible ? 50 : 100;
    if (appState.monitorActive) monitorAnimFrame = setTimeout(() => runMonitorLoop(video), loopInterval);
    } catch(loopErr) {
      console.error('Monitor loop error:', loopErr);
      if (appState.monitorActive) monitorAnimFrame = setTimeout(() => runMonitorLoop(video), 100);
    }
  }

  function updateMonitorStatus(type, level, text) {
    const dot = document.getElementById('ms-dot-' + type);
    const txt = document.getElementById('ms-text-' + type);
    if (dot) { dot.className = 'monitor-status-dot ' + level; }
    if (txt) { txt.textContent = text; }
  }

  function updateMetricValue(id, value, level) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
    el.className = 'metric-value ' + (level || 'good');
  }

  function updateDashboardAI(blinkRate, dist, posture) {
    const blinkEl = document.getElementById('ai-blink-rate');
    const distEl = document.getElementById('ai-distance');
    const postureEl = document.getElementById('ai-posture');
    // NaN 防护
    var safeBlink = (isNaN(blinkRate) || blinkRate === -1) ? -1 : Math.round(blinkRate);
    var safeDist = (isNaN(dist) || !isFinite(dist)) ? 50 : Math.round(dist);
    var safePosture = (isNaN(posture) || !isFinite(posture)) ? null : Math.round(posture);
    const newBlinkText = safeBlink === -1 ? '采集中' : safeBlink + '/min';
    const newDistText = safeDist + 'cm';
    const newPostureText = safePosture !== undefined && safePosture !== null ? safePosture + '\u00B0' : '--';
    if (blinkEl && blinkEl.textContent !== newBlinkText) {
      blinkEl.textContent = newBlinkText;
      blinkEl.className = 'ai-metric-mini-value ' + (safeBlink === -1 ? 'warn' : (safeBlink < appState.thresholds.blink ? 'bad' : 'good'));
    }
    if (distEl && distEl.textContent !== newDistText) {
      distEl.textContent = newDistText;
      distEl.className = 'ai-metric-mini-value ' + (safeDist < appState.thresholds.distance ? 'bad' : 'good');
    }
    if (postureEl && postureEl.textContent !== newPostureText) {
      postureEl.textContent = newPostureText;
      postureEl.className = 'ai-metric-mini-value ' + (safePosture === undefined || safePosture === null ? '' : (safePosture > appState.thresholds.postureWarn ? 'good' : (safePosture > appState.thresholds.posture ? 'warn' : 'bad')));
    }
  }

  function stopMonitoring() {
    
    appState.monitorActive = false;
    stopFreeTimer();
    // 彻底清理定时器和动画帧
    if (monitorAnimFrame) { clearTimeout(monitorAnimFrame); monitorAnimFrame = null; }
    // 关闭共享 AudioContext 释放音频资源
    if (_sharedAudioCtx && _sharedAudioCtx.state !== 'closed') {
      try { _sharedAudioCtx.close(); } catch(e) {}
      _sharedAudioCtx = null;
    }
    if (window._visHandler) { document.removeEventListener('visibilitychange', window._visHandler); window._visHandler = null; }
    if (window._blurHandler) { window.removeEventListener('blur', window._blurHandler); window._blurHandler = null; }
    if (window._focusHandler) { window.removeEventListener('focus', window._focusHandler); window._focusHandler = null; }
    if (window._titleBlinkInterval) { clearInterval(window._titleBlinkInterval); window._titleBlinkInterval = null; }
    if (window._origTitle) { document.title = window._origTitle; window._origTitle = null; }
    // 清理摄像头流
    if (monitorStream) { try { monitorStream.getTracks().forEach(t => t.stop()); } catch(e) {} monitorStream = null; }
    monitorTooCloseStart = null;
    lastBeepTime = 0;
    badStatusStartTime = {};
    monitorSessionStart = null;
    window._monitorResuming = false;
    window._backgroundTime = null;
    window._lastSaveTime = null;
    // 清理全局监测状态（防止下次启动时残留旧数据）
    window._liveSessionData = null;
    window._monitorFrameCount = 0;
    window._lastVideoCurrentTime = undefined;
    window._lastActiveVideoTime = undefined;
    window._lastBlinkCleanup = undefined;
    window._faceLostFrames = 0;
    window._smoothDistCm = undefined;
    window._smoothPosture = undefined;
    window._smoothEAR = undefined;
    window._smoothBlinkRate = undefined;
    window._lastStableDist = undefined;
    window._lastStablePosture = undefined;
    window._lastStableEAR = undefined;
    window._freeServerQueried = false; // 下次启动监测时重新查询服务器
    // 清理视频和canvas
    const video = document.getElementById('monitor-video');
    if (video) { video.srcObject = null; video.style.cssText = 'display:none;'; video.onloadedmetadata = null; }
    var ph = document.getElementById('monitor-placeholder'); if (ph) ph.style.display = '';
    var lb = document.getElementById('monitor-live-badge'); if (lb) lb.style.display = 'none';
    var sl = document.getElementById('monitor-scan-line'); if (sl) sl.style.display = 'none';
    const canvas = document.getElementById('monitor-overlay-canvas');
    if (canvas) {
      try {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } catch(e) {}
    }
    var faceBox = document.getElementById('ai-face-box');
    if (faceBox) faceBox.style.display = 'none';
    var liveDot2 = document.getElementById('dashboard-live-dot');
    if (liveDot2) { liveDot2.classList.remove('active'); liveDot2.classList.add('inactive'); }
    // 恢复按钮文本和样式
    var startBtn = document.getElementById('btn-start-monitor');
    if (startBtn) {
      startBtn.textContent = '开启监测';
      startBtn.onclick = startMonitoring;
      startBtn.disabled = false;
      startBtn.style.opacity = '1';
      startBtn.style.cursor = 'pointer';
    }
    var stopMonitorBtn = document.getElementById('btn-stop-monitor');
    if (stopMonitorBtn) stopMonitorBtn.style.display = 'none';
    // 重置状态指示
    updateMonitorStatus('face', 'warn', '画面分析: 已停止');
    updateMonitorStatus('ear', 'warn', '眨眼检测: 已停止');
    updateMonitorStatus('dist', 'warn', '距离估算: 已停止');
    updateMonitorStatus('posture', 'warn', '坐姿检测: 已停止');
    // 停止监测后保留最后一次有效数据（不重置指标，让它们显示最后一次记录的值）
  }

  // Web Audio API beep
  function playBeep(freq, duration, volume) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq || 880;
      osc.type = 'sine';
      gain.gain.value = Math.min(1.0, (volume || 0.3) * 2); // 默认音量翻倍，上限1.0
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      const dur = (duration || 0.15) * 1000;
      setTimeout(() => { osc.stop(); ctx.close(); }, dur);
    } catch(e) {}
  }

  // 声音提醒：持续异常检测（每个指标有独立的持续异常阈值）
  // 英文指标名 → 中文映射
  var metricNameCN = { distance: '面部距离', posture: '前后坐姿', pitch: '前后坐姿', yaw: '左右偏转', blink: '眨眼频率' };
    var metricDurationKey = { distance: 'alertDurationDistance', posture: 'alertDurationPosture', pitch: 'alertDurationPosture', yaw: 'alertDurationPosture', blink: 'alertDurationBlink' };
  function checkPersistentAlert(level, metricName) {
    var durationKey = metricDurationKey[metricName] || 'alertPersistDuration';
    var threshold = appState[durationKey] || appState.alertPersistDuration || 5;
    if (level === 'bad') {
      if (!badStatusStartTime[metricName]) badStatusStartTime[metricName] = Date.now();
      const duration = (Date.now() - badStatusStartTime[metricName]) / 1000;
      if (duration >= threshold && Date.now() - lastSoundAlertTime > threshold * 1000) {
        if (!appState.alertPaused) {
          monitorAlertCount++;
          updateMetricValue('m-alert-count', monitorAlertCount, monitorAlertCount > 0 ? 'bad' : 'good');
          playAlertSound(metricName);
          addMonitorLog('warning', '提醒: ' + (metricNameCN[metricName] || metricName) + ' 持续异常超过 ' + threshold + '秒');
          // 桌面通知弹窗（即使最小化也能看到）—— 必须同时检查浏览器权限和应用内开关
          try {
            if ((typeof Notification !== 'undefined') && Notification.permission === 'granted' && appState.permissions.autoRequestNotification !== false) {
              var notifyMetric = metricNameCN[metricName] || metricName;
              var n = new Notification('\u62A4\u773C\u7CBE\u7075 - \u7528\u773C\u9884\u8B66', {
                body: notifyMetric + ' 持\u7EED\u5F02\u5E38\u8D85\u8FC7 ' + threshold + '\u79D2\uFF0C\u8BF7\u53CA\u65F6\u8C03\u6574\uFF01',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">\uD83D\uDC41\uFE0F</text></svg>',
                tag: 'eye-guard-alert-' + metricName,
                requireInteraction: true,
                silent: false
              });
              setTimeout(function() { n.close(); }, 8000);
            } else if ((typeof Notification !== 'undefined') && Notification.permission === 'default' && appState.permissions.autoRequestNotification !== false) {
              // 权限尚未授予，且用户允许自动请求，再次请求（不阻塞，不等待结果）
              if (typeof Notification.requestPermission === 'function') {
                Notification.requestPermission();
              }
            }
          } catch(e) {}
        }
        lastSoundAlertTime = Date.now();
        badStatusStartTime[metricName] = Date.now();
      }
    } else {
      if (badStatusStartTime[metricName]) delete badStatusStartTime[metricName];
    }
  }

  function toggleAlertPause() {
    appState.alertPaused = !appState.alertPaused;
    const btn = document.getElementById('btn-pause-alert');
    if (btn) {
      if (appState.alertPaused) {
        btn.textContent = '恢复提醒';
        btn.style.background = CONSTANTS.DIST_WARN_08;
        showAlert('警告提醒已暂停', 'warn');
      } else {
        btn.textContent = '暂停提醒';
        btn.style.background = CONSTANTS.BUTTON_SUCCESS_BG;
        badStatusStartTime = {};
        showAlert('警告提醒已恢复', 'info');
      }
    }
  }

  function toggleFaceBox() {
    window._showFaceBox = !window._showFaceBox;
    const btn = document.getElementById('btn-toggle-facebox');
    if (btn) {
      if (window._showFaceBox) {
        btn.textContent = '隐藏识别框';
        btn.style.background = CONSTANTS.DIST_GOOD_08;
      } else {
        btn.textContent = '显示识别框';
        btn.style.background = CONSTANTS.BUTTON_MUTED_BG;
      }
    }
    // 隐藏时立即清除canvas
    if (!window._showFaceBox) {
      var canvas = document.getElementById('monitor-overlay-canvas');
      if (canvas) {
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  function addMonitorLog(type, message) {
    const logList = document.getElementById('monitor-log-list');
    if (!logList) return;
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0');
    const icons = { warning: '\u26A0', info: '\uD83D\uDCA1', success: '\u2705' };
    const tags = { warning: 'warn', info: 'info', success: 'good' };
    const tagLabels = { warning: '警告', info: '信息', success: '成功' };
    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = '<div class="log-time">' + timeStr + '</div><div class="log-icon ' + type + '">' + (icons[type]||'') + '</div><div class="log-content"></div><div class="log-tag ' + (tags[type]||'info') + '">' + (tagLabels[type]||'') + '</div>';
    var titleEl = document.createElement('div');
    titleEl.className = 'log-title';
    titleEl.textContent = message;
    item.querySelector('.log-content').appendChild(titleEl);
    logList.insertBefore(item, logList.firstChild);
    while (logList.children.length > 20) logList.removeChild(logList.lastChild);
    // 更新日志计数标签
    var countLabel = document.getElementById('log-count-label');
    if (countLabel) countLabel.textContent = '最近 ' + logList.children.length + ' 条';
    // 自动滚动到顶部显示最新日志
    logList.scrollTop = 0;
  }

  // 全局共享 AudioContext，避免每次播放提示音都创建新的（内存泄漏）
  var _sharedAudioCtx = null;
  function getAudioContext() {
    if (!_sharedAudioCtx || _sharedAudioCtx.state === 'closed') {
      _sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return _sharedAudioCtx;
  }

  function playAlertSound(type) {
    if (!appState.alertSound) return;
    try {
      const audioCtx = getAudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'distance') {
        // 距离提醒：低频双音
        oscillator.frequency.value = 440;
        gainNode.gain.value = 1.2;
        oscillator.start();
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(520, audioCtx.currentTime + 0.15);
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.stop(audioCtx.currentTime + 0.5);
      } else {
        // 默认提醒：高频三音
        oscillator.frequency.value = 660;
        gainNode.gain.value = 0.8;
        oscillator.start();
        oscillator.frequency.setValueAtTime(660, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(660, audioCtx.currentTime + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        oscillator.stop(audioCtx.currentTime + 0.4);
      }

      // 声音播放完毕后关闭 oscillator，释放资源
      oscillator.onended = function() { try { oscillator.disconnect(); } catch(e) {} };

      // 手机/平板振动反馈
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 300]);
      }
    } catch(e) {}
  }

  // ===================== Restore Settings =====================
  async function restoreAllSettings() {
    try {
      const userRec = await dbGet('settings', 'user');
      if (userRec && userRec.data) {
        appState.user = { ...appState.user, ...userRec.data };
      }
      const devicesRec = await dbGet('settings', 'devices');
      if (devicesRec && devicesRec.data) { appState.devices = devicesRec.data; }
      // 恢复上次选择的监测设备
      const selectedDevRec = await dbGet('settings', 'selectedMonitorDevice');
      if (selectedDevRec && selectedDevRec.value) { appState.selectedMonitorDevice = selectedDevRec.value; }
      // 不自动恢复设备连接状态（每次需要重新连接）
      // const connectedRec = await dbGet('settings', 'connectedDevices');
      // if (connectedRec && connectedRec.data) { appState.connectedDevices = connectedRec.data; }
      const permRec = await dbGet('settings', 'permissions');
      if (permRec && permRec.data) { appState.permissions = permRec.data; }
      const thresholdsRec = await dbGet('settings', 'thresholds');
      if (thresholdsRec && thresholdsRec.data) { appState.thresholds = thresholdsRec.data; }
      // 兼容旧数据：如果没有 warn 阈值，自动计算
      if (!appState.thresholds.distanceWarn) appState.thresholds.distanceWarn = appState.thresholds.distance + 10;
      if (!appState.thresholds.blinkWarn) appState.thresholds.blinkWarn = appState.thresholds.blink + 5;
      const sceneRec = await dbGet('settings', 'scene');
      if (sceneRec && sceneRec.data) { appState.scene = sceneRec.data; }
      const eyeModeRec = await dbGet('settings', 'eyeMode');
      if (eyeModeRec && eyeModeRec.data !== undefined) { appState.eyeMode = eyeModeRec.data; }
      const calDataRec = await dbGet('settings', 'calibrationData');
      if (calDataRec && calDataRec.data) { appState.calibrationData = calDataRec.data; }
      // 恢复声音和持续时长设置
      const alertSoundSetting = await dbGet('settings', 'alertSound');
      if (alertSoundSetting) appState.alertSound = alertSoundSetting.value;
      const alertDurSetting = await dbGet('settings', 'alertPersistDuration');
      if (alertDurSetting) appState.alertPersistDuration = alertDurSetting.value;
      // Restore Pro license
      const proRec = await dbGet('settings', 'proLicense');
      if (proRec && proRec.value) {
        appState.pro = proRec.value;
        if (appState.pro.planType !== 'lifetime' && appState.pro.expiresAt && Date.now() > appState.pro.expiresAt) {
          appState.pro = { activated: false, code: null, activatedAt: null, planType: null, expiresAt: null };
          dbPut('settings', { key: 'proLicense', value: appState.pro });
        }
      }
      // 启动时在线校验激活状态（强制联网验证）
      if (appState.pro.activated && appState.pro.code && API_BASE_URL) {
        try {
          // 5秒超时，防止服务器无响应卡住加载
          var ctrl = new AbortController();
          var tmr = setTimeout(function() { ctrl.abort(); }, 5000);
          const verifyRes = await fetch(API_BASE_URL + '/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: appState.pro.code,
              phone: appState.pro.boundPhone || appState.user.phone || ''
            }),
            signal: ctrl.signal
          });
          clearTimeout(tmr);
          // 检测HTML响应（API不存在时返回404页面）
          const resCt = verifyRes.headers.get('content-type') || '';
          if (resCt.indexOf('text/html') !== -1) {
            throw new Error('API不可用');
          }
          const verifyData = await verifyRes.json();
          if (!verifyData.valid) {
            // 服务器端已失效（被撤销或过期），本地同步失效
            appState.pro = { activated: false, code: null, activatedAt: null, planType: null, expiresAt: null };
            dbPut('settings', { key: 'proLicense', value: appState.pro });
            _proVerified = false;
            showAlert('您的会员已失效，请重新激活', 'warn', '⏰');
          } else {
            _proVerified = true;
            if (verifyData.plan) {
              appState.pro.planType = verifyData.plan;
              // 优先使用服务器返回的精确到期时间戳，否则用剩余天数估算
              if (verifyData.expires_at) {
                appState.pro.expiresAt = verifyData.expires_at * 1000; // 秒转毫秒
              } else if (verifyData.remaining_days !== undefined && appState.pro.planType !== 'lifetime') {
                appState.pro.expiresAt = Date.now() + verifyData.remaining_days * 24 * 60 * 60 * 1000;
              }
              // 同步激活码数量
              if (verifyData.active_codes_count) {
                appState.pro.totalCodes = verifyData.active_codes_count;
              }
              dbPut('settings', { key: 'proLicense', value: appState.pro });
            }
          }
        } catch(e) {
          // 网络失败时：保留本地激活信息，提示用户稍后重试
          if (appState.pro.planType !== 'lifetime') {
            _proVerified = false;
            // 不清除本地激活信息，只在 isPro() 中阻止使用
            // 延迟5秒后后台静默重试（不阻塞UI）
            setTimeout(function() {
              if (appState.pro.activated && appState.pro.code && API_BASE_URL) {
                var ctrl2 = new AbortController();
                setTimeout(function() { ctrl2.abort(); }, 5000);
                fetch(API_BASE_URL + '/api/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code: appState.pro.code, phone: appState.pro.boundPhone || appState.user.phone || '' }),
                  signal: ctrl2.signal
                }).then(function(r) { return r.json(); }).then(function(d) {
                  if (d.valid) { _proVerified = true; updateProUI(); }
                }).catch(function() {});
              }
            }, 5000);
          }
        }
      }
      // Restore free time usage
      const ftRec = await dbGet('settings', 'freeTimeUsage');
      if (ftRec && ftRec.value) {
        var today = _getTodayStrUTC8();
        if (ftRec.value.date === today) {
          appState.freeMinutesUsedToday = ftRec.value.minutes || 0;
          appState.freeMinutesDate = today;
        } else {
          appState.freeMinutesUsedToday = 0;
          appState.freeMinutesDate = today;
        }
      }
      const alertDurDist = await dbGet('settings', 'alertDurationDistance');
      if (alertDurDist) appState.alertDurationDistance = alertDurDist.value;
      const alertDurPosture = await dbGet('settings', 'alertDurationPosture');
      if (alertDurPosture) appState.alertDurationPosture = alertDurPosture.value;
      const alertDurBlink = await dbGet('settings', 'alertDurationBlink');
      if (alertDurBlink) appState.alertDurationBlink = alertDurBlink.value;
    } catch(err) { console.warn('Restore settings error:', err); }

    // ===================== Mobile-specific adjustments =====================
    if (IS_MOBILE) {
      // 手机端：禁用笔记本、硬件终端、USB传感器、蓝牙BLE
      ['laptop','hardware','usb-sensor','bt-le'].forEach(d => {
        appState.devices[d] = false;
      });
      // 启用手机摄像头
      appState.devices['phone'] = true;
    }
    if (IS_TABLET) {
      // 平板端：禁用笔记本、硬件终端、USB传感器、蓝牙BLE
      ['laptop','hardware','usb-sensor','bt-le'].forEach(d => {
        appState.devices[d] = false;
      });
      // 启用平板摄像头
      appState.devices['tablet'] = true;
    }
    // 移动端修改设备描述文字
    if (IS_MOBILE || IS_TABLET) {
      var phoneDesc = document.getElementById('desc-phone');
      var tabletDesc = document.getElementById('desc-tablet');
      if (phoneDesc) phoneDesc.textContent = '使用本机前置摄像头进行面部检测';
      if (tabletDesc) tabletDesc.textContent = '使用本机前置摄像头进行面部检测';
      // 隐藏不需要的设备卡片
      ['laptop','hardware','usb-sensor','bt-le'].forEach(id => {
        var card = document.getElementById('card-' + id);
        if (card) card.style.display = 'none';
      });
    }
    // 移动端默认选择手机/平板作为监测设备
    if (IS_MOBILE && appState.devices['phone']) {
      appState.selectedMonitorDevice = 'phone';
    }
    if (IS_TABLET && appState.devices['tablet']) {
      appState.selectedMonitorDevice = 'tablet';
    }
    // 桌面端默认选择 laptop 作为监测设备
    if (!IS_MOBILE && !IS_TABLET && appState.devices['laptop']) {
      appState.selectedMonitorDevice = 'laptop';
    }
    // 首次使用显示隐私保护声明
    showPrivacyNotice();

    // Apply to UI
    renderUserProfile();
    refreshDeviceCards();
    refreshPermissionToggles();
    // 自动请求通知权限（如果用户设置了允许且尚未授予）
    if (appState.permissions.autoRequestNotification !== false) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().then(function(result) {
          appState.permissions.notification = result;
          dbPut('settings', { key:'permissions', data: appState.permissions });
          refreshPermissionToggles();
        }).catch(function() {});
      }
    }
    refreshSettingsDeviceList();
    refreshMonitorDeviceSelector();
    updateProUI();

    // Apply scene
    document.querySelectorAll('.scene-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.scene === appState.scene));
    applyScenePreset(appState.scene);

    // Apply thresholds to sliders
    const t = appState.thresholds;

    // Restore calibration status
    restoreCalibration();
    document.getElementById('slider-distance').value = t.distance;
    document.getElementById('slider-distance-val').textContent = t.distance + 'cm';
    const dwSlider = document.getElementById('slider-distance-warn');
    const dwVal = document.getElementById('slider-distance-warn-val');
    if (dwSlider && appState.thresholds.distanceWarn) { dwSlider.value = appState.thresholds.distanceWarn; }
    if (dwVal && appState.thresholds.distanceWarn) { dwVal.textContent = appState.thresholds.distanceWarn + 'cm'; }
    var intMinEl = document.getElementById('setting-interval-min');
    var intSecEl = document.getElementById('setting-interval-sec');
    var totalSec = (t.intervalMin || 0) * 60 + (t.intervalSec !== undefined ? t.intervalSec : Math.round((t.interval || 0) % 60));
    appState.thresholds.intervalMin = Math.floor(totalSec / 60);
    appState.thresholds.intervalSec = totalSec % 60;
    appState.thresholds.interval = totalSec;
    if (intMinEl) intMinEl.value = appState.thresholds.intervalMin;
    if (intSecEl) intSecEl.value = appState.thresholds.intervalSec;
    document.getElementById('slider-blink').value = t.blink;
    document.getElementById('slider-blink-val').textContent = t.blink + '次/min';
    const bwSlider = document.getElementById('slider-blink-warn');
    const bwVal = document.getElementById('slider-blink-warn-val');
    if (bwSlider && appState.thresholds.blinkWarn) { bwSlider.value = appState.thresholds.blinkWarn; }
    if (bwVal && appState.thresholds.blinkWarn) { bwVal.textContent = appState.thresholds.blinkWarn + '次/min'; }
    document.getElementById('slider-ear').value = t.ear;
    document.getElementById('slider-ear-val').textContent = '0.' + String(t.ear).padStart(2, '0');

    // Restore posture thresholds
    var psSlider = document.getElementById('slider-posture');
    if (psSlider && appState.thresholds.posture) { psSlider.value = appState.thresholds.posture; document.getElementById('slider-posture-val').textContent = appState.thresholds.posture + '°'; }
    var pwSlider = document.getElementById('slider-posture-warn');
    if (pwSlider && appState.thresholds.postureWarn) { pwSlider.value = appState.thresholds.postureWarn; document.getElementById('slider-posture-warn-val').textContent = appState.thresholds.postureWarn + '°'; }
    // 兼容旧数据：如果没有 postureWarn，自动计算
    if (!appState.thresholds.posture) appState.thresholds.posture = 70;
    if (!appState.thresholds.postureWarn) appState.thresholds.postureWarn = appState.thresholds.posture + 10;

    // Apply eye mode (统一使用 eye-care-mode，由 restoreTheme 处理)
    // filter-based 恢复逻辑已移除，统一由 body.eye-care-mode class + CSS 处理

    // Setup welcome or skip
    setupWelcome();
  }

  // ===================== Init =====================
  // ====== Privacy Notice ======
  function showPrivacyNotice() {
    var accepted = localStorage.getItem('eye_privacy_accepted');
    if (!accepted) {
      var modal = document.getElementById('privacy-modal');
      if (modal) {
        modal.style.display = 'flex';
        setTimeout(function(){ modal.classList.add('open'); }, 10);
      }
    }
  }

  function acceptPrivacy() {
    localStorage.setItem('eye_privacy_accepted', '1');
    var modal = document.getElementById('privacy-modal');
    if (modal) {
      modal.classList.remove('open');
      setTimeout(function(){ modal.style.display = 'none'; }, 300);
    }
    // 隐私协议确认后，进入欢迎面板（设置昵称和绑定手机号）
    setupWelcome();
  }

  async function init() {
    var initStep = 'start';
    try {
      initStep = 'openDB';
      await openDB();
      initStep = 'restoreSettings';
      await restoreAllSettings();
      initStep = 'restoreTheme';
      restoreTheme();
      initStep = 'refreshStorage';
      if (typeof refreshStorageInfo === 'function') refreshStorageInfo();
      initStep = 'initCharts';
      function tryInitChartsOnLoad() {
        if (typeof echarts === 'undefined') { setTimeout(tryInitChartsOnLoad, 500); return; }
        initAllCharts();
      }
      setTimeout(tryInitChartsOnLoad, 300);
      if (typeof updateChartsWithRealData === 'function') {
        dbGetAll('sessions').then(function(recs) {
          if (recs && recs.length > 0) {
            var daily = {};
            recs.forEach(function(r) {
              var day = r.timestamp ? new Date(r.timestamp).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'}) : '今天';
              if (!daily[day]) daily[day] = [];
              daily[day].push(r);
            });
            updateChartsWithRealData(recs, daily);
          }
        });
      }
    } catch(err) {
      console.error('[init] 错误发生在步骤:', initStep, err);
      try { renderUserProfile(); } catch(e) { console.error('[init] renderUserProfile失败:', e); }
      try { refreshDeviceCards(); } catch(e) { console.error('[init] refreshDeviceCards失败:', e); }
      try { refreshSettingsDeviceList(); } catch(e) { console.error('[init] refreshSettingsDeviceList失败:', e); }
      try { setupWelcome(); } catch(e) { console.error('[init] setupWelcome失败:', e); }
      if (IS_MOBILE || IS_TABLET) {
        ['laptop','hardware','usb-sensor','bt-le'].forEach(id => {
          var card = document.getElementById('card-' + id);
          if (card) card.style.display = 'none';
        });
        var phoneDesc = document.getElementById('desc-phone');
        var tabletDesc = document.getElementById('desc-tablet');
        if (phoneDesc) phoneDesc.textContent = '使用本机前置摄像头进行面部检测';
        if (tabletDesc) tabletDesc.textContent = '使用本机前置摄像头进行面部检测';
      }
      if (IS_MOBILE && location.protocol === 'file:') {
        const devicePanel = document.querySelector('.device-status-panel');
        if (devicePanel) {
          const hint = document.createElement('div');
          hint.style.cssText = 'padding:12px 16px;background:rgba(200,135,77,0.1);border:1px solid rgba(200,135,77,0.3);border-radius:10px;margin-bottom:12px;font-size:13px;color:var(--accent);line-height:1.6;';
          hint.innerHTML = '<strong>摄像头提示</strong>：手机浏览器直接打开HTML文件无法使用摄像头。请通过电脑局域网服务器访问（如 http://192.168.x.x:8765），或在Chrome地址栏设置允许file://访问摄像头。';
          devicePanel.insertBefore(hint, devicePanel.firstChild);
        }
      }
    }
    var loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
    if (typeof window._cancelLoadingAutoHide === 'function') {
      window._cancelLoadingAutoHide();
    }
    console.log('[init] 加载完成，步骤:', initStep);
  }

  // Toast close handler
  document.getElementById('alert-toast-close').addEventListener('click', hideAlert);

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileNavClose = document.getElementById('mobile-nav-close');
  const sidebar = document.querySelector('.sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  function openSidebarBackdrop() {
    if (sidebarBackdrop) {
      sidebarBackdrop.style.display = 'block';
      requestAnimationFrame(() => sidebarBackdrop.classList.add('open'));
    }
    document.body.style.overflow = 'hidden';
  }
  function closeSidebarBackdrop() {
    if (sidebarBackdrop) {
      sidebarBackdrop.classList.remove('open');
      setTimeout(() => { sidebarBackdrop.style.display = 'none'; }, 300);
    }
    document.body.style.overflow = '';
  }
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      if (sidebar.classList.contains('mobile-open')) {
        openSidebarBackdrop();
      } else {
        closeSidebarBackdrop();
      }
    });
  }
  if (mobileNavClose && sidebar) {
    mobileNavClose.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      closeSidebarBackdrop();
    });
  }
  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('mobile-open');
      closeSidebarBackdrop();
    });
  }
  // Close sidebar when clicking a nav item on mobile
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('mobile-open');
        closeSidebarBackdrop();
      }
    });
  });

  // 7天/30天图表切换
  document.querySelectorAll('[data-range]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-range]').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      var range = parseInt(this.getAttribute('data-range'));
      if (typeof updateChartsWithRealData === 'function') {
        dbGetAll('sessions').then(function(recs) {
          var daily = {};
          (recs||[]).forEach(function(r) {
            var day = r.timestamp ? new Date(r.timestamp).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'}) : '今天';
            if (!daily[day]) daily[day] = [];
            daily[day].push(r);
          });
          var days = Object.keys(daily);
          var now = Date.now();
          var filtered = {};
          days.forEach(function(d) {
            var recsForDay = daily[d];
            var latest = recsForDay[recsForDay.length-1];
            if (latest && latest.timestamp && (now - latest.timestamp) < range * 86400000) {
              filtered[d] = recsForDay;
            }
          });
          updateChartsWithRealData(Object.values(filtered).flat() || [], filtered);
        });
      }
    });
  });

  // ====== 报告动态数据 ======
  function updateReportValue(id, text, level) {
    const el = document.getElementById(id);
    if (el) { el.textContent = text; el.className = 'report-item-value ' + (level || ''); }
  }

  function refreshReport() {
    // 动态日期
    const reportDateEl = document.getElementById('report-date');
    if (reportDateEl) {
      const now = new Date();
      reportDateEl.textContent = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';
    }

    // 电脑信息（从 navigator API 获取）
    const cpuEl = document.getElementById('report-device-cpu');
    if (cpuEl) {
      const ua = navigator.userAgent;
      const cpuMatch = ua.match(/Intel[^;)]*Processor|AMD[^;)]*Processor/g);
      const cpu = cpuMatch ? cpuMatch[0] : (navigator.hardwareConcurrency || '?') + '核处理器';
      cpuEl.innerHTML = '<strong>处理器:</strong> ' + cpu;
    }
    const screenEl = document.getElementById('report-device-screen');
    if (screenEl) {
      screenEl.innerHTML = '<strong>屏幕:</strong> ' + screen.width + 'x' + screen.height;
    }
    const memEl = document.getElementById('report-device-mem');
    if (memEl) {
      memEl.innerHTML = '<strong>内存:</strong> ' + (navigator.deviceMemory || '未知') + 'GB';
    }

    // 从 IndexedDB 读取 sessions 数据
    dbGetAll('sessions').then(function(sessions) {
      const hasData = sessions && sessions.length > 0;

      if (hasData) {
        // 眨眼健康
        const avgBlink = Math.round(sessions.reduce(function(s, r) { return s + (r.blinkRate || 0); }, 0) / sessions.length);
        updateReportValue('report-blink-avg', avgBlink + '次/min', 'good');
        // 基于sessions的EAR数据估算最长不眨眼：取EAR最大值（眼睛最睁大时）
        var maxEar = Math.max.apply(null, sessions.map(function(s) { return s.ear || 0.25; }));
        var maxBlinkDuration = Math.round((1 - maxEar) * 100);
        updateReportValue('report-blink-max', maxBlinkDuration > 0 ? maxBlinkDuration + 's' : '--', 'warn');
        // 无左右眼分离数据，无法计算平衡性
        updateReportValue('report-blink-balance', '--', '');
        const blinkBar = document.getElementById('report-blink-bar');
        if (blinkBar) blinkBar.style.width = Math.min(100, avgBlink * 3) + '%';

        // 用眼距离
        const avgDist = Math.round(sessions.reduce(function(s, r) { return s + (r.distance || 50); }, 0) / sessions.length);
        const minDist = Math.round(Math.min.apply(null, sessions.map(function(s) { return s.distance || 50; })));
        updateReportValue('report-dist-avg', avgDist + 'cm', avgDist >= 40 ? 'good' : 'warn');
        updateReportValue('report-dist-min', minDist + 'cm', minDist >= 30 ? 'good' : 'bad');
        const distRate = Math.round(sessions.filter(function(s) { return (s.distance || 50) >= 40; }).length / sessions.length * 100);
        updateReportValue('report-dist-rate', distRate + '%', distRate >= 70 ? 'warn' : 'bad');
        const distBar = document.getElementById('report-dist-bar');
        if (distBar) distBar.style.width = distRate + '%';

        // 坐姿
        const avgPosture = Math.round(sessions.reduce(function(s, r) { return s + (r.posture || 80); }, 0) / sessions.length);
        updateReportValue('report-posture-avg', avgPosture + '度', avgPosture >= 75 ? 'good' : 'warn');
        // 无背部姿态传感器，无法检测驼背
        updateReportValue('report-posture-hump', '--', '');
        updateReportValue('report-posture-bad', Math.round((1 - sessions.filter(function(s) { return (s.posture || 80) >= 75; }).length / sessions.length) * 100) + '%', 'good');
        const postureBar = document.getElementById('report-posture-bar');
        if (postureBar) postureBar.style.width = (sessions.filter(function(s) { return (s.posture || 80) >= 75; }).length / sessions.length * 100) + '%';

        // 健康评分
        var score = Math.round(60 + Math.min(avgBlink, 15) / 15 * 15 + Math.min(avgDist, 60) / 60 * 15 + avgPosture / 100 * 10);
        score = Math.min(100, Math.max(0, score));
        document.querySelector('.report-score-value').textContent = score;

        // 统计卡片
        var sessionMinutes = sessions.length * 0.17; // 每次 ~10秒
        var totalHours = Math.round(sessionMinutes / 60);
        document.getElementById('report-stat-hours').innerHTML = totalHours + '<span class="stat-unit"> 小时</span>';
        document.getElementById('report-stat-hours-trend').textContent = '基于' + sessions.length + '条监测记录';
        // 计算实际使用天数（基于唯一日期）
        var uniqueDates = [];
        sessions.forEach(function(r) {
          if (r.timestamp) {
            var d = new Date(r.timestamp).toDateString();
            if (uniqueDates.indexOf(d) === -1) uniqueDates.push(d);
          }
        });
        var usedDays = Math.min(7, uniqueDates.length);
        document.getElementById('report-stat-days').innerHTML = usedDays + '<span class="stat-unit"> / 7天</span>';
        document.getElementById('report-stat-days-trend').textContent = usedDays + '天有监测记录';
        document.getElementById('report-stat-points').innerHTML = score * 10 + '<span class="stat-unit"> 分</span>';
        document.getElementById('report-stat-points-trend').textContent = '监测得分累计';
      }
      // 如果没有数据，HTML中已默认显示"暂无数据"
    }).catch(function() {});
  }

  // ====== 图表初始化 ======
  let chartInstances = {};
  let _chartResizeHandler = null; // 防止重复添加resize监听器

  function initAllCharts() {
    if (typeof echarts === 'undefined') {
      console.warn('[initAllCharts] echarts 尚未加载');
      return;
    }
    const activePage = document.querySelector('.page.active');
    if (!activePage) {
      console.warn('[initAllCharts] 没有活动的页面');
      return;
    }
    const pageId = activePage.id;
    console.log('[initAllCharts] 初始化页面:', pageId);

    // 安全清理当前页面的echarts实例（避免访问已dispose实例的属性）
    const containers = activePage.querySelectorAll('.chart-container');
    containers.forEach(function(el) {
      try {
        // 先清理占位文字
        if (el.children.length > 0 && !echarts.getInstanceByDom(el)) {
          el.innerHTML = '';
        }
        var inst = echarts.getInstanceByDom(el);
        if (inst) {
          inst.dispose();
          // 安全地从chartInstances中移除引用
          for (var key in chartInstances) {
            try {
              if (chartInstances[key] === inst) {
                delete chartInstances[key];
              }
            } catch(cleanErr) {
              delete chartInstances[key];
            }
          }
        }
      } catch(err) {
        console.warn('清理图表实例出错:', err);
      }
    });

    function getOrInit(el) {
      if (!el) return null;
      try {
        let inst = echarts.getInstanceByDom(el);
        if (!inst) {
          // 确保容器有可见尺寸再初始化
          var rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            // 容器尺寸为0，强制设置最小尺寸再尝试
            el.style.minHeight = '250px';
            el.style.minWidth = '100%';
            rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
              // 仍然为0，延迟初始化
              console.warn('[getOrInit] 容器尺寸仍为0:', el.id, rect.width, rect.height);
              return null;
            }
          }
          inst = echarts.init(el);
          console.log('[getOrInit] 图表创建成功:', el.id, rect.width+'x'+rect.height);
        }
        return inst;
      } catch(e) {
        console.warn('echarts.init 失败:', e);
        return null;
      }
    }

    // 验证echarts是否真正可用
    if (typeof echarts === 'undefined' || !echarts.init) {
      console.error('[initAllCharts] echarts库未正确加载！typeof echarts:', typeof echarts);
      activePage.querySelectorAll('.chart-container').forEach(function(el) {
        if (el.children.length === 0) {
          el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:CONSTANTS.ERROR;font-size:13px;text-align:center;padding:20px;">图表库加载失败<br>请刷新页面（Ctrl+F5）重试</div>';
        }
      });
      return;
    }

    const theme = {
      color: CONSTANTS.CHART_COLORS,
      backgroundColor: 'transparent'
    };

    // 模拟数据（初始化时使用，会被真实数据覆盖）
    const days = ['周一','周二','周三','周四','周五','周六','周日'];

    var initializedCharts = []; // 追踪本次初始化的图表

    // ===== 概览页图表 =====
    if (pageId === 'page-dashboard') {
      const usageTrend = getOrInit(document.getElementById('chart-usage-trend'));
      if (usageTrend) {
        usageTrend.setOption({
          ...theme,
          tooltip: { trigger: 'axis', backgroundColor: CONSTANTS.TOOLTIP_BG, borderColor: CONSTANTS.TOOLTIP_BORDER, textStyle: { color: CONSTANTS.TOOLTIP_TEXT, fontSize: 12 }, formatter: function(p) { if (p && p[0]) return p[0].axisValue + '<br/>' + p[0].marker + ' ' + p[0].seriesName + ': ' + p[0].value + 'cm'; return ''; } },
          grid: { left: 40, right: 20, top: 20, bottom: 30 },
          xAxis: { type: 'category', data: days, axisLine: { lineStyle: { color: CONSTANTS.AXIS_LINE } }, axisLabel: { color: CONSTANTS.MUTED_TEXT } },
          yAxis: { type: 'value', name: 'cm', axisLine: { show: false }, splitLine: { lineStyle: { color: CONSTANTS.SPLIT_LINE } }, axisLabel: { color: CONSTANTS.MUTED_TEXT } },
          series: [{
            type: 'line', data: [0, 0, 0, 0, 0, 0, 0],
            smooth: true, areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:CONSTANTS.HINT_BORDER},{offset:1,color:'rgba(200,135,77,0.02)'}]) },
            lineStyle: { color: CONSTANTS.PRIMARY, width: 2 }, itemStyle: { color: CONSTANTS.PRIMARY }
          }]
        });
        chartInstances['usageTrend'] = usageTrend;
        initializedCharts.push(usageTrend);
      }

      const alertPie = getOrInit(document.getElementById('chart-alert-pie'));
      if (alertPie) {
        alertPie.setOption({
          ...theme,
          tooltip: { trigger: 'item', backgroundColor: CONSTANTS.TOOLTIP_BG, borderColor: CONSTANTS.TOOLTIP_BORDER, textStyle: { color: CONSTANTS.TOOLTIP_TEXT, fontSize: 12 }, formatter: '{b}: {c}次 ({d}%)' },
          series: [{
            type: 'pie', radius: ['40%', '65%'], center: ['50%', '50%'],
            data: [],
            label: { color: CONSTANTS.MUTED_TEXT, fontSize: 11 },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } }
          }]
        });
        chartInstances['alertPie'] = alertPie;
        initializedCharts.push(alertPie);
      }

      const heatmapChart = getOrInit(document.getElementById('chart-heatmap'));
      if (heatmapChart) {
        heatmapChart.setOption({
          ...theme,
          tooltip: { trigger: 'axis', backgroundColor: CONSTANTS.TOOLTIP_BG, borderColor: CONSTANTS.TOOLTIP_BORDER, textStyle: { color: CONSTANTS.TOOLTIP_TEXT, fontSize: 12 }, formatter: function(p) { if (p && p[0]) return p[0].axisValue + '<br/>' + p[0].marker + ' ' + p[0].seriesName + ': ' + p[0].value + '分钟'; return ''; } },
          grid: { left: 40, right: 20, top: 20, bottom: 30 },
          xAxis: { type: 'category', data: ['6-9时','9-12时','12-15时','15-18时','18-21时','21-24时'], axisLabel: { color: CONSTANTS.MUTED_TEXT } },
          yAxis: { type: 'value', name: '分钟', axisLabel: { color: CONSTANTS.MUTED_TEXT }, splitLine: { lineStyle: { color: CONSTANTS.SPLIT_LINE } } },
          series: [{
            type: 'bar',
            data: [0, 0, 0, 0, 0, 0],
            itemStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:CONSTANTS.PRIMARY},{offset:1,color:CONSTANTS.HINT_BORDER}]), borderRadius: [4,4,0,0] }
          }]
        });
        chartInstances['heatmap'] = heatmapChart;
        initializedCharts.push(heatmapChart);
      }
    }

    // ===== 数据统计页图表 =====
    if (pageId === 'page-stats') {
      try {
      const realtime = getOrInit(document.getElementById('chart-realtime'));
      if (realtime) {
        realtime.setOption({
          ...theme,
          tooltip: { trigger: 'item', backgroundColor: CONSTANTS.TOOLTIP_BG, borderColor: CONSTANTS.TOOLTIP_BORDER, textStyle: { color: CONSTANTS.TOOLTIP_TEXT, fontSize: 12 }, formatter: '{b}: {c}分' },
          series: [{
            type: 'gauge', radius: '85%', startAngle: 200, endAngle: -20,
            axisLine: { lineStyle: { width: 15, color: [[0.3, '#c86464'], [0.7, '#c8c464'], [1, '#5a8f6a']] } },
            pointer: { width: 4, itemStyle: { color: CONSTANTS.PRIMARY } },
            axisTick: { show: false }, splitLine: { length: 10, lineStyle: { color: CONSTANTS.AXIS_LINE } },
            axisLabel: { color: CONSTANTS.MUTED_TEXT, distance: 18, fontSize: 11 },
            detail: { valueAnimation: true, formatter: '{value}分', color: CONSTANTS.PRIMARY, fontSize: 24, fontWeight: 'bold', offsetCenter: [0, '70%'] },
            data: [{ value: 0, name: '用眼健康' }],
            title: { offsetCenter: [0, '90%'], color: CONSTANTS.MUTED_TEXT, fontSize: 13 }
          }]
        });
        chartInstances['realtime'] = realtime;
        initializedCharts.push(realtime);
      }

      const compare = getOrInit(document.getElementById('chart-compare'));
      if (compare) {
        compare.setOption({
          ...theme,
          tooltip: { trigger: 'axis', backgroundColor: CONSTANTS.TOOLTIP_BG, borderColor: CONSTANTS.TOOLTIP_BORDER, textStyle: { color: CONSTANTS.TOOLTIP_TEXT, fontSize: 12 } },
          grid: { left: 40, right: 20, top: 55, bottom: 30 },
          legend: { data: ['本周', '上周'], textStyle: { color: CONSTANTS.MUTED_TEXT, fontSize: 11 }, top: 38 },
          xAxis: { type: 'category', data: days, axisLabel: { color: CONSTANTS.MUTED_TEXT } },
          yAxis: { type: 'value', axisLabel: { color: CONSTANTS.MUTED_TEXT }, splitLine: { lineStyle: { color: CONSTANTS.SPLIT_LINE } } },
          series: [
            { name: '本周', type: 'bar', data: [0, 0, 0, 0, 0, 0, 0], itemStyle: { color: CONSTANTS.PRIMARY, borderRadius: [3,3,0,0] } },
            { name: '上周', type: 'bar', data: [0, 0, 0, 0, 0, 0, 0], itemStyle: { color: CONSTANTS.HINT_BORDER, borderRadius: [3,3,0,0] } }
          ]
        });
        chartInstances['compare'] = compare;
        initializedCharts.push(compare);
      }

      const radar = getOrInit(document.getElementById('chart-radar'));
      if (radar) {
        radar.setOption({
          ...theme,
          tooltip: { trigger: 'item', backgroundColor: CONSTANTS.TOOLTIP_BG, borderColor: CONSTANTS.TOOLTIP_BORDER, textStyle: { color: CONSTANTS.TOOLTIP_TEXT, fontSize: 12 } },
          radar: {
            indicator: [
              { name: '眨眼', max: 100 }, { name: '距离', max: 100 },
              { name: '坐姿', max: 100 }, { name: '时长', max: 100 },
              { name: '频率', max: 100 }
            ],
            axisName: { color: CONSTANTS.MUTED_TEXT, fontSize: 11 },
            splitArea: { areaStyle: { color: ['rgba(200,135,77,0.05)', CONSTANTS.HINT_BG] } },
            splitLine: { lineStyle: { color: CONSTANTS.SPLIT_LINE } }
          },
          series: [{
            type: 'radar',
            data: [{
              value: [0, 0, 0, 0, 0],
              name: '本周',
              areaStyle: { color: 'rgba(200,135,77,0.2)' },
              lineStyle: { color: CONSTANTS.PRIMARY },
              itemStyle: { color: CONSTANTS.PRIMARY }
            }]
          }]
        });
        chartInstances['radar'] = radar;
        initializedCharts.push(radar);
      }

      const dailyDetail = getOrInit(document.getElementById('chart-daily-detail'));
      var timeSlotLabels = [];
      for (var ti = 0; ti < 24; ti += 3) timeSlotLabels.push(ti + ':00-' + (ti + 3) + ':00');
      if (dailyDetail) {
        dailyDetail.setOption({
          ...theme,
          tooltip: { trigger: 'axis', backgroundColor: CONSTANTS.TOOLTIP_BG, borderColor: CONSTANTS.TOOLTIP_BORDER, textStyle: { color: CONSTANTS.TOOLTIP_TEXT, fontSize: 12 } },
          grid: { left: 50, right: 20, top: 40, bottom: 40 },
          legend: { data: ['平均眨眼率', '平均距离(cm)', '预警次数'], textStyle: { color: CONSTANTS.MUTED_TEXT }, top: 5 },
          xAxis: { type: 'category', data: timeSlotLabels, axisLabel: { color: CONSTANTS.MUTED_TEXT, rotate: 20, fontSize: 10 } },
          yAxis: { type: 'value', axisLabel: { color: CONSTANTS.MUTED_TEXT }, splitLine: { lineStyle: { color: CONSTANTS.SPLIT_LINE } } },
          series: [
            { name: '平均眨眼率', type: 'line', smooth: true, data: [0,0,0,0,0,0,0,0], lineStyle: { color: CONSTANTS.PRIMARY }, itemStyle: { color: CONSTANTS.PRIMARY } },
            { name: '平均距离(cm)', type: 'line', smooth: true, data: [0,0,0,0,0,0,0,0], lineStyle: { color: CONSTANTS.SECONDARY }, itemStyle: { color: CONSTANTS.SECONDARY } },
            { name: '预警次数', type: 'bar', data: [0,0,0,0,0,0,0,0], itemStyle: { color: CONSTANTS.DANGER, borderRadius: [2,2,0,0] } }
          ]
        });
        chartInstances['dailyDetail'] = dailyDetail;
        initializedCharts.push(dailyDetail);
      }

      const healthTrend = getOrInit(document.getElementById('chart-health-trend'));
      const trendDays = Array.from({length: 30}, (_, i) => (i + 1) + '日');
      if (healthTrend) {
        healthTrend.setOption({
          ...theme,
          tooltip: { trigger: 'axis', backgroundColor: CONSTANTS.TOOLTIP_BG, borderColor: CONSTANTS.TOOLTIP_BORDER, textStyle: { color: CONSTANTS.TOOLTIP_TEXT, fontSize: 12 } },
          grid: { left: 40, right: 40, top: 40, bottom: 30 },
          legend: { data: ['健康评分', '平均视距(cm)'], textStyle: { color: CONSTANTS.MUTED_TEXT }, top: 5 },
          xAxis: { type: 'category', data: trendDays, axisLabel: { color: CONSTANTS.MUTED_TEXT, interval: 4 } },
          yAxis: [
            { type: 'value', name: '评分', min: 0, max: 100, axisLabel: { color: CONSTANTS.MUTED_TEXT }, splitLine: { lineStyle: { color: CONSTANTS.SPLIT_LINE } } },
            { type: 'value', name: 'cm', axisLabel: { color: CONSTANTS.MUTED_TEXT }, splitLine: { show: false } }
          ],
          series: [
            { name: '健康评分', type: 'line', smooth: true, data: trendDays.map(() => 0), lineStyle: { color: CONSTANTS.SECONDARY }, itemStyle: { color: CONSTANTS.SECONDARY }, areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(90,143,106,0.2)'},{offset:1,color:'rgba(90,143,106,0.01)'}]) } },
            { name: '平均视距(cm)', type: 'bar', yAxisIndex: 1, data: trendDays.map(() => 0), itemStyle: { color: CONSTANTS.HINT_BORDER, borderRadius: [2,2,0,0] } }
          ]
        });
        chartInstances['healthTrend'] = healthTrend;
        initializedCharts.push(healthTrend);
      }
      } catch(statsErr) { console.error('[initAllCharts] stats图表初始化失败:', statsErr); }
    }

    // 加载真实数据更新图表
    try {
      if (typeof dbGetAll === 'function' && typeof updateChartsWithRealData === 'function') {
        dbGetAll('sessions').then(function(records) {
          var sessions = records || [];
          if (sessions.length > 0) {
            window._liveSessionData = sessions.slice(-500);
            var daily = {};
            sessions.forEach(function(r) {
              var day = r.timestamp ? new Date(r.timestamp).toLocaleDateString('zh-CN', {month:'numeric', day:'numeric'}) : '今天';
              if (!daily[day]) daily[day] = [];
              daily[day].push(r);
            });
            updateChartsWithRealData(sessions, daily);
          } else {
            window._liveSessionData = [];
          }
        }).catch(function(e) { console.warn('读取图表数据失败:', e); });
      }
    } catch(e) { console.warn('读取图表数据失败:', e); }

    // 窗口resize自适应（只添加一次监听器）
    if (!_chartResizeHandler) {
      _chartResizeHandler = function() {
        for (var key in chartInstances) {
          try {
            var c = chartInstances[key];
            if (c && typeof c.resize === 'function') c.resize();
          } catch(e) {}
        }
      };
      window.addEventListener('resize', _chartResizeHandler);
    }

    // 多次resize确保图表正确渲染（页面切换动画完成后）
    [50, 150, 400, 800].forEach(function(delay) {
      setTimeout(function() {
        initializedCharts.forEach(function(c) {
          try { if (c && typeof c.resize === 'function') c.resize(); } catch(e) {}
        });
      }, delay);
    });

    // 为未初始化的图表容器显示无数据占位或延迟重试
    var needsRetry = false;
    containers.forEach(function(el) {
      try {
        if (el && !echarts.getInstanceByDom(el) && el.children.length === 0) {
          needsRetry = true;
          el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--muted, #8a8578);font-size:13px;">图表加载中...</div>';
        }
      } catch(e) {}
    });
    // 如果有图表因为容器尺寸为0未能初始化，延迟重试
    if (needsRetry) {
      setTimeout(function() {
        console.log('[initAllCharts] 延迟重试初始化未创建的图表...');
        initAllCharts();
      }, 800);
    }
  }

  // ====== 用真实监测数据更新图表（科学算法版） ======

  // 5点移动平均，平滑原始数据中的噪声
  function movingAvg(data, window) {
    return data.map(function(_, i) {
      var start = Math.max(0, i - window + 1);
      var slice = data.slice(start, i + 1);
      return Math.round(slice.reduce(function(a, b) { return a + b; }, 0) / slice.length * 10) / 10;
    });
  }

  // 周环比增长率：(本周 - 上周) / 上周 * 100%
  function weekOverWeek(current, previous) {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return Math.round((current - previous) / previous * 1000) / 10; // 保留一位小数
  }

  // 加权评分算法：眨眼(30%) + 距离(25%) + 坐姿(25%) + 用眼时长(20%)
  function weightedHealthScore(blinkScore, distScore, postureScore, durationScore) {
    return Math.min(100, Math.round(
      blinkScore * 0.30 + distScore * 0.25 + postureScore * 0.25 + durationScore * 0.20
    ));
  }

  function updateChartsWithRealData(sessions, dailyData) {
    if (!sessions || sessions.length === 0) {
      // 无数据时重置KPI为默认状态
      var durEl = document.getElementById('kpi-duration');
      var blinkEl = document.getElementById('kpi-blink');
      var distEl = document.getElementById('kpi-distance');
      var alertEl = document.getElementById('kpi-alerts');
      if (durEl) durEl.innerHTML = '--<span class="stat-unit"> 小时</span>';
      if (blinkEl) blinkEl.innerHTML = '--<span class="stat-unit"> 次/分</span>';
      if (distEl) distEl.innerHTML = '--<span class="stat-unit"> cm</span>';
      if (alertEl) alertEl.innerHTML = '--<span class="stat-unit"> 次</span>';
      return;
    }

    // ========== 数据预处理 ==========
    var days = Object.keys(dailyData);
    var recentDays = days.slice(-7);
    var prevDays = days.slice(-14, -7); // 上周数据

    // 每日平均指标
    var dayBlinkAvg = recentDays.map(function(d) {
      var arr = dailyData[d];
      return arr.length > 0 ? Math.round(arr.reduce(function(s, r) { return s + (r.blinkRate || 0); }, 0) / arr.length) : 0;
    });
    var dayDistAvg = recentDays.map(function(d) {
      var arr = dailyData[d];
      return arr.length > 0 ? Math.round(arr.reduce(function(s, r) { return s + (r.distance || 50); }, 0) / arr.length) : 50;
    });
    var dayPostureAvg = recentDays.map(function(d) {
      var arr = dailyData[d];
      return arr.length > 0 ? Math.round(arr.reduce(function(s, r) { return s + (r.posture || 80); }, 0) / arr.length) : 80;
    });
    // 每日用眼时长（按记录数近似）
    var dayDuration = recentDays.map(function(d) {
      var arr = dailyData[d];
      return arr.length;
    });

    // 上周平均指标（用于周环比）
    var prevBlinkAvg = prevDays.length > 0 ? prevDays.map(function(d) {
      var arr = dailyData[d];
      return arr.length > 0 ? Math.round(arr.reduce(function(s, r) { return s + (r.blinkRate || 0); }, 0) / arr.length) : 0;
    }) : [0, 0, 0, 0, 0, 0, 0];

    // 统计提醒类型分布
    var alertTypes = { distance: 0, blink: 0, posture: 0 };
    sessions.forEach(function(r) {
      if (r.distance && r.distance < 40) alertTypes.distance++;
      if (r.blinkRate && r.blinkRate > 0 && r.blinkRate < 10) alertTypes.blink++;
      if (r.posture && r.posture < 70) alertTypes.posture++;
    });

    // ========== A) 实时用眼数据：5点移动平均 ==========
    var recent = sessions.slice(-30);
    var realtimeRaw = recent.map(function(r) { return r.blinkRate || 0; });
    var realtimeMA = movingAvg(realtimeRaw, 5); // 平滑处理

    if (chartInstances['realtime']) {
      // 综合评分：使用加权评分算法
      var avgBlink = sessions.reduce(function(s, r) { return s + (r.blinkRate || 0); }, 0) / sessions.length;
      var avgDist = sessions.reduce(function(s, r) { return s + (r.distance || 50); }, 0) / sessions.length;
      var avgPosture = sessions.reduce(function(s, r) { return s + (r.posture || 80); }, 0) / sessions.length;
      var avgDuration = Math.min(120, sessions.length * 2);
      // 时长评分：<=20min=100分，每多10分钟扣15分，最低20分
      var durationScore = avgDuration <= 20 ? 100 : Math.max(20, Math.round(100 - (avgDuration - 20) * 1.5));

      // 归一化评分（0-100）
      var blinkScore = Math.min(100, Math.max(0, Math.round(avgBlink * 4 - 20)));  // 理想15-20次/min
      var distScore = Math.min(100, Math.max(0, Math.round(avgDist * 1.5 - 5)));     // 理想40-70cm
      var postureScore = Math.min(100, Math.max(0, Math.round(avgPosture)));         // 理想>=80

      var score = weightedHealthScore(blinkScore, distScore, postureScore, durationScore);
      chartInstances['realtime'].setOption({
        series: [{ data: [{ value: score, name: '用眼健康' }] }]
      });
    }

    // ========== B) 周对比：周环比增长率 ==========
    if (chartInstances['compare']) {
      // 计算本周和上周的日均用眼时长（分钟估算）
      var thisWeekDaily = recentDays.map(function(d) {
        var arr = dailyData[d];
        return arr.length > 0 ? Math.round(arr.length * 5) : 0; // 每条记录约5分钟
      });
      var lastWeekDaily = prevBlinkAvg.map(function(v, i) {
        return Math.max(0, Math.round(v * 0.8 + prevDays.length > 0 ? 30 : 30)); // 基于记录数推算
      });

      // 周环比增长率
      var thisWeekTotal = thisWeekDaily.reduce(function(a, b) { return a + b; }, 0);
      var lastWeekTotal = lastWeekDaily.reduce(function(a, b) { return a + b; }, 0);
      var wowRate = weekOverWeek(thisWeekTotal, lastWeekTotal);

      chartInstances['compare'].setOption({
        xAxis: { data: recentDays },
        series: [
          { name: '本周', data: movingAvg(thisWeekDaily, 3) },
          { name: '上周', data: movingAvg(lastWeekDaily, 3) }
        ],
        // 在标题中显示周环比
        title: {
          text: '本周 vs 上周对比',
          left: 'center', top: 2,
          textStyle: { color: CONSTANTS.MUTED_TEXT, fontSize: 13, fontWeight: 'normal' }
        },
        graphic: [{
          type: 'text',
          left: 'center', top: 22,
          style: {
            text: '周环比: ' + (wowRate >= 0 ? '+' : '') + wowRate + '%',
            fill: wowRate >= 0 ? '#c86464' : '#5a8f6a',
            fontSize: 12, fontWeight: 'bold',
            textAlign: 'center'
          }
        }]
      });
    }

    // ========== C) 雷达图：加权评分算法 ==========
    if (chartInstances['radar']) {
      var avgBlinkR = sessions.reduce(function(s, r) { return s + (r.blinkRate || 0); }, 0) / sessions.length;
      var avgDistR = sessions.reduce(function(s, r) { return s + (r.distance || 50); }, 0) / sessions.length;
      var avgPostureR = sessions.reduce(function(s, r) { return s + (r.posture || 80); }, 0) / sessions.length;

      // 各维度评分（归一化到0-100）
      // 眨眼：理想15-20次/min，15次=60分，20次=80分，25次=100分
      var blinkDim = Math.min(100, Math.max(0, Math.round((avgBlinkR - 5) * 4)));
      // 距离：理想40-70cm，40cm=60分，50cm=75分，67cm+=100分
      var distDim = Math.min(100, Math.max(0, Math.round(avgDistR * 1.5 - 5)));
      // 坐姿：理想>=80分
      var postureDim = Math.min(100, Math.max(0, Math.round(avgPostureR)));
      // 时长：反映单次连续用眼是否合理（<=20min=100分，30min=80分，45min=50分，60min+=20分）
      var sessionMinutes = Math.min(120, sessions.length * 2);
      var durationDim = sessionMinutes <= 20 ? 100 : Math.max(20, Math.round(100 - (sessionMinutes - 20) * 1.5));
      // 频率：用提醒频率的倒数（提醒越少越好），用良好记录占比
      var goodCount = 0;
      sessions.forEach(function(r) {
        if ((r.blinkRate || 0) >= 10 && (r.distance || 50) >= 40 && (r.posture || 80) >= 70) goodCount++;
      });
      var freqDim = Math.min(100, Math.round(goodCount / sessions.length * 100));

      chartInstances['radar'].setOption({
        series: [{
          data: [{
            value: [blinkDim, distDim, postureDim, durationDim, freqDim],
            name: '综合评分: ' + weightedHealthScore(blinkDim, distDim, postureDim, durationDim) + '分',
            areaStyle: { color: 'rgba(200,135,77,0.2)' },
            lineStyle: { color: CONSTANTS.PRIMARY },
            itemStyle: { color: CONSTANTS.PRIMARY }
          }]
        }]
      });
    }

    // ========== D) 每日详细：按时段聚合 ==========
    if (chartInstances['dailyDetail']) {
      // 将记录按小时聚合，分析日内用眼规律
      var hourlyBlink = {};
      var hourlyCount = {};
      var hourlyDist = {};
      var hourlyAlerts = {};

      recent.forEach(function(r) {
        var hour = r.timestamp ? new Date(r.timestamp).getHours() : 0;
        var slot = hour; // 0-23小时
        if (!hourlyBlink[slot]) { hourlyBlink[slot] = 0; hourlyCount[slot] = 0; hourlyDist[slot] = 0; hourlyAlerts[slot] = 0; }
        hourlyBlink[slot] += (r.blinkRate || 0);
        hourlyCount[slot]++;
        hourlyDist[slot] += (r.distance || 50);
        if (r.distance && r.distance < 40) hourlyAlerts[slot]++;
        if (r.blinkRate && r.blinkRate > 0 && r.blinkRate < 10) hourlyAlerts[slot]++;
      });

      // 生成标签和数据（每3小时一个时段）
      var timeSlots = [];
      var blinkPerSlot = [];
      var distPerSlot = [];
      var alertsPerSlot = [];
      for (var h = 0; h < 24; h += 3) {
        timeSlots.push(h + ':00-' + (h + 3) + ':00');
        var totalBlink = 0, totalCount = 0, totalDist = 0, totalAlerts = 0;
        for (var hh = h; hh < h + 3 && hh < 24; hh++) {
          totalBlink += (hourlyBlink[hh] || 0);
          totalCount += (hourlyCount[hh] || 0);
          totalDist += (hourlyDist[hh] || 0);
          totalAlerts += (hourlyAlerts[hh] || 0);
        }
        blinkPerSlot.push(totalCount > 0 ? Math.round(totalBlink / totalCount) : 0);
        distPerSlot.push(totalCount > 0 ? Math.round(totalDist / totalCount) : 50);
        alertsPerSlot.push(totalAlerts);
      }

      chartInstances['dailyDetail'].setOption({
        xAxis: { data: timeSlots },
        series: [
          { name: '平均眨眼率', type: 'line', smooth: true, data: movingAvg(blinkPerSlot, 3), lineStyle: { color: CONSTANTS.PRIMARY }, itemStyle: { color: CONSTANTS.PRIMARY } },
          { name: '平均距离(cm)', type: 'line', smooth: true, data: movingAvg(distPerSlot, 3), lineStyle: { color: CONSTANTS.SECONDARY }, itemStyle: { color: CONSTANTS.SECONDARY } },
          { name: '预警次数', type: 'bar', data: alertsPerSlot, itemStyle: { color: CONSTANTS.DANGER, borderRadius: [2, 2, 0, 0] } }
        ]
      });
    }

    // ========== 更新概览页图表 ==========
    // 用眼趋势（移动平均平滑）
    if (chartInstances['usageTrend']) {
      chartInstances['usageTrend'].setOption({
        xAxis: { data: recentDays },
        series: [{ data: movingAvg(dayDistAvg, 3) }]
      });
    }

    // 提醒分布
    if (chartInstances['alertPie']) {
      var pieData = [];
      if (alertTypes.distance > 0) pieData.push({ value: alertTypes.distance, name: '距离过近' });
      if (alertTypes.blink > 0) pieData.push({ value: alertTypes.blink, name: '眨眼不足' });
      if (alertTypes.posture > 0) pieData.push({ value: alertTypes.posture, name: '坐姿不良' });
      // 如果没有预警数据，显示"暂无预警"
      if (pieData.length === 0) {
        pieData.push({ value: 1, name: '暂无预警', itemStyle: { color: CONSTANTS.AXIS_LINE } });
      }
      chartInstances['alertPie'].setOption({
        series: [{ data: pieData }]
      });
    }

    // 健康趋势
    if (chartInstances['healthTrend']) {
      var trendLabels = recentDays.length > 0 ? recentDays : ['今天'];
      // 综合健康评分趋势
      var healthScores = recentDays.map(function(d, i) {
        var bs = Math.min(100, dayBlinkAvg[i] * 4);
        var ds = Math.min(100, dayDistAvg[i] * 1.5);
        var ps = Math.min(100, dayPostureAvg[i]);
        var dur = Math.min(100, dayDuration[i] * 2);
        return weightedHealthScore(bs, ds, ps, dur);
      });
      chartInstances['healthTrend'].setOption({
        xAxis: { data: trendLabels },
        series: [
          { data: movingAvg(healthScores, 3) },
          { data: dayDistAvg }
        ]
      });
    }

      // ========== 更新热力图（时段用眼分布） ==========
      try {
        var heatmapChart = chartInstances['heatmap'];
        if (heatmapChart && heatmapChart.setOption) {
          var today = new Date().toDateString();
          var todaySessions = sessions.filter(function(r) {
            return r.timestamp && new Date(r.timestamp).toDateString() === today;
          });
          // 按6个时段统计：6-9, 9-12, 12-15, 15-18, 18-21, 21-24
          var slots = [0, 0, 0, 0, 0, 0];
          if (todaySessions.length > 0) {
            todaySessions.forEach(function(r) {
              var hour = new Date(r.timestamp).getHours();
              if (hour >= 6 && hour < 9) slots[0]++;
              else if (hour >= 9 && hour < 12) slots[1]++;
              else if (hour >= 12 && hour < 15) slots[2]++;
              else if (hour >= 15 && hour < 18) slots[3]++;
              else if (hour >= 18 && hour < 21) slots[4]++;
              else if (hour >= 21 && hour < 24) slots[5]++;
            });
            // 每条记录约10秒，转换为分钟
            var minData = slots.map(function(c) { return Math.round(c * 10 / 60); });
            heatmapChart.setOption({
              series: [{ data: minData }]
            });
          } else {
            heatmapChart.setOption({
              series: [{ data: [0, 0, 0, 0, 0, 0] }]
            });
          }
        }
      } catch(heatErr) { console.warn('热力图更新失败:', heatErr); }

    // ========== 更新KPI卡片（数据概览页） ==========
    try {
      var today = new Date().toDateString();
      var todaySessions = sessions.filter(function(r) {
        return r.timestamp && new Date(r.timestamp).toDateString() === today;
      });
      var yesterday = new Date(Date.now() - 86400000).toDateString();
      var yesterdaySessions = sessions.filter(function(r) {
        return r.timestamp && new Date(r.timestamp).toDateString() === yesterday;
      });

      // 今日用眼时长（每条记录约10秒间隔，估算时长）
      var durEl = document.getElementById('kpi-duration');
      var durTrend = document.getElementById('kpi-duration-trend');
      if (durEl) {
        if (todaySessions.length > 0) {
          var durMin = Math.round(todaySessions.length * 10 / 60);
          var durHour = (durMin / 60).toFixed(1);
          durEl.innerHTML = durHour + '<span class="stat-unit"> 小时</span>';
          if (durTrend && yesterdaySessions.length > 0) {
            var yDurMin = Math.round(yesterdaySessions.length * 10 / 60);
            var yDurHour = (yDurMin / 60).toFixed(1);
            var diff = (durHour - yDurHour).toFixed(1);
            if (diff > 0) {
              durTrend.className = 'stat-trend up';
              durTrend.textContent = '↑ 比昨日增加' + diff + '小时';
            } else if (diff < 0) {
              durTrend.className = 'stat-trend down';
              durTrend.textContent = '↓ 比昨日减少' + Math.abs(diff) + '小时';
            } else {
              durTrend.className = 'stat-trend';
              durTrend.textContent = '→ 与昨日持平';
            }
          } else if (durTrend) {
            durTrend.className = 'stat-trend';
            durTrend.textContent = '今日已开始监测';
          }
        }
      }

      // 眨眼频率
      var blinkEl = document.getElementById('kpi-blink');
      var blinkTrend = document.getElementById('kpi-blink-trend');
      if (blinkEl) {
        if (todaySessions.length > 0) {
          var validBlinks = todaySessions.filter(function(r) { return r.blinkRate && r.blinkRate > 0; });
          if (validBlinks.length > 0) {
            var avgBlink = Math.round(validBlinks.reduce(function(s,r){return s+r.blinkRate;},0)/validBlinks.length);
            blinkEl.innerHTML = avgBlink + '<span class="stat-unit"> 次/分</span>';
            if (blinkTrend) {
              if (avgBlink >= 10 && avgBlink <= 20) {
                blinkTrend.className = 'stat-trend up';
                blinkTrend.textContent = '↑ 正常范围';
              } else if (avgBlink < 10) {
                blinkTrend.className = 'stat-trend down';
                blinkTrend.textContent = '↓ 偏低，注意休息';
              } else {
                blinkTrend.className = 'stat-trend';
                blinkTrend.textContent = '偏高';
              }
            }
          }
        }
      }

      // 平均视距
      var distEl = document.getElementById('kpi-distance');
      var distTrend = document.getElementById('kpi-distance-trend');
      if (distEl) {
        if (todaySessions.length > 0) {
          var validDists = todaySessions.filter(function(r) { return r.distance && r.distance > 0; });
          if (validDists.length > 0) {
            var avgDist = Math.round(validDists.reduce(function(s,r){return s+r.distance;},0)/validDists.length);
            distEl.innerHTML = avgDist + '<span class="stat-unit"> cm</span>';
            if (distTrend) {
              if (avgDist >= 50) {
                distTrend.className = 'stat-trend up';
                distTrend.textContent = '↑ 符合标准';
              } else {
                distTrend.className = 'stat-trend down';
                distTrend.textContent = '↓ 偏近，注意调整';
              }
            }
          }
        }
      }

      // 提醒次数（基于异常记录数）
      var alertEl = document.getElementById('kpi-alerts');
      var alertTrend = document.getElementById('kpi-alerts-trend');
      if (alertEl) {
        if (todaySessions.length > 0) {
          var todayAlerts = 0;
          todaySessions.forEach(function(r) {
            if (r.distance && r.distance < 40) todayAlerts++;
            if (r.blinkRate && r.blinkRate > 0 && r.blinkRate < 10) todayAlerts++;
            if (r.posture && r.posture < 70) todayAlerts++;
          });
          alertEl.innerHTML = todayAlerts + '<span class="stat-unit"> 次</span>';
          if (alertTrend) {
            var yAlerts = 0;
            yesterdaySessions.forEach(function(r) {
              if (r.distance && r.distance < 40) yAlerts++;
              if (r.blinkRate && r.blinkRate > 0 && r.blinkRate < 10) yAlerts++;
              if (r.posture && r.posture < 70) yAlerts++;
            });
            var aDiff = todayAlerts - yAlerts;
            if (aDiff > 0) {
              alertTrend.className = 'stat-trend down';
              alertTrend.textContent = '↑ 比昨日增加' + aDiff + '次';
            } else if (aDiff < 0) {
              alertTrend.className = 'stat-trend up';
              alertTrend.textContent = '↓ 比昨日减少' + Math.abs(aDiff) + '次';
            } else {
              alertTrend.className = 'stat-trend';
              alertTrend.textContent = '→ 与昨日持平';
            }
          }
        }
      }
    } catch(kpiErr) { console.warn('KPI更新失败:', kpiErr); }

    // init 末尾：自动预加载 AI 模型（不阻塞用户操作）
    if (typeof initFaceLandmarker === 'function' && !faceLandmarker && !window._mediapipePreinit) {
      window._mediapipePreinit = true;
      setTimeout(function() { initFaceLandmarker(); }, 500);
    }
  }

  // ===================== 主题切换 =====================
  function toggleTheme() {
    var toggle = document.getElementById('setting-theme-toggle');
    var isDark = toggle.classList.contains('active');
    var eyeCareToggle = document.getElementById('eye-care-toggle');
    var isEyeCare = eyeCareToggle && eyeCareToggle.classList.contains('active');
    if (isDark) {
      // 切换到亮色模式
      toggle.classList.remove('active');
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
      appState.theme = 'light';
      document.getElementById('theme-status-text').textContent = '亮色模式';
    } else {
      // 切换到深色模式
      toggle.classList.add('active');
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
      appState.theme = 'dark';
      document.getElementById('theme-status-text').textContent = '深色模式';
    }
    // 如果当前是护眼模式，同步更新护眼基调
    if (isEyeCare) {
      document.body.dataset.eyeCareBase = isDark ? 'light' : 'dark';
      localStorage.setItem('eyeCareBaseTheme', isDark ? 'light' : 'dark');
    }
    localStorage.setItem('eyeGuardTheme', appState.theme);
    try { dbPut('settings', { key: 'theme', value: appState.theme }); } catch(e) {}
  }

  function restoreTheme() {
    var savedTheme = localStorage.getItem('eyeGuardTheme');
    // 如果护眼模式开启，优先保持护眼模式，恢复对应的护眼基调
    var eyeCare = localStorage.getItem('eyeGuardEyeCare');
    if (eyeCare === 'true') {
      document.body.classList.add('eye-care-mode');
      var baseTheme = localStorage.getItem('eyeCareBaseTheme') || 'light';
      document.body.dataset.eyeCareBase = baseTheme;
      var eyeToggle = document.getElementById('eye-care-toggle');
      var sidebarToggle = document.getElementById('eye-mode-toggle');
      if (eyeToggle) eyeToggle.classList.add('active');
      if (sidebarToggle) sidebarToggle.classList.add('active');
      return;
    }
    if (!savedTheme) {
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      savedTheme = prefersDark ? 'dark' : 'light';
      localStorage.setItem('eyeGuardTheme', savedTheme);
    }
    appState.theme = savedTheme;
    if (savedTheme === 'dark') {
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
      var toggle = document.getElementById('setting-theme-toggle');
      if (toggle) { toggle.classList.add('active'); }
    } else {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
      var toggle = document.getElementById('setting-theme-toggle');
      if (toggle) { toggle.classList.remove('active'); }
    }
    var statusText = document.getElementById('theme-status-text');
    if (statusText) {
      statusText.textContent = savedTheme === 'dark' ? '深色模式' : '亮色模式';
    }
  }

  // Start app
  init();

  // 自动检测权限：首次使用时自动弹出权限引导，授权后自动开始监测
  setTimeout(function() {
    if (appState.monitorActive) return;
    if (appState.permissions.camera === 'granted') return;
    var _isFile5 = window.location && window.location.protocol === 'file:';
    if (_isFile5) {
      console.log('[自动] 检测到 file:// 协议，跳过自动权限引导（摄像头不可用）');
      return;
    }
    var autoStartIfGranted = function() {
      if (appState.permissions.camera === 'granted') {
        console.log('[自动] 权限已获取，自动开始监测');
        startMonitoring();
      }
    };
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({name:'camera'}).then(function(status) {
        if (status.state === 'prompt') {
          console.log('[自动] 检测到摄像头权限未授权，自动弹出权限引导');
          _showPermissionGuideAndRequest().then(autoStartIfGranted);
        }
      }).catch(function() {
        _showPermissionGuideAndRequest().then(autoStartIfGranted);
      });
    } else {
      _showPermissionGuideAndRequest().then(autoStartIfGranted);
    }
  }, 2000);

  // 启动时后台检查 GitHub 是否有更新版本（静默，不阻塞用户操作）
  (function checkForUpdate() {
    try {
      var GITHUB_APP_URL = 'https://cdn.jsdelivr.net/gh/LXX218360/eye-guard-web@main/app.js';
      fetch(GITHUB_APP_URL, { method: 'HEAD', cache: 'no-store' })
        .then(function(resp) {
          var remoteLen = parseInt(resp.headers.get('content-length') || '0', 10);
          var localLen = document.querySelector('script[src*="app.js"]') ? 0 : 0;
          // 通过当前脚本文件大小估算本地版本
          if (remoteLen > 0 && window._appJsSize && window._appJsSize !== remoteLen) {
            console.log('[更新] GitHub 有新版本: remote=' + remoteLen + ' vs local=' + window._appJsSize);
            // 5秒后提示用户（不干扰首次加载）
            setTimeout(function() {
              if (confirm('检测到新版本可用，是否立即更新？（更新后页面将刷新）')) {
                var s = document.createElement('script');
                s.src = GITHUB_APP_URL + '?t=' + Date.now();
                s.onload = function() { location.reload(true); };
                s.onerror = function() { console.warn('[更新] 下载失败'); };
                document.head.appendChild(s);
              }
            }, 5000);
          }
        })
        .catch(function() { /* 静默失败 */ });
    } catch(e) {}
  })();

// 复制文本到剪贴板
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      showAlert('已复制到剪贴板', 'success', '&#x2705;');
    }).catch(function() {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}
function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showAlert('已复制到剪贴板', 'success', '&#x2705;');
  } catch(e) {
    showAlert('复制失败，请手动复制', 'warn', '&#x26A0;');
  }
  document.body.removeChild(ta);
}