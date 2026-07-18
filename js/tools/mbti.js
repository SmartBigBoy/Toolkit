(function() {
  const MBTI_URL = 'https://toolkit.skin/tools/mbti.html';

  const questions = [
    // E/I
    { q: '周末你更倾向于？', a: '约朋友出去聚会、逛街', b: '自己在家看书或追剧', d: 'ei' },
    { q: '工作中遇到难题时，你更习惯？', a: '找同事一起讨论解决', b: '自己安静思考找答案', d: 'ei' },
    { q: '在社交场合中，你通常是？', a: '主动结识新朋友', b: '等别人主动来搭话', d: 'ei' },
    { q: '哪种描述更符合你？', a: '朋友很多，但深交的不多', b: '朋友不多，但每个都很交心', d: 'ei' },
    { q: '放假时你更想？', a: '去热闹的地方玩', b: '找个安静的地方放松', d: 'ei' },
    // S/N
    { q: '看电影时你更关注？', a: '剧情逻辑和具体细节', b: '影片的隐喻和深层含义', d: 'sn' },
    { q: '学习新东西时，你更喜欢？', a: '逐步按教程来', b: '先了解整体框架再自由探索', d: 'sn' },
    { q: '描述一件事时，你更注重？', a: '具体发生了什么', b: '这件事说明了什么', d: 'sn' },
    { q: '你更容易记住？', a: '实际发生过的事情', b: '做过的梦或想象过的画面', d: 'sn' },
    { q: '哪种描述更符合你？', a: '注重实际、关注当下', b: '爱幻想、关注未来可能性', d: 'sn' },
    // T/F
    { q: '做决定时你更看重？', a: '逻辑上是否正确', b: '会不会伤害到别人', d: 'tf' },
    { q: '朋友向你倾诉烦恼时，你更倾向？', a: '帮他分析问题原因', b: '安慰他的情绪', d: 'tf' },
    { q: '你觉得自己更偏向？', a: '理性冷静', b: '感性热情', d: 'tf' },
    { q: '争论时你更在乎？', a: '谁对谁错', b: '大家的感受', d: 'tf' },
    { q: '看电影时你容易？', a: '冷静分析剧情逻辑', b: '被情节感动落泪', d: 'tf' },
    // J/P
    { q: '你的工作或学习空间通常是？', a: '整洁有序、物归原位', b: '乱中有序、找得到就行', d: 'jp' },
    { q: '旅行前你会？', a: '做详细的行程计划', b: '大概看看，到了再说', d: 'jp' },
    { q: '截止日期对你来说？', a: '必须提前完成才安心', b: '是最后冲刺的动力', d: 'jp' },
    { q: '你更喜欢的生活方式？', a: '有规律和计划性', b: '随性自由、灵活应变', d: 'jp' },
    { q: '做项目时你倾向于？', a: '按计划逐步推进', b: '凭灵感驱动、边做边调整', d: 'jp' },
  ];

  const typeData = {
    'INTJ': { name: '建筑师', ename: 'Architect', traits: '独立、有远见、理性、追求完美', desc: 'INTJ 是战略型思考者，善于从全局视角分析问题。他们独立自主，对自己和他人都有很高的标准，总是在思考和规划未来。', careers: '战略顾问、软件架构师、投资分析师、科研人员、律师', famous: '埃隆·马斯克、克里斯托弗·诺兰、扎克伯格' },
    'INTP': { name: '逻辑家', ename: 'Logician', traits: '理性、好奇、创新、独立思考', desc: 'INTP 是天生的思考者，喜欢探索理论体系和抽象概念。他们好奇心强，善于发现事物背后的逻辑规律，享受独立解决复杂问题。', careers: '程序员、科学家、大学教授、数据分析师、工程师', famous: '阿尔伯特·爱因斯坦、比尔·盖茨、勒内·笛卡尔' },
    'ENTJ': { name: '指挥官', ename: 'Commander', traits: '果断、领导力、战略思维、高效', desc: 'ENTJ 是天生领导者，擅长组织协调和制定战略。他们目标明确、执行力强，能够激励和带领团队实现宏大目标。', careers: '企业高管、项目经理、管理顾问、创业者、法官', famous: '史蒂夫·乔布斯、玛格丽特·撒切尔、小罗伯特·唐尼' },
    'ENTP': { name: '辩论家', ename: 'Debater', traits: '机智、创新、热爱挑战、灵活', desc: 'ENTP 是充满创意的思想者，喜欢挑战传统观念和探索新可能性。他们思维敏捷、口才出众，善于在辩论中激发新想法。', careers: '创业家、创意总监、记者、律师、产品经理', famous: '达·芬奇、汤姆·霍迪尔、昆汀·塔伦蒂诺' },
    'INFJ': { name: '提倡者', ename: 'Advocate', traits: '理想主义、有洞察力、有同理心', desc: 'INFJ 是稀有的理想主义者，有深刻的洞察力和强烈的使命感。他们善于理解他人，致力于让世界变得更好。', careers: '心理咨询师、作家、教育工作者、人力资源、医生', famous: '马丁·路德·金、弗洛伊德、泰勒斯威夫特' },
    'INFP': { name: '治愈者', ename: 'Mediator', traits: '理想主义、敏感、有创造力、善良', desc: 'INFP 是充满热情的理想主义者，忠于自己的价值观和信念。他们富有创造力和同理心，善于用独特的方式表达内心世界。', careers: '作家、设计师、心理咨询师、插画师、音乐人', famous: '莎士比亚、梵高、J·K·罗琳、宫崎骏' },
    'ENFJ': { name: '主人公', ename: 'Protagonist', traits: '有魅力、有感染力、乐于助人', desc: 'ENFJ 是有感染力的领导者，善于发现他人的潜力并激励他们成长。他们热情、有同理心，是天生的导师和倡导者。', careers: '培训师、公关经理、教师、人力资源总监、咨询师', famous: '奥巴马、奥普拉·温弗瑞、曼德拉' },
    'ENFP': { name: '活动家', ename: 'Campaigner', traits: '热情、有创造力、自由奔放', desc: 'ENFP 是充满活力的社交者，热爱探索新事物和建立人际连接。他们创意丰富、乐观向上，总能给周围带来正能量。', careers: '记者、创意文案、心理咨询师、演员、品牌策划', famous: '罗宾·威廉姆斯、马克·吐温、昆汀·塔伦蒂诺' },
    'ISTJ': { name: '物流师', ename: 'Logistician', traits: '可靠、负责、有条理、务实', desc: 'ISTJ 是务实可靠的执行者，做事认真负责、注重细节。他们遵循规则和传统，是团队中最值得信赖的成员。', careers: '会计师、审计师、法官、项目经理、公务员', famous: '乔治·华盛顿、贝多芬、伊丽莎白二世' },
    'ISFJ': { name: '守卫者', ename: 'Defender', traits: '体贴、有责任心、细心、耐心', desc: 'ISFJ 是默默奉献的守卫者，总是把别人的需求放在首位。他们温和体贴、注重细节，用行动表达对身边人的关爱。', careers: '护士、教师、社会工作者、行政管理、心理咨询师', famous: '特蕾莎修女、碧昂丝、凯特·米德尔顿' },
    'ESTJ': { name: '总经理', ename: 'Executive', traits: '果断、有组织力、务实、高效', desc: 'ESTJ 是天生的管理者，擅长制定规则和流程。他们务实高效、执行力强，总能把想法变成现实。', careers: '项目经理、企业管理者、法官、军官、财务总监', famous: '亨利·福特、桑德斯上校、艾玛·沃森' },
    'ESFJ': { name: '执政官', ename: 'Consul', traits: '热情、有爱心、乐于助人、合作', desc: 'ESFJ 是温暖的热心人，乐于为他人服务和创造和谐氛围。他们社交能力强、责任心重，是社区和团队的粘合剂。', careers: '教师、护士、HR、社工、客服管理', famous: '泰勒·斯威夫特、比尔·克林顿、詹妮弗·洛佩兹' },
    'ISTP': { name: '鉴赏家', ename: 'Virtuoso', traits: '冷静、实操能力强、灵活、冒险', desc: 'ISTP 是动手能力强的实干家，擅长使用工具和解决实操问题。他们冷静沉稳、适应性极强，享受探索事物运作原理。', careers: '工程师、技术员、外科医生、飞行员、运动员', famous: '李小龙、克林特·伊斯特伍德、迈克尔·乔丹' },
    'ISFP': { name: '探险家', ename: 'Adventurer', traits: '艺术感、敏感、友善、谦逊', desc: 'ISFP 是富有艺术气息的创作者，用独特的审美和方式表达自我。他们温和谦逊、善于发现生活中的美。', careers: '设计师、摄影师、音乐人、画家、园艺师', famous: '迈克尔·杰克逊、大卫·鲍伊、弗里达·卡罗' },
    'ESTP': { name: '企业家', ename: 'Entrepreneur', traits: '精力充沛、果敢、善交际、务实', desc: 'ESTP 是行动派创业者，反应迅速、善于抓住机会。他们社交能力强、适应力好，总能在动态环境中脱颖而出。', careers: '创业者、销售总监、运动员、侦探、演员', famous: '唐纳德·特朗普、麦迪逊·比尔、杰克·尼克尔森' },
    'ESFP': { name: '表演者', ename: 'Entertainer', traits: '热情、乐观、善于社交、即兴', desc: 'ESFP 是天生的表演者，热爱站在聚光灯下。他们活力四射、感染力强，总能让身边的人感受到快乐和热情。', careers: '演员、主持人、公关、旅游策划、销售人员', famous: '小罗伯特·唐尼、玛丽莲·梦露、艾尔顿·约翰' },
  };

  let currentQ = 0;
  let answers = [];

  let currentQ = 0;
  let answers = [];

  // DOM
  const startEl = document.getElementById('mbtiStart');
  const questionsEl = document.getElementById('mbtiQuestions');
  const resultEl = document.getElementById('mbtiResult');
  const container = document.getElementById('questionContainer');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');

  btnStart.addEventListener('click', startTest);
  btnRetest.addEventListener('click', resetAll);

  function resetAll() { currentQ = 0; answers = []; startEl.style.display = ''; questionsEl.style.display = 'none'; resultEl.classList.remove('active'); }

  function startTest() {
    startEl.style.display = 'none';
    questionsEl.style.display = 'block';
    currentQ = 0;
    answers = [];
    renderQuestion();
  }

  function renderQuestion() {
    if (currentQ >= questions.length) { showResult(); return; }
    const q = questions[currentQ];
    progressBar.style.width = ((currentQ) / questions.length * 100) + '%';
    progressText.textContent = (currentQ + 1) + ' / ' + questions.length;

    const dimap = { 'ei': 'E / I', 'sn': 'S / N', 'tf': 'T / F', 'jp': 'J / P' };
    const tagClassMap = { 'ei': 'ei', 'sn': 'sn', 'tf': 'tf', 'jp': 'jp' };

    container.innerHTML = `
      <div class="mbti-question active">
        <div style="text-align:center;margin-bottom:12px"><span class="mbti-tag ${tagClassMap[q.d]}">${dimap[q.d]}</span></div>
        <div class="mbti-q-title">${q.q}</div>
        <div class="mbti-options">
          <div class="mbti-option" data-idx="0">${q.a}</div>
          <div class="mbti-option" data-idx="1">${q.b}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:20px">
        <button id="btnPrev" class="mbti-btn secondary" ${currentQ === 0 ? 'disabled' : ''}><i class="fas fa-arrow-left"></i> 上一题</button>
        <button id="btnNext" class="mbti-btn" ${answers[currentQ] === undefined ? 'disabled' : ''}>${currentQ === questions.length - 1 ? '完成' : '下一题'} <i class="fas fa-arrow-right"></i></button>
      </div>`;

    // 恢复已选答案
    if (answers[currentQ] !== undefined) {
      const opts = container.querySelectorAll('.mbti-option');
      opts[answers[currentQ]].classList.add('selected');
    }

    container.querySelectorAll('.mbti-option').forEach(el => {
      el.addEventListener('click', () => {
        container.querySelectorAll('.mbti-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        answers[currentQ] = parseInt(el.dataset.idx);
        document.getElementById('btnNext').disabled = false;
      });
    });

    document.getElementById('btnNext').addEventListener('click', () => {
      if (answers[currentQ] === undefined) return;
      currentQ++; renderQuestion();
    });

    document.getElementById('btnPrev').addEventListener('click', () => {
      if (currentQ > 0) { currentQ--; renderQuestion(); }
    });
  }

  function calcResult() {
    const scores = { e:0, i:0, s:0, n:0, t:0, f:0, j:0, p:0 };
    questions.forEach((q, idx) => {
      const ans = answers[idx];
      if (ans === undefined) return;
      const map = { 'ei': ['e','i'], 'sn': ['s','n'], 'tf': ['t','f'], 'jp': ['j','p'] };
      const [d1, d2] = map[q.d];
      if (ans === 0) scores[d1]++; else scores[d2]++;
    });
    const total = 5;
    const pairs = [
      { l:'E', r:'I', pct: Math.round(scores.e / total * 100) },
      { l:'S', r:'N', pct: Math.round(scores.s / total * 100) },
      { l:'T', r:'F', pct: Math.round(scores.t / total * 100) },
      { l:'J', r:'P', pct: Math.round(scores.j / total * 100) },
    ];
    let type = '';
    type += scores.e >= scores.i ? 'E' : 'I';
    type += scores.s >= scores.n ? 'S' : 'N';
    type += scores.t >= scores.f ? 'T' : 'F';
    type += scores.j >= scores.p ? 'J' : 'P';
    return { type, pairs, td: typeData[type] || typeData['INTJ'] };
  }

  function showResult() {
    questionsEl.style.display = 'none';
    resultEl.classList.add('active');

    const { type, pairs, td } = calcResult();

    document.getElementById('resultLetters').textContent = type;
    document.getElementById('resultName').textContent = td.name;
    document.getElementById('resultEName').textContent = td.ename;

    document.getElementById('resultBars').innerHTML = pairs.map(p => {
      const fill = type.includes(p.l) ? p.pct : 100 - p.pct;
      return `<div class="mbti-bar-row">
        <span class="mbti-bar-label">${p.l}</span>
        <div class="mbti-bar-track"><div class="mbti-bar-fill" style="width:${fill}%"></div></div>
        <span class="mbti-bar-label">${p.r}</span>
        <span class="mbti-bar-pct">${fill}%</span>
      </div>`;
    }).join('');

    document.getElementById('resultContent').innerHTML = `
      <div class="mbti-section">
        <h3><i class="fas fa-tag"></i> 性格特点</h3>
        <div class="mbti-tags">${td.traits.split('、').map(t => '<span>' + t + '</span>').join('')}</div>
      </div>
      <div class="mbti-section">
        <h3><i class="fas fa-file-alt"></i> 性格描述</h3>
        <p>${td.desc}</p>
      </div>
      <div class="mbti-section">
        <h3><i class="fas fa-briefcase"></i> 适合职业</h3>
        <p>${td.careers}</p>
      </div>
      <div class="mbti-section">
        <h3><i class="fas fa-star"></i> 典型人物</h3>
        <p>${td.famous}</p>
      </div>`;

    // 生成 QR 码
    const qrImg = document.getElementById('qrCode');
    qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(MBTI_URL);
    qrImg.onerror = () => { qrImg.style.display = 'none'; document.getElementById('qrFallback').style.display = 'block'; };
  }

  // ── 保存为图片 ──
  document.getElementById('btnSaveImg').addEventListener('click', () => {
    const { type, pairs, td } = calcResult();
    const W = 600, H = 820;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');

    // 背景
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#f8fafc'); grad.addColorStop(1,'#f1f5f9');
    ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);

    // 标题
    ctx.fillStyle = '#6366f1'; ctx.beginPath(); ctx.arc(W/2,0,80,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('MBTI 人格测试结果', W/2, 50);

    // 类型
    ctx.fillStyle = '#6366f1';
    ctx.font = 'bold 56px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(type, W/2, 140);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px sans-serif'; ctx.fillText(td.name + ' · ' + td.ename, W/2, 172);

    // 分割线
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60,192); ctx.lineTo(W-60,192); ctx.stroke();

    // 百分比条
    const colors = [['#6366f1','#818cf8'],['#10b981','#34d399'],['#f59e0b','#fbbf24'],['#ef4444','#f87171']];
    pairs.forEach((p, i) => {
      const y = 210 + i * 36;
      const fill = type.includes(p.l) ? p.pct : 100 - p.pct;
      ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.l, 40, y+12);
      ctx.fillText(p.r, W-40, y+12);
      // 进度条背景
      ctx.fillStyle = '#e2e8f0'; roundRect(ctx, 60, y-2, W-120, 16, 8); ctx.fill();
      // 进度条填充
      const bw = (W-120) * fill / 100;
      const g = ctx.createLinearGradient(60+bw,0,60,0);
      g.addColorStop(0,colors[i][0]); g.addColorStop(1,colors[i][1]);
      ctx.fillStyle = g; roundRect(ctx, 60, y-2, bw, 16, 8); ctx.fill();
      // 百分比文字
      ctx.fillStyle = colors[i][0]; ctx.font = 'bold 12px sans-serif';
      ctx.fillText(fill + '%', 60 + bw/2, y+10);
    });

    // 特点
    const traitsY = 370;
    ctx.fillStyle = '#64748b'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('性格特点', 40, traitsY);
    ctx.fillStyle = '#1e293b'; ctx.font = '13px sans-serif';
    ctx.fillText(td.traits, 40, traitsY + 22);

    // 描述
    const descY = 420;
    ctx.fillStyle = '#64748b'; ctx.font = 'bold 13px sans-serif';
    ctx.fillText('性格描述', 40, descY);
    ctx.fillStyle = '#475569'; ctx.font = '12px sans-serif';
    wrapText(ctx, td.desc, 40, descY + 22, W - 80, 18, 3);

    // 职业
    const careersY = 495;
    ctx.fillStyle = '#64748b'; ctx.font = 'bold 13px sans-serif';
    ctx.fillText('适合职业', 40, careersY);
    ctx.fillStyle = '#475569'; ctx.font = '12px sans-serif';
    ctx.fillText(td.careers, 40, careersY + 22);

    // QR 码
    const qrSize = 100, qrX = (W - qrSize) / 2, qrY = 560;
    const qrImg = document.getElementById('qrCode');
    if (qrImg && qrImg.complete && qrImg.naturalWidth > 0) {
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    }
    ctx.fillStyle = '#6366f1'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('MBTI · 扫码测试', W/2, qrY + qrSize + 18);

    // 底部文字
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('toolkit.skin', W/2, H - 16);

    // 下载
    const link = document.createElement('a');
    link.download = type + 'MBTI.png';
    link.href = c.toDataURL('image/png');
    link.click();
  });

  // ── 分享 ──
  document.getElementById('btnShare').addEventListener('click', async () => {
    const { type } = calcResult();
    const text = '我的人格类型是 ' + type + '！快来测试你的 MBTI 类型 → ' + MBTI_URL;
    if (navigator.share) {
      try { await navigator.share({ title: 'MBTI测试', text }); } catch(e) {}
    } else {
      try { await navigator.clipboard.writeText(text); alert('链接已复制到剪贴板，快去分享吧！'); } catch(e) { prompt('复制链接分享：', text); }
    }
  });

  // ── 辅助 ──
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); }
  function wrapText(ctx, text, x, y, maxW, lineH, maxLines) { const words = text.split(''); let line = '', lineCount = 0; for (let i=0; i<words.length; i++) { line += words[i]; const w = ctx.measureText(line).width; if (w > maxW) { ctx.fillText(line.slice(0,-1), x, y); line = words[i]; y += lineH; lineCount++; if (lineCount >= maxLines) { ctx.fillText('…', x, y - lineH); return; } } } ctx.fillText(line, x, y); }
})();
