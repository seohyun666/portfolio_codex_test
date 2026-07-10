const OWNER = 'seohyun666';
const REPO  = 'portfolio_codex_test';
const PATH  = 'data/projects.json';

async function getProjects(token) {
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
  );
  if (!res.ok) throw new Error('GitHub fetch failed: ' + res.status);
  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf8');
  return { projects: JSON.parse(content), sha: data.sha };
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'GITHUB_TOKEN not set' }) };
  }

  // ── POST: 로그인 또는 저장
  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

    // 비밀번호 검증
    const adminPw = process.env.ADMIN_PASSWORD;
    if (!adminPw || body.password !== adminPw) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // 로그인 액션: projects.json 읽어서 반환
    if (body.action === 'login') {
      try {
        const { projects } = await getProjects(token);
        return { statusCode: 200, headers, body: JSON.stringify({ projects }) };
      } catch(e) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
      }
    }

    // 저장 액션: projects.json 업데이트
    if (body.projects) {
      try {
        const { sha } = await getProjects(token);
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
      } catch(e) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
      }
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
