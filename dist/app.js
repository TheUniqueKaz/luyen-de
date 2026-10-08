'use strict';
const QUESTIONS = window.QUESTIONS;
const byId = new Map(QUESTIONS.map(q => [q.id, q]));
const STORAGE_KEY = 'onluyen-180-v1';
const main = document.querySelector('#main');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const letters = 'ABCD';
let data = {saved:[], wrong:[], seen:[], history:[], session:null};
let storageOK = true;
try {
  const loaded = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (loaded && typeof loaded === 'object') {
    for (const key of ['saved','wrong','seen']) if (Array.isArray(loaded[key])) data[key] = [...new Set(loaded[key].filter(id => byId.has(id)))];
    if (Array.isArray(loaded.history)) data.history = loaded.history.filter(validSession).slice(0,30);
    if (validSession(loaded.session)) data.session = loaded.session;
  }
} catch { storageOK = false; }
let view = 'home', config = {mode:'practice',count:20,minutes:20,shuffle:true};
let bankPage=1, search='', result=null, reviewFilter='all', toastTimeout;
let focusLookup=false;
const fold = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
function searchTerms() { return [...new Set(fold(search).trim().split(/\s+/).filter(Boolean))]; }
function highlight(text,terms=searchTerms()) {
  if(!terms.length)return esc(text);
  let normalized='',offset=0;
  const starts=[],ends=[],ranges=[];
  for(const char of text){
    const part=fold(char);
    if(!part&&ends.length)ends[ends.length-1]=offset+char.length;
    for(let i=0;i<part.length;i++){starts.push(offset);ends.push(offset+char.length);}
    normalized+=part;offset+=char.length;
  }
  for(const term of terms){
    let at=normalized.indexOf(term);
    while(at!==-1){ranges.push([starts[at],ends[at+term.length-1]]);at=normalized.indexOf(term,at+1);}
  }
  ranges.sort((a,b)=>a[0]-b[0]);
  const merged=[];
  for(const range of ranges){const last=merged[merged.length-1];if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else merged.push([...range]);}
  let html='',cursor=0;
  for(const [start,end] of merged){html+=esc(text.slice(cursor,start))+'<mark>'+esc(text.slice(start,end))+'</mark>';cursor=end;}
  return html+esc(text.slice(cursor));
}
function openLookup() {
  if(document.querySelector('#confirm-dialog').open)return;
  if(view==='bank'||view==='saved'){const input=document.querySelector('#search');input.focus();input.select();input.scrollIntoView({block:'center'});}
  else{focusLookup=true;location.hash='bank';}
}

function validSession(s) {
  return s && ['practice','exam'].includes(s.mode) && Array.isArray(s.ids) && s.ids.length>0 && s.ids.every(id=>byId.has(id)) && new Set(s.ids).size===s.ids.length && s.answers && typeof s.answers==='object' && !Array.isArray(s.answers) && Object.entries(s.answers).every(([id,a])=>s.ids.includes(Number(id))&&Number.isInteger(a)&&a>=0&&a<4) && Number.isInteger(s.index) && s.index>=0 && s.index<s.ids.length && Number.isFinite(s.started) && (s.deadline===null || Number.isFinite(s.deadline));
}
function save() {
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); }
  catch { if(storageOK) toast('Trình duyệt không lưu được tiến độ. Hãy giữ trang này mở.'); storageOK=false; }
  document.querySelector('.local-note').innerHTML = `<span class="status-dot"></span>${storageOK?'Tiến độ lưu trên thiết bị này':'Tiến độ chỉ giữ trong phiên này'}`;
}
function toast(message) { const el=document.querySelector('#toast'); el.textContent=message;el.classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('visible'),3000); }
function setInList(key,id,yes) { data[key]=yes?[...new Set([...data[key],id])]:data[key].filter(x=>x!==id); }
function shuffle(items) { const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out; }
function grade(s) { let correct=0,wrong=0,blank=0;for(const id of s.ids){if(s.answers[id]===undefined)blank++;else if(s.answers[id]===byId.get(id).correct[0])correct++;else wrong++;}return {correct,wrong,blank,total:s.ids.length,percent:Math.round(correct/s.ids.length*100)}; }
function answered(s) { return s.ids.filter(id=>s.answers[id]!==undefined).length; }
function duration(ms) { const seconds=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; }
function when(time) { return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(time); }
function bookmarkButton(q) { const saved=data.saved.includes(q.id);return `<button class="bookmark ${saved?'saved':''}" data-action="bookmark" data-id="${q.id}" aria-pressed="${saved}" aria-label="${saved?'Bỏ lưu':'Lưu'} câu ${q.id}">⚑ ${saved?'Đã lưu':'Lưu câu'}</button>`; }
function note(q) { return q.note?`<p class="source-note">${esc(q.note)}</p>`:''; }
function header(title,subtitle) { return `<div class="intro"><div><span class="eyebrow">KHÔNG GIAN TỰ HỌC CỦA BẠN</span><h1>${title}</h1><p>${subtitle}</p></div><span class="source-pill"><span class="status-dot"></span>180 câu hỏi sẵn sàng</span></div>`; }
function render() {
  document.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===view;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  document.querySelector('#saved-count').textContent=data.saved.length;
  const labels={home:'Tổng quan',bank:'Ngân hàng câu hỏi',saved:'Câu đã lưu',history:'Lịch sử luyện tập',quiz:'Đang làm bài',result:'Kết quả bài làm'};
  document.querySelector('#breadcrumb').innerHTML=`Góc học tập <span>/</span> ${labels[view]}`;
  if(view==='home') renderHome();else if(view==='quiz') renderQuiz();else if(view==='bank'||view==='saved')renderBank();else if(view==='history')renderHistory();else if(view==='result')renderResult();
}
function go(next) { view=next;render();window.scrollTo({top:0,behavior:'instant'});main.focus({preventScroll:true}); }
function historyRow(s) { const g=grade(s);return `<div class="history-row"><div class="history-left"><span class="history-mark">${s.mode==='exam'?'◷':'▤'}</span><div><strong>${s.mode==='exam'?'Thi thử':'Luyện tập'} · ${s.ids.length} câu</strong><small>${when(s.finished)} · ${duration(s.finished-s.started)}</small></div></div><span class="score-tag">${g.correct}/${g.total} đúng</span><button class="button secondary" data-action="result" data-id="${s.key}">Xem lại ↗</button></div>`; }
function renderHome() {
  const attempted=data.history.reduce((sum,s)=>sum+answered(s),0), correct=data.history.reduce((sum,s)=>sum+grade(s).correct,0);
  main.innerHTML=header('Hôm nay, mình ôn gì?','Một chút tập trung mỗi ngày, thêm một bước tự tin.')+
  `<div class="stats"><div class="stat"><div class="stat-top">Ngân hàng câu hỏi <span class="stat-icon">▤</span></div><div class="stat-value">180 <span>câu hỏi</span></div></div><div class="stat"><div class="stat-top">Đã luyện tập <span class="stat-icon">✓</span></div><div class="stat-value">${data.seen.length}<span>/ 180 câu</span></div></div><div class="stat"><div class="stat-top">Tỷ lệ trả lời đúng <span class="stat-icon">◉</span></div><div class="stat-value">${attempted?Math.round(correct/attempted*100)+'%':'—'}<span>${attempted?'đã nộp':'chưa có bài'}</span></div></div><div class="stat"><div class="stat-top">Cần ôn lại <span class="stat-icon">↻</span></div><div class="stat-value">${data.wrong.length}<span>câu hỏi</span></div></div></div>`+
  (data.session?`<div class="resume"><div><strong>Bạn có một bài đang làm dở</strong><p>${data.session.mode==='exam'?'Thi thử':'Luyện tập'} · Đã trả lời ${answered(data.session)}/${data.session.ids.length} câu</p></div><button class="button primary" data-action="resume">Tiếp tục →</button></div>`:'')+
  `<div class="home-grid"><section class="panel setup-panel"><div class="section-title"><h2>Bắt đầu một lượt ôn tập</h2><span class="section-num">01 / 02</span></div><p class="section-sub">Chọn cách học phù hợp với bạn hôm nay.</p><div class="mode-grid"><button class="mode-card ${config.mode==='practice'?'selected':''}" data-action="mode" data-value="practice" aria-pressed="${config.mode==='practice'}"><span class="mode-icon">▧</span><span><strong>Luyện tập</strong><span class="description">Xem đáp án ngay<br>sau mỗi câu trả lời.</span></span><i class="radio-mark"></i></button><button class="mode-card ${config.mode==='exam'?'selected':''}" data-action="mode" data-value="exam" aria-pressed="${config.mode==='exam'}"><span class="mode-icon">◷</span><span><strong>Thi thử</strong><span class="description">Tập trung làm bài,<br>chấm điểm khi nộp.</span></span><i class="radio-mark"></i></button></div><div class="config-row"><div class="field"><label for="question-count">Số câu trong một lượt</label><select id="question-count">${[10,20,30,50,180].map(n=>`<option value="${n}" ${config.count===n?'selected':''}>${n===180?'Toàn bộ 180':n} câu hỏi</option>`).join('')}</select></div><div class="field"><label for="time-limit">Thời gian làm bài</label><select id="time-limit" ${config.mode==='practice'?'disabled':''}>${config.mode==='practice'?'<option>Không giới hạn</option>':[10,20,30,45,60,120].map(n=>`<option value="${n}" ${config.minutes===n?'selected':''}>${n} phút</option>`).join('')}</select></div></div><div class="check-row"><label><input id="shuffle" type="checkbox" ${config.shuffle?'checked':''}>Trộn thứ tự câu hỏi</label><span>4 lựa chọn / câu</span></div><button class="button primary full start" data-action="start"><span>${config.mode==='practice'?'Bắt đầu luyện tập':'Bắt đầu thi thử'}</span><span>→</span></button><p class="setup-foot">${data.session?'Bài mới sẽ thay thế bài đang làm dở.':'Tiến độ tự động lưu. Bạn có thể quay lại bất cứ lúc nào.'}</p></section><aside class="aside-stack"><div class="focus-card"><span class="eyebrow">HỌC CHẮC, NHỚ LÂU</span><h2>Hiểu từng câu.<br>Vững từng phần.</h2><p>Chọn luyện tập để xem đáp án ngay và ghi nhớ qua từng lần làm bài.</p><span class="ornament" aria-hidden="true">❧</span></div><section class="panel mini-panel"><h3>↻ &nbsp; Ôn lại để nhớ hơn</h3><p>${data.wrong.length?`Bạn có ${data.wrong.length} câu trả lời chưa đúng. Dành ít phút luyện lại nhé.`:'Những câu trả lời sai sẽ được gom lại ở đây để bạn dễ ôn tập.'}</p><button class="button secondary" data-action="retry-wrong" ${data.wrong.length?'':'disabled'}>Luyện lại câu sai <span>→</span></button></section></aside></div><section class="section-bottom"><div class="section-title"><h3>Hoạt động gần đây</h3><a class="text-button" href="#history">Xem tất cả ↗</a></div>${data.history.length?data.history.slice(0,3).map(historyRow).join(''):'<div class="empty-inline">Chưa có lượt luyện tập nào. Bắt đầu bài đầu tiên của bạn nhé.</div>'}</section>`;
}
function start(ids) {
  const pool=ids||QUESTIONS.map(q=>q.id), chosen=(config.shuffle?shuffle(pool):[...pool]).slice(0,ids?pool.length:config.count);
  if(!chosen.length)return;
  const now=Date.now();data.session={key:String(now),ids:chosen,answers:{},index:0,mode:ids?'practice':config.mode,started:now,deadline:!ids&&config.mode==='exam'?now+config.minutes*60000:null};
  save();location.hash='quiz';if(view==='quiz')render();
}
function renderQuiz() {
  const s=data.session;if(!s){location.hash='home';return;}
  const q=byId.get(s.ids[s.index]), answer=s.answers[q.id],show=s.mode==='practice'&&answer!==undefined,correct=q.correct[0];
  main.innerHTML=`<div class="quiz-header"><div><span class="eyebrow">MỖI CÂU HỎI, MỘT BƯỚC TIẾN</span><h1>${s.mode==='exam'?'Bài thi thử':'Cùng luyện tập nhé.'}</h1><div class="quiz-meta"><span class="tag">${s.mode==='exam'?'Thi thử':'Luyện tập'}</span><span>${s.ids.length} câu hỏi</span><span>•</span><span>${s.mode==='exam'?'Chấm điểm khi nộp':'Xem đáp án sau mỗi câu'}</span></div></div><div class="timer" id="timer" aria-label="Thời gian làm bài">◷ ${duration(s.deadline?s.deadline-Date.now():Date.now()-s.started)}</div></div><div class="quiz-layout"><section class="panel question-panel"><div class="question-top"><span>CÂU ${String(s.index+1).padStart(2,'0')} / ${s.ids.length} <span class="muted">&nbsp; · &nbsp; Mã gốc #${q.id}</span></span>${bookmarkButton(q)}</div><h2 class="question-text">${esc(q.text)}</h2><div class="options" role="group" aria-label="Chọn một đáp án">${q.options.map((text,i)=>`<button class="option ${answer===i?'selected':''} ${show&&i===correct?'correct':''} ${show&&answer===i&&i!==correct?'wrong':''}" data-action="answer" data-value="${i}" aria-pressed="${answer===i}" ${show?'disabled':''}><span class="option-letter">${letters[i]}</span><span class="option-text">${esc(text)}</span>${show&&(i===correct||answer===i)?`<span class="answer-indicator">${i===correct?'✓ Đúng':'✕ Chưa đúng'}</span>`:''}</button>`).join('')}</div>${show?`<div class="feedback ${answer!==correct?'wrong':''}" role="status"><strong>${answer===correct?'Chính xác!':'Chưa chính xác.'}</strong> Đáp án theo bộ đề: <strong>${letters[correct]}</strong>.${answer!==correct?' Câu này đã được thêm vào danh sách cần ôn lại.':''}</div>`:''}${show?note(q):q.note?'<p class="source-note">Câu này có ghi chú về dữ liệu nguồn. Ghi chú đầy đủ hiển thị khi xem đáp án.</p>':''}<div class="quiz-actions"><button class="button secondary" data-action="prev" ${s.index===0?'disabled':''}>← Câu trước</button>${s.index<s.ids.length-1?'<button class="button primary" data-action="next">Câu tiếp theo →</button>':'<button class="button primary" data-action="submit">Nộp bài ✓</button>'}</div></section><aside class="panel navigator"><h3>Tiến độ bài làm</h3><div class="progress-label"><span>Đã trả lời</span><span>${answered(s)} / ${s.ids.length}</span></div><div class="progress-track"><span style="width:${answered(s)/s.ids.length*100}%"></span></div><div class="number-grid">${s.ids.map((id,i)=>{const a=s.answers[id],known=s.mode==='practice'&&a!==undefined;return `<button class="number ${i===s.index?'current':''} ${a!==undefined?'answered':''} ${known?(a===byId.get(id).correct[0]?'correct':'wrong'):''} ${data.saved.includes(id)?'flagged':''}" data-action="jump" data-value="${i}" aria-label="Câu ${i+1}${a!==undefined?', đã trả lời':''}" ${i===s.index?'aria-current="step"':''}>${i+1}</button>`;}).join('')}</div><div class="legend"><span><i></i>Đã trả lời</span><span><i class="blank"></i>Chưa trả lời</span><span><i class="flag"></i>Đã lưu</span></div><button class="button primary full" data-action="submit">Nộp bài và xem kết quả</button><p class="keyboard-help">Phím 1–4 chọn đáp án<br>← → chuyển câu hỏi</p></aside></div>`;
}
function choose(value) {
  const s=data.session;if(!s||view!=='quiz'||(s.deadline&&Date.now()>=s.deadline)){tick();return;}
  const id=s.ids[s.index];if(s.mode==='practice'&&s.answers[id]!==undefined)return;
  if(!Number.isInteger(value)||value<0||value>=4)return;
  s.answers[id]=value;setInList('seen',id,true);
  if(s.mode==='practice')setInList('wrong',id,value!==byId.get(id).correct[0]);
  save();renderQuiz();
}
function requestSubmit() {
  const s=data.session;if(!s)return;
  const missing=s.ids.length-answered(s);
  document.querySelector('#dialog-message').textContent=missing?`Bạn còn ${missing} câu chưa trả lời. Những câu này sẽ được tính là chưa làm trong kết quả.`:'Bạn đã trả lời tất cả câu hỏi. Cùng xem kết quả và những câu cần ôn lại nhé.';
  document.querySelector('#confirm-dialog').showModal();
}
function finish(auto=false) {
  const s=data.session;if(!s)return;
  s.finished=auto&&s.deadline?s.deadline:Date.now();
  for(const id of s.ids)if(s.answers[id]!==undefined)setInList('wrong',id,s.answers[id]!==byId.get(id).correct[0]);
  result=JSON.parse(JSON.stringify(s));data.history.unshift(result);data.history=data.history.slice(0,30);data.session=null;reviewFilter='all';save();
  const dialog=document.querySelector('#confirm-dialog');if(dialog.open)dialog.close('cancel');location.hash='result';if(view==='result')render();if(auto)toast('Hết giờ. Bài thi đã được nộp tự động.');
}
function renderResult() {
  if(!result){result=data.history[0];if(!result){location.hash='home';return;}}
  const s=result,g=grade(s),wrongIds=s.ids.filter(id=>s.answers[id]!==byId.get(id).correct[0]);
  const filtered=s.ids.filter(id=>reviewFilter==='all'||(reviewFilter==='wrong'&&s.answers[id]!==undefined&&s.answers[id]!==byId.get(id).correct[0])||(reviewFilter==='blank'&&s.answers[id]===undefined));
  main.innerHTML=`<span class="eyebrow">THÊM MỘT LẦN LUYỆN TẬP, THÊM MỘT LẦN GHI NHỚ</span><div class="result-hero"><div class="score-ring" style="--score:${g.percent}%"><div class="score-inner"><strong>${g.percent}%</strong><small>TRẢ LỜI ĐÚNG</small></div></div><div><h1>${g.percent>=80?'Bạn làm tốt lắm!':'Hoàn thành một bước nữa.'}</h1><p>${s.mode==='exam'?'Thi thử':'Luyện tập'} · ${g.total} câu · Thời gian ${duration(s.finished-s.started)}</p><div class="result-numbers"><span><b>${g.correct}</b>đúng</span><span><b>${g.wrong}</b>sai</span><span><b>${g.blank}</b>chưa làm</span></div></div></div><div class="result-buttons"><button class="button primary" data-action="retry-result" ${wrongIds.length?'':'disabled'}>Luyện câu sai & chưa làm (${wrongIds.length}) →</button><a href="#home" class="button secondary">Về tổng quan</a></div><div class="section-title" style="margin-bottom:17px"><h2>Xem lại bài làm</h2><span class="section-num">ĐÁP ÁN THEO BỘ ĐỀ</span></div><div class="review-tabs"><button data-action="review-filter" data-value="all" class="${reviewFilter==='all'?'active':''}">Tất cả (${g.total})</button><button data-action="review-filter" data-value="wrong" class="${reviewFilter==='wrong'?'active':''}">Trả lời sai (${g.wrong})</button><button data-action="review-filter" data-value="blank" class="${reviewFilter==='blank'?'active':''}">Chưa làm (${g.blank})</button></div><div class="bank-list">${filtered.map(id=>{const q=byId.get(id),a=s.answers[id],ok=a===q.correct[0];return `<article class="panel bank-item"><div class="question-top"><span>CÂU ${s.ids.indexOf(id)+1} · MÃ GỐC #${id}</span>${bookmarkButton(q)}</div><div class="review-status ${ok?'':'wrong'}">${ok?'✓ Trả lời đúng':a===undefined?'○ Chưa trả lời':'✕ Trả lời chưa đúng'}</div><h3>${esc(q.text)}</h3>${a!==undefined&&!ok?`<p class="review-choice wrong">Bạn chọn ${letters[a]}. ${esc(q.options[a])}</p>`:''}<p class="review-choice">Đáp án ${letters[q.correct[0]]}. ${esc(q.options[q.correct[0]])}</p><details><summary>Xem đủ 4 lựa chọn</summary>${q.options.map((o,i)=>`<p class="bank-answer ${i===q.correct[0]?'right':''}">${letters[i]}. ${esc(o)}</p>`).join('')}</details>${note(q)}</article>`;}).join('')||'<div class="empty-inline">Không có câu hỏi trong nhóm này.</div>'}</div>`;
}
function bankQuestions() { const terms=searchTerms();return QUESTIONS.filter(q=>{if(view==='saved'&&!data.saved.includes(q.id))return false;if(!terms.length)return true;if(/^\d+$/.test(search.trim())&&byId.has(Number(search.trim())))return q.id===Number(search.trim());const content=fold([q.text,...q.options].join(' '));return terms.every(term=>content.includes(term));}); }
function renderBank() {
  main.innerHTML=header(view==='saved'?'Những câu muốn nhớ.':'180 câu hỏi, một nơi ôn tập.',view==='saved'?'Lưu lại câu cần chú ý, quay lại ôn bất cứ lúc nào.':'Tra cứu nội dung và đối chiếu đáp án theo bộ đề gốc.')+`<div class="search-bar"><input type="search" id="search" class="search-input" placeholder="Gõ từ khóa, ví dụ: dai hoi 2030…" value="${esc(search)}" aria-label="Tìm câu hỏi" aria-describedby="search-help" autocomplete="off">${view==='saved'?`<button class="button primary" data-action="practice-saved" ${data.saved.length?'':'disabled'}>Luyện các câu đã lưu →</button>`:''}</div><p id="search-help" class="search-help">Tìm trong câu hỏi và cả 4 đáp án. Có dấu hoặc không dấu đều được. Nhiều từ khóa giúp thu hẹp kết quả. <span>Ctrl+F để tìm nhanh.</span></p><div id="bank-results"></div>`;renderBankResults();
}
function renderBankResults() {
  const filtered=bankQuestions(),pages=Math.max(1,Math.ceil(filtered.length/12));bankPage=Math.min(bankPage,pages);
  const el=document.querySelector('#bank-results');if(!el)return;
  el.innerHTML=`<p class="bank-count" role="status" aria-live="polite">${filtered.length} câu hỏi${search.trim()?' phù hợp':''} · Đáp án lấy từ dấu X trong Excel</p><div class="bank-list">${filtered.slice((bankPage-1)*12,bankPage*12).map(q=>`<article class="panel bank-item"><div class="question-top"><span>CÂU ${String(q.id).padStart(2,'0')}</span>${bookmarkButton(q)}</div><h3>${highlight(q.text)}</h3><details ${search.trim()?'open':''}><summary>Xem 4 lựa chọn và đáp án</summary>${q.options.map((o,i)=>`<p class="bank-answer ${i===q.correct[0]?'right':''}">${letters[i]}. ${highlight(o)}${i===q.correct[0]?' <strong>✓ Đáp án đúng</strong>':''}</p>`).join('')}${note(q)}</details></article>`).join('')||`<div class="panel empty-state"><div class="empty-symbol">${search.trim()?'⌕':'⚑'}</div><h2>${search.trim()?'Chưa tìm thấy câu hỏi':'Chưa có câu nào được lưu'}</h2><p>${search.trim()?'Thử bớt từ khóa hoặc tìm theo số câu.':'Nhấn “Lưu câu” khi luyện tập để thêm câu hỏi vào đây.'}</p></div>`}</div>${pages>1?`<div class="pagination"><button class="button secondary" data-action="bank-prev" ${bankPage===1?'disabled':''}>← Trước</button><span>Trang ${bankPage} / ${pages}</span><button class="button secondary" data-action="bank-next" ${bankPage===pages?'disabled':''}>Tiếp →</button></div>`:''}`;
}
function renderHistory() { main.innerHTML=header('Nhìn lại để tiến bộ.','Các lượt đã nộp được lưu trên trình duyệt này, tối đa 30 lượt.')+(data.history.length?`<section class="panel history-panel">${data.history.map(historyRow).join('')}</section>`:'<section class="panel empty-state"><div class="empty-symbol">◷</div><h2>Hành trình bắt đầu từ câu đầu tiên.</h2><p>Nộp một bài luyện tập hoặc thi thử để xem kết quả ở đây.</p><a class="button primary" href="#home">Bắt đầu luyện tập →</a></section>'); }
main.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  const action=button.dataset.action,value=button.dataset.value,id=Number(button.dataset.id),s=data.session;
  if(action==='mode'){config.mode=value;renderHome();}
  else if(action==='start')start();
  else if(action==='resume'){location.hash='quiz';}
  else if(action==='answer')choose(Number(value));
  else if(['next','prev','jump'].includes(action)&&s){s.index=action==='jump'?Number(value):Math.max(0,Math.min(s.ids.length-1,s.index+(action==='next'?1:-1)));save();renderQuiz();document.querySelector('.question-text')?.scrollIntoView({block:'nearest'});}
  else if(action==='bookmark'){setInList('saved',id,!data.saved.includes(id));save();document.querySelector('#saved-count').textContent=data.saved.length;const q=byId.get(id);button.outerHTML=bookmarkButton(q);if(view==='saved')renderBankResults();}
  else if(action==='submit')requestSubmit();
  else if(action==='retry-wrong')start(data.wrong);
  else if(action==='practice-saved')start(data.saved);
  else if(action==='retry-result'&&result)start(result.ids.filter(id=>result.answers[id]!==byId.get(id).correct[0]));
  else if(action==='result'){result=data.history.find(h=>h.key===button.dataset.id);reviewFilter='all';location.hash='result';if(view==='result')render();}
  else if(action==='review-filter'){reviewFilter=value;renderResult();}
  else if(action==='bank-prev'||action==='bank-next'){bankPage+=action==='bank-next'?1:-1;renderBankResults();main.scrollIntoView({block:'start'});}
});
main.addEventListener('change',event=>{const {id,value,checked}=event.target;if(id==='question-count')config.count=Number(value);if(id==='time-limit')config.minutes=Number(value);if(id==='shuffle')config.shuffle=checked;});
main.addEventListener('input',event=>{if(event.target.id==='search'){search=event.target.value;bankPage=1;renderBankResults();}});
document.querySelector('#confirm-dialog').addEventListener('close',event=>{if(event.target.returnValue==='submit')finish();});
document.querySelector('#lookup-button').addEventListener('click',openLookup);
document.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='f'&&!event.altKey&&view!=='quiz'&&!document.querySelector('#confirm-dialog').open){event.preventDefault();openLookup();return;}
  if(view!=='quiz'||!data.session||event.ctrlKey||event.metaKey||event.altKey||document.querySelector('dialog').open||/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;
  if(/^[1-4]$/.test(event.key)){event.preventDefault();choose(Number(event.key)-1);}
  if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const s=data.session;s.index=Math.max(0,Math.min(s.ids.length-1,s.index+(event.key==='ArrowRight'?1:-1)));save();renderQuiz();}
});
function route() { const next=location.hash.slice(1)||'home';if(next==='main'){main.focus();return;}if(['home','bank','saved','history','quiz','result'].includes(next)){if(next!==view){search='';bankPage=1;}go(next);if(focusLookup){focusLookup=false;document.querySelector('#search')?.focus();}}else{location.hash='home';}tick(); }
function tick() { const s=data.session;if(!s)return;if(s.deadline&&Date.now()>=s.deadline){finish(true);return;}const timer=document.querySelector('#timer');if(timer){timer.textContent='◷ '+duration(s.deadline?s.deadline-Date.now():Date.now()-s.started);timer.classList.toggle('urgent',Boolean(s.deadline&&s.deadline-Date.now()<60000));} }
window.addEventListener('hashchange',route);document.addEventListener('visibilitychange',tick);setInterval(tick,1000);route();if(!storageOK)toast('Không đọc được dữ liệu đã lưu. Bạn vẫn có thể luyện tập trong phiên này.');
