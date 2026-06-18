const fetch = require('node-fetch');

class JanitorImporterServer {
    constructor(router) {
        this.router = router;
        this.setupRoutes();
    }

    setupRoutes() {
        // 1. 캐릭터 아바타 PNG 프록시 가져오기
        this.router.get('/avatar', async (req, res) => {
            try {
                const avatarUrl = req.query.url;
                if (!avatarUrl) {
                    return res.status(400).send('URL이 제공되지 않았습니다.');
                }

                // 일반 브라우저인 것처럼 속이는 헤더 (차단 방지용)
                const response = await fetch(avatarUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                    }
                });

                if (!response.ok) {
                    throw new Error(`이미지를 가져오는 중 오류 발생: ${response.status}`);
                }

                const buffer = await response.buffer();
                const contentType = response.headers.get('content-type') || 'image/png';

                res.setHeader('Content-Type', contentType);
                res.send(buffer);
            } catch (error) {
                console.error('[JanitorImporter] 아바타 다운로드 실패:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // 2. 캐릭터 전체 JSON API 가져오기
        this.router.get('/character/:id', async (req, res) => {
            try {
                const charId = req.params.id;
                // JanitorAI 내부 API 엔드포인트
                const url = `https://janitorai.com/hampter/characters/${charId}`;

                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/json',
                        'Referer': `https://janitorai.com/characters/${charId}_character`
                    }
                });

                // Cloudflare 봇 차단 (403 또는 헤더 확인)
                if (response.status === 403 || (response.headers.get('server') && response.headers.get('server').includes('cloudflare'))) {
                    // 응답이 JSON인지 먼저 시도
                    const text = await response.text();
                    try {
                        const json = JSON.parse(text);
                        return res.json(json);
                    } catch (e) {
                        // JSON이 아니면 Cloudflare 차단 페이지(HTML)로 간주
                        return res.status(403).json({ cloudflare: true, error: 'Cloudflare 보안에 의해 요청이 차단되었습니다.' });
                    }
                }

                if (!response.ok) {
                    throw new Error(`API 응답 오류: ${response.status}`);
                }

                const data = await response.json();
                res.json(data);
            } catch (error) {
                console.error('[JanitorImporter] 캐릭터 API 요청 실패:', error);
                res.status(500).json({ error: error.message });
            }
        });
    }
}

// 실리태번 확장 모듈 초기화 진입점
module.exports = {
    init: function (router) {
        new JanitorImporterServer(router);
        console.log('[JanitorFullImporter] 서버 측 라우터 초기화 완료!');
    }
};