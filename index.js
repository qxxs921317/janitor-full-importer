const EXTENSION_NAME = 'janitor-full-importer';
const API_BASE = '/api/plugins/janitor-full-importer';

const PANEL_HTML = `
<div id="janitor-importer-panel" style="padding:10px;">
    <h3>🧹 JanitorAI Full Importer</h3>

    <input
        id="janitor-url-input"
        type="text"
        placeholder="JanitorAI URL 입력"
        style="width:100%;margin-bottom:8px;"
    />

    <button id="janitor-fetch-btn" class="menu_button">
        가져오기
    </button>

    <div id="janitor-status" style="margin-top:8px;"></div>
</div>
`;

function setStatus(msg) {
    const el = document.getElementById('janitor-status');
    if (el) el.textContent = msg;
}

async function fetchCharacter(urlOrId) {
    const uuidMatch = urlOrId.match(/([0-9a-f-]{36})/i);

    if (!uuidMatch) {
        setStatus('❌ UUID 못 찾음');
        return;
    }

    const charId = uuidMatch[1];

    setStatus('⏳ 가져오는 중...');

    try {
        const resp = await fetch(`${API_BASE}/character/${charId}`);
        const data = await resp.json();

        if (!resp.ok) {
            setStatus(`❌ ${data.error || '오류'}`);
            return;
        }

        setStatus(`✅ ${data.character?.name || '로드 완료'}`);

        console.log('[JanitorFullImporter]', data);

    } catch (err) {
        console.error(err);
        setStatus(`❌ ${err.message}`);
    }
}

jQuery(async () => {

    await new Promise(r => setTimeout(r, 1500));

    const target =
        document.querySelector('#extensions_settings') ||
        document.querySelector('#extensions_settings2');

    if (!target) {
        console.error('[JanitorFullImporter] extensions_settings 못 찾음');
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = PANEL_HTML;

    target.appendChild(wrapper);

    $(document).on('click', '#janitor-fetch-btn', () => {
        const value = $('#janitor-url-input').val()?.trim();

        if (value) {
            fetchCharacter(value);
        }
    });

    console.log('[JanitorFullImporter] 로드 완료');
});
