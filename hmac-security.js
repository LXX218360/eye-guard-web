/* ========== 护眼精灵 - 只读保护层（不可混淆区域） ========== */
(function(){
  'use strict';
  /* 禁用右键菜单 */
  document.addEventListener('contextmenu',function(e){e.preventDefault();return false;},true);
  /* 禁用文本选择和拖拽 */
  document.addEventListener('selectstart',function(e){e.preventDefault();return false;},true);
  document.addEventListener('dragstart',function(e){e.preventDefault();return false;},true);
  /* 屏蔽开发者工具快捷键 */
  document.addEventListener('keydown',function(e){
    var k=e.key||e.keyCode;
    if(k==='F12'||k===123){e.preventDefault();e.stopPropagation();return false;}
    if(e.ctrlKey&&e.shiftKey&&(k==='I'||k==='J'||k==='C'||k===73||k===74||k===67)){e.preventDefault();e.stopPropagation();return false;}
    if(e.ctrlKey&&(k==='U'||k===85)){e.preventDefault();e.stopPropagation();return false;}
  },true);
  /* 开发者工具检测 */
  var _dt=false,_cc=0;
  function _chk(){
    _cc++;
    var w=window.outerWidth-window.innerWidth,h=window.outerHeight-window.innerHeight;
    var d=(w>160||h>160);
    if(d&&!_dt){_dt=true;try{console.clear();console.log('%c','font-size:0;padding:9999px');}catch(e){}}
    else if(!d){_dt=false;}
  }
  setInterval(_chk,2000);
})();