// api/create-permit.js
// 작업허가서 데이터를 Supabase에 저장하고 서명 링크 생성

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

    const { formData, projectName, companyName, workerCount, submitDate, managers } = req.body;

    // 고유 토큰 생성
    const token = Math.random().toString(36).substr(2, 12) + Date.now().toString(36);

    // Supabase에 저장
    const { data, error } = await supabase
      .from('permits')
      .insert({
        token,
        project_name: projectName,
        company_name: companyName,
        worker_count: workerCount,
        submit_date: submitDate,
        managers: JSON.stringify(managers),
        form_data: JSON.stringify(formData),
        status: 'pending', // pending → signed
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7일 후 만료
      })
      .select();

    if (error) throw error;

    const signingUrl = `${process.env.SITE_URL || 'https://bnct-w3cj.vercel.app'}/sign?token=${token}`;

    return res.status(200).json({ success: true, token, signingUrl });

  } catch (error) {
    console.error('permit 생성 오류:', error);
    return res.status(500).json({ error: error.message });
  }
};
