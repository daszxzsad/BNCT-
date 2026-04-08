const { createClient } = require('@supabase/supabase-js');
 
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
 
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
 
    const { token, section3, section4, extraFields } = req.body;
    if (!token) return res.status(400).json({ error: 'token 없음' });
 
    const { data: permit, error: fetchErr } = await supabase
      .from('permits').select('*').eq('token', token).single();
 
    if (fetchErr || !permit) return res.status(404).json({ error: '서류를 찾을 수 없습니다.' });
    if (new Date(permit.expires_at) < new Date()) return res.status(410).json({ error: '만료된 링크입니다.' });
 
    const { error: updateErr } = await supabase
      .from('permits')
      .update({
        status: 'signed',
        section3_data: JSON.stringify(section3),
        section4_data: JSON.stringify(section4),
        extra_fields: JSON.stringify(extraFields || {}),
        signed_at: new Date().toISOString(),
      })
      .eq('token', token);
 
    if (updateErr) throw updateErr;
 
    return res.status(200).json({ success: true });
 
  } catch (error) {
    console.error('서명 저장 오류:', error);
    return res.status(500).json({ error: error.message });
  }
};
