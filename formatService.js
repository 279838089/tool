import { resolveSession, safeJson, json } from './authService.js';

export async function formatContent(request, env) {
  const { user, token } = await resolveSession(request, env);
  if (!user || !token) {
    return json(request, { error: '未登录或登录已过期' }, 401);
  }

  const payload = await safeJson(request);
  const content = (payload?.content || '').trim();
  const tone = (payload?.tone || '').trim();

  if (!content) {
    return json(request, { error: '请提供待排版的正文内容' }, 400);
  }

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return json(request, { error: '服务未配置，请联系管理员' }, 500);
  }

  const systemPrompt = '你是一名专业的微信公众号编辑，擅长对 Markdown 文稿进行精细排版，保持原文核心语义同时提升可读性。输出需为 Markdown 格式，可插入合适的标题、列表、引用、强调等。';
  const userPrompt = [
    '请将下面的公众号文章内容进行排版优化：',
    '1. 保持原有重要信息，不随意增删主题内容；',
    '2. 合理分段，必要时添加小标题；',
    '3. 针对公众号阅读体验优化排版，如引用、强调、编号等；',
    '4. 直接返回排版后的结果，最终输出使用 Markdown。'
  ];

  if (tone) {
    userPrompt.push(`5. 风格倾向：${tone}`);
  }

  userPrompt.push('\n---\n', content);

  let formatted = '';
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Title': 'Wechat Formatter'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt.join('\n') }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter API error:', errText);
      return json(request, { error: '排版服务请求失败，请稍后再试' }, 502);
    }

    const data = await response.json();
    formatted = data?.choices?.[0]?.message?.content?.trim();
    if (!formatted) {
      return json(request, { error: '未能获取排版结果，请稍后再试' }, 502);
    }
  } catch (error) {
    console.error('Fetch OpenRouter error', error);
    return json(request, { error: '排版服务暂时不可用，请稍后重试' }, 502);
  }

  return json(request, {
    success: true,
    formatted,
    user
  });
}
