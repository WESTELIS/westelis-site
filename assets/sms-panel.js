/* WESTELIS: desktop fallback for Text JB (sms:) links. Phones open Messages; computers get a QR code + copy panel. */
(function(){
var mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Macintosh/.test(navigator.userAgent));
if(mobile)return;
var st=document.createElement('style');st.textContent="\n#smsd{position:fixed;inset:0;background:rgba(10,12,12,.62);display:none;align-items:center;justify-content:center;z-index:50;padding:18px}\n#smsd.on{display:flex}#smsd .box{background:#fff;color:#202527;max-width:420px;width:100%;padding:26px 26px 20px;position:relative;font:15px/1.6 Arial,sans-serif}\n#smsd h3{font:24px Georgia,serif;margin:0 0 4px}#smsd .sub{color:#596063;margin:0 0 16px;font-size:14px}\n#smsd .qr{display:flex;justify-content:center;margin:6px 0 14px}#smsd .qr img,#smsd .qr canvas{width:190px;height:190px}\n#smsd .num{display:flex;justify-content:space-between;align-items:center;border:1px solid #d9d8d2;padding:10px 12px;margin-bottom:10px;font-size:18px;letter-spacing:1px}\n#smsd .msg{border:1px solid #d9d8d2;padding:10px 12px;font-size:14px;color:#3a3f41;margin-bottom:10px;white-space:pre-wrap}\n#smsd button.cp{border:1px solid #9b9e97;background:none;padding:6px 12px;cursor:pointer;font:13px Arial,sans-serif}\n#smsd .x{position:absolute;top:8px;right:12px;border:0;background:none;font-size:26px;cursor:pointer;color:#596063}\n#smsd .alt{display:block;text-align:center;margin-top:12px;color:#755528;font-size:14px}\n";document.head.appendChild(st);
var w=document.createElement('div');w.innerHTML="<div id=\"smsd\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"smsd-h\"><div class=\"box\">\n<button class=\"x\" type=\"button\" aria-label=\"Close\">\u00d7</button>\n<h3 id=\"smsd-h\">Text JB from your phone</h3><p class=\"sub\">Scan with your phone's camera. Your Messages app opens with the note ready to send.</p>\n<div class=\"qr\" id=\"smsd-qr\"></div>\n<div class=\"num\"><span>863.332.9829</span><button class=\"cp\" type=\"button\" data-copy=\"num\">Copy number</button></div>\n<div class=\"msg\" id=\"smsd-msg\"></div><button class=\"cp\" type=\"button\" data-copy=\"msg\">Copy message</button>\n<a class=\"alt\" id=\"smsd-alt\" href=\"#\">Prefer email? Send the details online \u2192</a>\n</div></div>";document.body.appendChild(w.firstElementChild);
})();

(function(){
var mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Macintosh/.test(navigator.userAgent));
if(mobile||!document.getElementById('smsd'))return;
var m=document.getElementById('smsd'),qrEl=document.getElementById('smsd-qr'),msgEl=document.getElementById('smsd-msg'),alt=document.getElementById('smsd-alt'),qrLib=null;
function loadQR(cb){if(window.QRCode)return cb();if(qrLib){qrLib.addEventListener('load',cb);return;}qrLib=document.createElement('script');qrLib.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';qrLib.onload=cb;qrLib.onerror=function(){qrEl.style.display='none';};document.head.appendChild(qrLib);}
function close(){m.classList.remove('on');}
m.addEventListener('click',function(e){if(e.target===m||e.target.classList.contains('x'))close();});
document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
m.querySelectorAll('button.cp').forEach(function(b){b.onclick=function(){var t=b.dataset.copy==='num'?'8633329829':msgEl.textContent;var done=function(){var o=b.textContent;b.textContent='Copied ✓';setTimeout(function(){b.textContent=o;},1500);};if(navigator.clipboard)navigator.clipboard.writeText(t).then(done,done);else done();};});
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="sms:"]');if(!a)return;e.preventDefault();
var href=a.getAttribute('href'),body='';var i=href.indexOf('body=');if(i>-1){try{body=decodeURIComponent(href.slice(i+5));}catch(_){body='';}}
msgEl.textContent=body;alt.href=a.dataset.alt||'#';alt.onclick=close;
var qrText='SMSTO:+18633329829:'+body;qrEl.innerHTML='';m.classList.add('on');
loadQR(function(){qrEl.innerHTML='';new QRCode(qrEl,{text:qrText,width:380,height:380,correctLevel:QRCode.CorrectLevel.M});});
if(window.gtag)gtag('event','text_jb_desktop_panel',{page_path:location.pathname});});
})();
