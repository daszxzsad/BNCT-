// api/get-permit.js
const { createClient } = require('@supabase/supabase-js');

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

    const { data, error } = await supabase
      .from('permits')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) return res.status(404).json({ error: '서류를 찾을 수 없습니다.' });

    // 만료 확인
    if (new Date(data.expires_at) < new Date()) {
      return res.status(410).json({ error: '만료된 링크입니다. (7일 초과)' });
    }

    return res.status(200).json({ success: true, permit: data });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
