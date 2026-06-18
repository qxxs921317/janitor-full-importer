/**
 * 🧹 JanitorAI Full Importer - Backend Plugin (server.js)
 * ST 플러그인 표준 포맷: module.exports = { init, info }
 */

'use strict';

/**
 * 플러그인 정보 (ST가 요구하는 필드)
 */
const info = {
    id:          'janitor-full-importer',
    name:        '🧹 JanitorAI Full Importer',
    description: 'JanitorAI 캐릭터 카드 및 로어북 임포터 (전체 그리팅 포함)',
};

/**
 * 플러그인 초기화
 * @param {import('express').Router} router  ST가 제공하는 Express 라우터
 * @returns {Promise<void>}
 */
async function init(router) {
    const fetch = (...args) =>
        import('node-fetch').then(({ default: f }) => f(...args));

    /**
     * GET /api/plugins/janitor-full-importer/character/:id
     */
    router.get('/character/:id', async (req, res) => {
        const charId = req.params.id;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(charId)) {
            return res.status(400).json({ error: '유효하지 않은 캐릭터 ID' });
        }

        const apiUrl = `https://janitorai.com/hampter/characters/${charId}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept':           'application/json, */*',
                    'Accept-Language':  'en-US,en;q=0.9',
                    'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                    'Referer':          `https://janitorai.com/characters/${charId}`,
                    'Origin':           'https://janitorai.com',
                    'sec-fetch-dest':   'empty',
                    'sec-fetch-mode':   'cors',
                    'sec-fetch-site':   'same-origin',
                },
                timeout: 15000,
            });

            if (response.status === 403) {
                return res.status(403).json({
                    error:     'Cloudflare 차단',
                    message:   '서버 요청이 차단되었습니다. JanitorAI에서 직접 export 하세요.',
                    cloudflare: true,
                });
            }

            if (!response.ok) {
                return res.status(response.status).json({
                    error: `JanitorAI API 오류: ${response.status} ${response.statusText}`,
                });
            }

            const data = await response.json();
            return res.json(data);

        } catch (err) {
            console.error('[JanitorFullImporter] character fetch 오류:', err.message);
            return res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/plugins/janitor-full-importer/avatar?url=...
     * 아바타 이미지 프록시 (CORS 우회)
     */
    router.get('/avatar', async (req, res) => {
        const imageUrl = req.query.url;
        if (!imageUrl || !/^https?:\/\//.test(imageUrl)) {
            return res.status(400).json({ error: '유효하지 않은 이미지 URL' });
        }

        try {
            const response = await fetch(imageUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Referer':    'https://janitorai.com/',
                },
                timeout: 10000,
            });

            if (!response.ok) {
                return res.status(response.status).json({ error: `이미지 fetch 실패: ${response.status}` });
            }

            const contentType = response.headers.get('content-type') || 'image/png';
            const buffer      = await response.buffer();
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'max-age=3600');
            return res.send(buffer);

        } catch (err) {
            console.error('[JanitorFullImporter] avatar fetch 오류:', err.message);
            return res.status(500).json({ error: err.message });
        }
    });

    console.log('[🧹 JanitorFullImporter] 백엔드 플러그인 로드됨');
}

module.exports = { init, info };
