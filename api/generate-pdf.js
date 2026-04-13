const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
 
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
      .from('permits').select('*').eq('token', token).single();
 
    if (error || !permit) return res.status(404).json({ error: '서류를 찾을 수 없습니다.' });
 
    let fields = {}, sec3 = {}, sec4 = {}, extra = {};
    try { fields = JSON.parse(permit.form_fields || '{}'); } catch(e){}
    try { sec3 = JSON.parse(permit.section3_data || '{}'); } catch(e){}
    try { sec4 = JSON.parse(permit.section4_data || '{}'); } catch(e){}
    try { extra = JSON.parse(permit.extra_fields || '{}'); } catch(e){}
    if (sec3.extraFields) {
      try {
        const ef = typeof sec3.extraFields === 'string' ? JSON.parse(sec3.extraFields) : sec3.extraFields;
        extra = Object.assign({}, ef, extra);
      } catch(e){}
    }
 
    // 데이터를 JSON 파일로 저장
    const tmpDir = os.tmpdir();
    const dataFile = path.join(tmpDir, `permit_${token}.json`);
    const outFile  = path.join(tmpDir, `permit_${token}.pdf`);
 
    fs.writeFileSync(dataFile, JSON.stringify({
      project: permit.project_name || '',
      company: permit.company_name || '',
      fields, sec3, sec4, extra
    }));
 
    // Python으로 PDF 생성
    const pythonScript = path.join(__dirname, '../scripts/gen_permit.py');
    execSync(`python3 "${pythonScript}" "${dataFile}" "${outFile}"`, { timeout: 30000 });
 
    if (!fs.existsSync(outFile)) throw new Error('PDF 생성 실패');
 
    const pdfBuffer = fs.readFileSync(outFile);
    fs.unlinkSync(dataFile);
    fs.unlinkSync(outFile);
 
    const now = new Date();
    const p2 = n => String(n).padStart(2,'0');
    const fname = `BNCT_작업허가서_${now.getFullYear()}${p2(now.getMonth()+1)}${p2(now.getDate())}_${p2(now.getHours())}${p2(now.getMinutes())}.pdf`;
 
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`);
    return res.status(200).send(pdfBuffer);
 
  } catch (error) {
    console.error('PDF 생성 오류:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
