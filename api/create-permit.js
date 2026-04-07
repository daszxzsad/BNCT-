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

    const { formFields, pdfBase64, projectName, companyName, workerCount, submitDate, managers } = req.body;

    const token = Math.random().toString(36).substr(2, 12) + Date.now().toString(36);

    const { data, error } = await supabase
      .from('permits')
      .insert({
        token,
        project_name: projectName,
        company_name: companyName,
        worker_count: workerCount,
        submit_date: submitDate,
        managers: JSON.stringify(managers),
        form_fields: JSON.stringify(formFields || {}),
        pdf_base64: pdfBase64 || null,
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select();

    if (error) throw error;

    const signingUrl = `https://bnct-w3cj.vercel.app/sign?token=${token}`;
    return res.status(200).json({ success: true, token, signingUrl });

  } catch (error) {
    console.error('permit 생성 오류:', error);
    return res.status(500).json({ error: error.message });
  }
};
