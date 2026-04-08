// api/generate-pdf.js
// reportlab으로 서버에서 PDF 생성
// 필요: pip install reportlab (Vercel Python runtime)
// → Node.js에서는 직접 Python 호출 불가, 대신 PDFKit (Node) 사용

const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// 한글 폰트 경로 (프로젝트 내 fonts/ 폴더)
const FONT_KR   = path.join(__dirname, '../fonts/NanumGothic.ttf');
const FONT_KR_B = path.join(__dirname, '../fonts/NanumGothicBold.ttf');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token 없음' });

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: permit, error } = await supabase
      .from('permits')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !permit) return res.status(404).json({ error: '서류를 찾을 수 없습니다.' });

    let fields = {};
    let sec3 = {};
    let sec4 = {};
    let extra = {};
    try { fields = JSON.parse(permit.form_fields || '{}'); } catch(e){ console.log('form_fields parse err:', e.message); }
    try { sec3 = JSON.parse(permit.section3_data || '{}'); } catch(e){ console.log('sec3 parse err:', e.message); }
    try { sec4 = JSON.parse(permit.section4_data || '{}'); } catch(e){ console.log('sec4 parse err:', e.message); }
    try { extra = JSON.parse(permit.extra_fields || '{}'); } catch(e){}
    // section3 안에 extraFields 있으면 병합
    if (sec3.extraFields) {
      try { const ef = typeof sec3.extraFields === 'string' ? JSON.parse(sec3.extraFields) : sec3.extraFields;
            extra = Object.assign({}, ef, extra); } catch(e){}
    }
    
    // 디버그 로그
    console.log('permit token:', token);
    console.log('fields keys:', Object.keys(fields).slice(0,10));
    console.log('sec3 name:', sec3.name);
    console.log('sec4 name:', sec4.name);

    // PDF 생성
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    doc.registerFont('KR', FONT_KR);
    doc.registerFont('KR-B', FONT_KR_B);
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);

      const M = 40; // margin
      const PW = 595.28;
      const PH = 841.89;
      const TW = PW - M * 2;
      const NAVY = '#003087';
      const GRAY = '#EBEBEB';
      const LG = '#D1D1D1';

      let y = M;

      function drawRect(x, yw, w, h, fill, stroke) {
        if (fill) doc.rect(x, yw, w, h).fill(fill);
        if (stroke) doc.rect(x, yw, w, h).stroke(stroke);
      }

      function text(str, x, yw, opts) {
        doc.text(str || '', x, yw, opts);
      }

      function sectionHeader(title, yw) {
        drawRect(M, yw, TW, 16, NAVY);
        doc.fillColor('white').fontSize(8).font('KR-B')
          .text(title, M + 5, yw + 4, { width: TW - 10 });
        return yw + 16;
      }

      function row(label, value, yw, lw) {
        lw = lw || 80;
        const rh = 16;
        drawRect(M, yw, lw, rh, GRAY, LG);
        drawRect(M + lw, yw, TW - lw, rh, null, LG);
        doc.rect(M, yw, TW, rh).stroke(LG);
        doc.fillColor('black').fontSize(7.5).font('KR-B')
          .text(label, M + 3, yw + 4, { width: lw - 6 });
        doc.font('KR').text(value || '', M + lw + 3, yw + 4, { width: TW - lw - 6 });
        return yw + rh;
      }

      function checkRow(text_val, yw) {
        const rh = 14;
        doc.rect(M, yw, TW, rh).stroke(LG);
        doc.fillColor('black').fontSize(7.5).font('KR')
          .text('□  ' + text_val, M + 4, yw + 3, { width: TW - 8 });
        return yw + rh;
      }

      function sigRow(name, date, time, sigImg, yw) {
        const rh = 36;
        const cols = [50, 120, 50, 160, 50, 80, 50, TW - 560];
        let cx = M;
        const labels = ['이름:', '', '서명:', '', '날짜:', '', '시간:', ''];
        const vals = [name||'', '', '', '', date||'', '', time||'', ''];

        for (let i = 0; i < 8; i++) {
          const cw = cols[i];
          if (i % 2 === 0) {
            drawRect(cx, yw, cw, rh, GRAY, LG);
            doc.fillColor('black').fontSize(7.5).font('KR-B')
              .text(labels[i], cx + 2, yw + 12, { width: cw - 4 });
          } else {
            doc.rect(cx, yw, cw, rh).stroke(LG);
            if (i === 3 && sigImg) {
              // 서명 이미지
              try {
                const imgData = sigImg.replace(/^data:image\/\w+;base64,/, '');
                const buf = Buffer.from(imgData, 'base64');
                doc.image(buf, cx + 2, yw + 2, { width: cw - 4, height: rh - 4, fit: [cw - 4, rh - 4] });
              } catch(e) {}
            } else if (vals[i]) {
              doc.fillColor('black').fontSize(7.5).font('KR')
                .text(vals[i], cx + 2, yw + 12, { width: cw - 4 });
            }
          }
          cx += cw;
        }
        return yw + rh;
      }

      // ── PAGE 1 ──────────────────────────────────────────

      // 헤더
      drawRect(M, y, 60, 20, NAVY);
      doc.fillColor('white').fontSize(8).font('KR-B').text('작업허가서', M + 3, y + 6);
      doc.fillColor(NAVY).fontSize(18).font('KR-B').text('작업허가서  양식', M + 65, y + 2);
      doc.moveTo(M, y + 20).lineTo(M + TW, y + 20).lineWidth(2).strokeColor(NAVY).stroke();
      y += 22;

      // 번호
      const nw = 220;
      drawRect(M + TW - nw, y, 80, 14, GRAY, LG);
      drawRect(M + TW - nw + 80, y, nw - 80, 14, null, LG);
      doc.fillColor('black').fontSize(7.5).font('KR-B')
        .text('작업허가 번호:', M + TW - nw + 2, y + 3);
      doc.text(extra.permitNo || '', M + TW - nw + 82, y + 3);
      y += 14;

      // 공지
      doc.rect(M, y, TW, 14).stroke(LG);
      doc.fillColor('black').fontSize(7.5).font('KR')
        .text('본 양식(작업허가서 양식)은 작업 활동 관련하여, 상세 명시된 고위험군 작업에 대한 승인 및 전달 사항 등을 관리하기 위한 것이다.', M + 3, y + 3, { width: TW - 6 });
      y += 14;

      // Section 1
      y = sectionHeader('Section 1: 일반 사항', y);
      y = row('작업명:', fields['s1-work'] || permit.project_name || '', y);
      y = row('작업 장소:', fields['s1-place'] || '', y);
      y = row('작업 업체:', fields['s1-company'] || permit.company_name || '', y);
      y = row('예상 작업 기간:', (fields['s1-from'] || '') + '  부터  ' + (fields['s1-to'] || '') + '  까지', y);

      // 고위험군
      const rh_risk = 56;
      drawRect(M, y, 80, rh_risk, GRAY, LG);
      doc.fillColor('black').fontSize(7.5).font('KR-B')
        .text('본 작업허가서 발급이\n필요한 특정\n고위험군 작업:', M + 2, y + 10, { width: 76, align: 'center' });
      doc.rect(M + 80, y, TW - 80, rh_risk).stroke(LG);
      doc.fontSize(7.5).font('KR')
        .text('해당하는 네모 칸에 ✓표시를 하고 관련 양식을 첨부하시오.', M + 83, y + 2, { width: TW - 86 });
      const rItems = ['□ 화기 작업','□ 토공/굴착 작업','□ 밀폐공간출입작업','□ 설비/장비 격리','□ 고소 작업','□ 기계적 인양 작업','□ 고압 스위치 접근 및 시험 작업 허가','□ 전기 유지보수작업'];
      for (let i = 0; i < 8; i++) {
        const col = i % 2;
        const row_idx = Math.floor(i / 2);
        const cw = (TW - 80) / 2;
        doc.text(rItems[i], M + 83 + col * cw, y + 14 + row_idx * 11, { width: cw - 4 });
      }
      y += rh_risk;

      // Section 2
      y = sectionHeader('Section 2: 승인 요청 (작업 업체 관리 감독자 작성)', y);
      doc.rect(M, y, TW, 12).stroke(LG);
      doc.fillColor('black').fontSize(7.5).font('KR')
        .text('본인은 고위험군 작업을 한 허가를 요청하는 사람으로써, 다음 사항을 확인한다.', M + 4, y + 2, { width: TW - 8 });
      y += 12;
      const s2items = [
        '본인은 위험성 평가를 비롯하여 본 작업 활동과 관련하여 필요한 관리 양식들을 검토하였다.',
        '본인은, 조치가 적절히 이루어졌는지 확실히 하기 위해 관계자와 협의하였다.',
        '본인은, 첨부된 위험성 평가 및 해당 관리 양식에 따라 본 작업 활동을 조정 및 관리할 능력이 있다.',
        '본인은 작업자 및 작업에 영향을 받는 사람의 건강 및 안전을 확보하기 위해 필요한 모든 조치를 취할것이다.',
        '본인은, 작업 수행자가 위험성 평가 및 각 관리 양식은 물론 아래 Section 5 의 지시사항에 대한 설명을 들었고 해당 내용들을 이해했음을 확인하여야 한다.',
        '본인은, 작업 활동 전체에 걸쳐 위험요소를 관찰하고 관리하여야 한다.',
        '본인은, 당 작업 허가 승인 담당자에게 본 허가서를 검토하고, 등록 및 번호를 부여하도록 요청하는 바이다.',
      ];
      for (const item of s2items) y = checkRow(item, y);
      y = sigRow(fields['s2-name'] || '', fields['s2-date'] || '', fields['s2-time'] || '', fields['sig2_img'], y);

      // Section 3
      y = sectionHeader('Section 3: 작업업체 검토 (업무담당자 작성)', y);
      doc.rect(M, y, TW, 12).stroke(LG);
      doc.fillColor('black').fontSize(7.5).font('KR')
        .text('본인은 모든 문서들을 검토하였고, 의견 제시했다.', M + 4, y + 2);
      y += 12;
      const s3items = [
        '본인은, 위험성 평가 및 필요한 관리 양식을 포함하여 관련된 모든 문서들의 내용을 검토하였으며 작업 업체/작업자에게 의견을 제시하였다.',
        '본인은, 작업 업체/작업자를 담당하는 자로서, 작업 방식과 제안된 관리방안들이 시행되는 것을 모니터링하여 BNCT 터미널 안전 기준이 달성될 수 있도록 할 것이다.',
        '본인은, 해당 작업 구역의 관련자에게 작업 시행 구간, 작업 업체/작업자가 완결해야 할 모든 작업 내역, 작업 관리감독 및 강화를 위해 수립된 절차들에 대한 정보를 알려주었다.',
      ];
      for (const item of s3items) y = checkRow(item, y);
      y = sigRow(sec3.name || '', sec3.date || '', sec3.time || '', sec3.sig, y);

      // Section 4
      y = sectionHeader('Section 4: 승인 (작업허가 승인 담당자가 작성)', y);
      doc.rect(M, y, TW, 20).stroke(LG);
      doc.fillColor('black').fontSize(7.5).font('KR')
        .text('작업 활동 계획이 완결되었고, 위험성 평가 및 필요한 관리양식에 따라 해당 작업 착수를 승인한다는 것을 의미한다. 본인은 작업 허가 승인 담당자로서, 아래와 같은 사항을 확인한다.', M + 4, y + 3, { width: TW - 8 });
      y += 20;
      const s4items = [
        '본인은, 위험성 평가를 비롯하여 필요한 관리 양식을 포함한 모든 관련 문서 내용을 검토하였다.',
        '본인은 당 작업 허가서를 등록하고, 작업 번호를 부여하였으며, 관련된 모든 문서 상에 해당 작업 번호를 기입하였다.',
      ];
      for (const item of s4items) y = checkRow(item, y);
      y = sigRow(sec4.name || '이병문', sec4.date || '', sec4.time || '', sec4.sig, y);

      // 제한사항
      drawRect(M, y, 70, 14, GRAY, LG);
      doc.rect(M + 70, y, TW - 70, 14).stroke(LG);
      doc.fillColor('black').fontSize(7.5).font('KR-B').text('제한 사항:', M + 3, y + 3);
      doc.font('KR').text('본 작업 승인 사항은 아래 명시된 시점 혹은 일시 까지만 유효하다.', M + 73, y + 3, { width: TW - 76 });
      y += 14;

      doc.rect(M, y, TW, 14).stroke(LG);
      drawRect(M + 100, y, 40, 14, GRAY, LG);
      drawRect(M + 220, y, 40, 14, GRAY, LG);
      doc.font('KR-B').text('날짜:', M + 103, y + 3);
      doc.text(extra.s4_limit_date || '', M + 145, y + 3);
      doc.text('시간:', M + 223, y + 3);
      doc.font('KR').text(extra.s4_limit_time || '', M + 265, y + 3);
      y += 14;

      doc.rect(M, y, TW, 13).stroke(LG);
      doc.font('KR').fontSize(7.5)
        .text('□  작업허가 연장 요청이 있을 경우, Section 7 을 작성하시오.', M + 4, y + 2);
      y += 13;

      doc.font('KR').fontSize(7).fillColor('#888').text('Page 1 of 2', M, y + 3, { width: TW, align: 'right' });

      // ── PAGE 2 ──────────────────────────────────────────
      doc.addPage();
      y = M;

      // 헤더
      drawRect(M, y, 60, 18, NAVY);
      doc.fillColor('white').fontSize(8).font('KR-B').text('작업허가서', M + 3, y + 5);
      doc.fillColor(NAVY).fontSize(14).font('KR-B').text('작업허가서  양식 (계속)', M + 65, y + 2);
      doc.moveTo(M, y + 18).lineTo(M + TW, y + 18).lineWidth(1.5).strokeColor(NAVY).stroke();
      y += 20;

      // Section 5
      y = sectionHeader('Section 5: 작업허가/작업구역 출입관련 지시 사항 (작업자 작성)', y);
      y = checkRow('Note: 작업자는 반드시 아래 각각의 지시사항을 준수하여야 한다.', y);
      const s5items = [
        '1.  본인의 역할 및 업무, 작업 범위에 대해 숙지하여야 한다.',
        '2.  위험성 평가 및 관리 양식을 읽고, 설명을 들었으며, 이를 이해하고 있어야 한다. 확실하지 않은 사항에 대해서는 질문하도록 한다. 만약 작업 전에 우려사항이 있다면 보고하도록 한다.',
        '3.  각 조 작업을 시작할 때마다 현장 감독자에게 알려야 하며, 작업허가/ 출입 관련 지시 및 허가를 받아 작업을 시작하도록 한다.',
        '4.  교대 근무를 할 경우, 작업 시작 전/종료 후 서명한다. (Section 7 참고)',
        '5.  작업 하는 동안 새로운 위험요소가 발견되었다면, 즉시 해당 작업 업체/작업자들의 현장 감독자와 기타 작업과 연관된 당사자들에게 통보한다.',
      ];
      for (const item of s5items) y = checkRow(item, y);
      y += 5;

      // Section 6
      y = sectionHeader('Section 6: 작업업체 관리감독자 (해당할 경우)', y);
      const s6rows = [
        ['작업시작 전 논의사항', extra.s6_discuss || '', 50],
        ['점검 / 확인 시점 :', extra.s6_check || '', 18],
        ['작업 완료 후 최종 점검', (extra.s6_date || '') + '  ' + (extra.s6_time || ''), 18],
        ['변화/변경사항 (해당할 경우):', extra.s6_change || '', 25],
      ];
      for (const [lbl, val, rh] of s6rows) {
        drawRect(M, y, 100, rh, GRAY, LG);
        doc.rect(M + 100, y, TW - 100, rh).stroke(LG);
        doc.fillColor('black').fontSize(7.5).font('KR-B').text(lbl, M + 3, y + 3, { width: 95 });
        doc.font('KR').text(val || '', M + 103, y + 3, { width: TW - 107 });
        y += rh;
      }
      y += 5;

      // Section 7
      y = sectionHeader('Section 7: 허가 기간 연장 (당초 작업허가 승인자가 작성)', y);
      doc.rect(M, y, TW, 20).stroke(LG);
      doc.fillColor('black').fontSize(7.5).font('KR')
        .text('작업계획서 검토 후 위험성 평가 및 관리 양식에 따라 작업 연장을 허가하였다. 본인은 당초 작업허가 승인자 담당자로써 다음 사항을 확인한다:', M + 4, y + 3, { width: TW - 8 });
      y += 20;
      y = checkRow('본인은, 위험성 평가를 비롯하여 필요한 관리 양식을 포함한 모든 관련 문서 내용을 검토하였다.', y);
      y = checkRow('본 허가서를 작업 허가 목록에 수정 반영하였다. 작업 연장은 한번만 할 수 있으며, 당초 작업 완료일 기준일로부터 최대 7일까지 가능하다.', y);
      doc.rect(M, y, TW, 13).stroke(LG);
      doc.font('KR').fontSize(7.5)
        .text('기간 연장 :  ' + (extra.s7_from || '      /      /     ') + '  부터  ' + (extra.s7_to || '      /      /     ') + '  (최대 7 일)', M + 4, y + 2, { width: TW - 8 });
      y += 13;
      y = sigRow(extra.s7_name || '', '', '', extra.s7_sig, y);
      y += 5;

      // Section 8
      y = sectionHeader('Section 8: 작업 철수 (작업 업체 관리 감독자 작성)', y);
      doc.rect(M, y, TW, 20).stroke(LG);
      doc.fillColor('black').fontSize(7.5).font('KR')
        .text('해당 작업이 완결되어, 이를 모든 작업자에게 설명하였으며, 작업 현장은 안전하게 정돈되었다. 본 작업 허가서, 위험성 평가 및 관리 양식을 반드시 작업허가 승인 담당자에게 제출해야만 한다.', M + 4, y + 3, { width: TW - 8 });
      y += 20;
      y = sigRow(extra.s8_name || '', '', '', extra.s8_sig, y);
      y += 5;

      // Section 9
      y = sectionHeader('Section 9: 작업 종료 관련 (업무 담당자 작성)', y);
      doc.rect(M, y, TW, 20).stroke(LG);
      doc.fillColor('black').fontSize(7.5).font('KR')
        .text('본 작업 활동이 완결되어, 모든 작업자에게 설명하였으며, 작업 현장은 안전하게 정돈되었다. 작업 수행에 참여한 작업 업체의 현장 감독자는 반드시 본 작업 허가서, 위험성 평가 및 작업허가 양식을 터미널 담당자에게 반납해야 한다.', M + 4, y + 3, { width: TW - 8 });
      y += 20;
      y = sigRow(extra.s9_name || '', '', '', extra.s9_sig, y);
      y += 5;

      // Section 10
      y = sectionHeader('Section 10: 작업 완료 허가 (작업 허가 승인 담당자가 작성)', y);
      doc.rect(M, y, TW, 20).stroke(LG);
      doc.fillColor('black').fontSize(7.5).font('KR')
        .text('본 작업허가서와 연관된 모든 작업이 종결되었으며, 해당 문서들을 수령하였다. 본인은 BNCT 작업허가대장에 해당 허가서를 마감 등록하였으며, 기록 보존(스캔, 파일 저장 등)을 위해 관련된 서류를 제출하였다.', M + 4, y + 3, { width: TW - 8 });
      y += 20;
      y = sigRow(extra.s10_name || '', '', '', extra.s10_sig, y);

      doc.font('KR').fontSize(7).fillColor('#888').text('Page 2 of 2', M, y + 5, { width: TW, align: 'right' });

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);
    const now = new Date();
    const p2 = n => String(n).padStart(2,'0');
    const fname = `BNCT_작업허가서_${now.getFullYear()}${p2(now.getMonth()+1)}${p2(now.getDate())}_${p2(now.getHours())}${p2(now.getMinutes())}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.status(200).send(pdfBuffer);

  } catch (error) {
    console.error('PDF 생성 오류:', error);
    return res.status(500).json({ error: error.message });
  }
};
