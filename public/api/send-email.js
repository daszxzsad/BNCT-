const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      recipients, ccRecipients,
      pdfBase64, fileName,
      projectName, companyName, workerCount, submitDate, docCount,
      signingUrl
    } = req.body;

    if (!recipients || !pdfBase64) {
      return res.status(400).json({ error: '필수 데이터 누락' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const ccList = (ccRecipients || []).map(r => `"${r.name}" <${r.email}>`).join(', ');
    const toList = recipients.map(r => `"${r.name}" <${r.email}>`).join(', ');

    // 서명 링크 버튼 HTML
    const signingBtnHtml = signingUrl ? `
      <div style="margin: 24px 0; text-align: center;">
        <a href="${signingUrl}" style="
          display: inline-block;
          background: linear-gradient(135deg, #003087, #1565c0);
          color: white;
          padding: 14px 36px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 12px rgba(0,48,135,0.3);
        ">서명하러 가기 (Section 3~4)</a>
        <div style="margin-top: 8px; font-size: 11px; color: #aaa;">링크 유효기간: 7일</div>
      </div>
    ` : '';

    const htmlBody = `
      <div style="font-family: 'Noto Sans KR', Arial, sans-serif; max-width: 620px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #003087, #1565c0); padding: 24px 32px; border-radius: 8px 8px 0 0;">
          <div style="color: white; font-size: 26px; font-weight: 900; letter-spacing: 4px;">BNCT</div>
          <div style="color: rgba(255,255,255,0.75); font-size: 13px; margin-top: 4px;">자산관리팀 안전서류 통합관리 시스템</div>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 15px; color: #333; margin-bottom: 20px;">
            안녕하세요, <strong>${recipients.map(r=>r.name).join(', ')}</strong> 담당자님.<br>
            아래 작업 안전서류가 제출되었습니다.
          </p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <tr style="background:#f5f7fa;"><td style="padding:10px 16px;font-weight:700;color:#555;width:110px;border:1px solid #e0e0e0;">공사명</td><td style="padding:10px 16px;border:1px solid #e0e0e0;">${projectName}</td></tr>
            <tr><td style="padding:10px 16px;font-weight:700;color:#555;border:1px solid #e0e0e0;">업체명</td><td style="padding:10px 16px;border:1px solid #e0e0e0;">${companyName}</td></tr>
            <tr style="background:#f5f7fa;"><td style="padding:10px 16px;font-weight:700;color:#555;border:1px solid #e0e0e0;">작업인원</td><td style="padding:10px 16px;border:1px solid #e0e0e0;">${workerCount}명</td></tr>
            <tr><td style="padding:10px 16px;font-weight:700;color:#555;border:1px solid #e0e0e0;">서류분량</td><td style="padding:10px 16px;border:1px solid #e0e0e0;">${docCount}페이지</td></tr>
            <tr style="background:#f5f7fa;"><td style="padding:10px 16px;font-weight:700;color:#555;border:1px solid #e0e0e0;">제출일시</td><td style="padding:10px 16px;border:1px solid #e0e0e0;">${submitDate}</td></tr>
          </table>
          ${signingBtnHtml}
          <div style="background:#e8f0fe;border-left:4px solid #1565c0;padding:12px 16px;border-radius:4px;font-size:13px;color:#333;margin-bottom:16px;">
            PDF 파일이 첨부되어 있습니다. 확인 후 보관해 주세요.
          </div>
          <p style="font-size:11px;color:#aaa;margin-top:20px;text-align:center;">
            본 메일은 BNCT 자산관리팀 안전서류 시스템에서 자동 발송되었습니다.
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"BNCT 안전서류 시스템" <${process.env.GMAIL_USER}>`,
      to: toList,
      cc: ccList,
      subject: `[BNCT 안전서류] ${projectName} - ${companyName} (${submitDate})`,
      html: htmlBody,
      attachments: [{
        filename: fileName,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('이메일 발송 오류:', error);
    return res.status(500).json({ error: error.message });
  }
};
