const OWNER = 'seohyun666';
const REPO  = 'portfolio_codex_test';
const PATH  = 'data/projects.json';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Token not configured' }) };
  }

  // ── GET: 현재 projects.json 읽기
  if (event.httpMethod === 'GET') {
    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
    );
    if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: 'Failed to fetch' }) };
    const data = await res.json();
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    return { statusCode: 200, headers, body: JSON.stringify({ projects: JSON.parse(content), sha: data.sha }) };
  }

  // ── POST: projects.json 업데이트
  if (event.httpMethod === 'POST') {
    // 관리자 비밀번호 체크
    const body = JSON.parse(event.body || '{}');
    if (body.password !== process.env.ADMIN_PASSWORD) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // 현재 SHA 가져오기
    const shaRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
    );
    const shaData = await shaRes.json();
    const sha = shaData.sha;

    // 업데이트
    const newContent = Buffer.from(JSON.stringify(body.projects, null, 2)).toString('base64');
    const updateRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Update projects.json via admin',
          content: newContent,
          sha,
        }),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.json();
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
