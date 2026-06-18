class JanitorImporterServer {
    constructor(router) {
        this.router = router;
        this.setupRoutes();
    }

    setupRoutes() {

        this.router.get('/character/:id', async (req, res) => {
            try {

                const charId = req.params.id;

                const response = await fetch(
                    `https://janitorai.com/hampter/characters/${charId}`,
                    {
                        headers: {
                            'User-Agent': 'Mozilla/5.0',
                            'Accept': 'application/json'
                        }
                    }
                );

                const text = await response.text();

                try {
                    const json = JSON.parse(text);
                    res.json(json);
                } catch {
                    res.status(500).json({
                        error: 'JSON 파싱 실패'
                    });
                }

            } catch (err) {

                console.error('[JanitorFullImporter]', err);

                res.status(500).json({
                    error: err.message
                });
            }
        });
    }
}

module.exports = {
    init(router) {
        new JanitorImporterServer(router);
        console.log('[JanitorFullImporter] 서버 로드 완료');
    }
};
