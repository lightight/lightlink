function renderCalculator(container) {
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; height:100%; padding:10px;">
            <input type="text" id="calc-display" readonly style="width:100%; padding:20px; font-size:32px; text-align:right; margin-bottom:15px; border:none; border-radius:12px; background:rgba(255,255,255,0.05); color:#fff; backdrop-filter:blur(5px);">
            <div style="flex:1; display:grid; grid-template-columns:repeat(4, 1fr); gap:10px;">
                <button class="calc-btn btn-op" onclick="calcAppend('C')">C</button>
                <button class="calc-btn btn-op" onclick="calcAppend('/')">/</button>
                <button class="calc-btn btn-op" onclick="calcAppend('*')">×</button>
                <button class="calc-btn btn-op" onclick="calcAppend('bs')">⌫</button>
                <button class="calc-btn" onclick="calcAppend('7')">7</button>
                <button class="calc-btn" onclick="calcAppend('8')">8</button>
                <button class="calc-btn" onclick="calcAppend('9')">9</button>
                <button class="calc-btn btn-op" onclick="calcAppend('-')">-</button>
                <button class="calc-btn" onclick="calcAppend('4')">4</button>
                <button class="calc-btn" onclick="calcAppend('5')">5</button>
                <button class="calc-btn" onclick="calcAppend('6')">6</button>
                <button class="calc-btn btn-op" onclick="calcAppend('+')">+</button>
                <button class="calc-btn" onclick="calcAppend('1')">1</button>
                <button class="calc-btn" onclick="calcAppend('2')">2</button>
                <button class="calc-btn" onclick="calcAppend('3')">3</button>
                <button class="calc-btn btn-eq" onclick="calcCalculate()" style="grid-row:span 2;">=</button>
                <button class="calc-btn" onclick="calcAppend('0')" style="grid-column:span 2;">0</button>
                <button class="calc-btn" onclick="calcAppend('.')">.</button>
            </div>
        </div>
        <style>
            .calc-btn { border:1px solid rgba(255,255,255,0.05); border-radius:12px; background:rgba(255,255,255,0.03); color:#fff; font-size:20px; cursor:pointer; transition:0.2s; }
            .calc-btn:hover { background:rgba(255,255,255,0.1); transform:translateY(-2px); }
            .calc-btn:active { transform:scale(0.95); }
            .btn-op { color:#60a5fa; }
            .btn-eq { background:#60a5fa; color:#000; font-weight:bold; }
            .btn-eq:hover { background:#93c5fd; }
        </style>
    `;
    window.calcDisplay = container.querySelector('#calc-display');
}

window.calcAppend = function (val) {
    let d = window.calcDisplay;
    if (val === 'C') d.value = '';
    else if (val === 'bs') d.value = d.value.slice(0, -1);
    else d.value += val;
}

window.calcCalculate = function () {
    try { window.calcDisplay.value = eval(window.calcDisplay.value) || ''; }
    catch { window.calcDisplay.value = 'Error'; }
}

function renderPaint(container) {
    container.innerHTML = `
        <div style="height:100%; display:flex; flex-direction:column;">
            <div style="padding:15px; background:rgba(0,0,0,0.2); display:flex; gap:15px; align-items:center;">
                <input type="color" id="paint-color" value="#ffffff" style="width:40px; height:40px; border:none; border-radius:8px; cursor:pointer;">
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-size:10px; color:#aaa;">Size</span>
                    <input type="range" id="paint-size" min="1" max="20" value="5" style="width:100px;">
                </div>
                <button class="btn" onclick="paintClear()">Clear</button>
                <button class="btn" onclick="paintSave()">Save</button>
            </div>
            <div style="flex:1; position:relative; overflow:hidden; background:#111; cursor:crosshair;" id="paint-area">
                <canvas id="paint-canvas"></canvas>
            </div>
        </div>
        <style>
            .btn { padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff; cursor: pointer; transition: 0.2s; }
            .btn:hover { background: rgba(255,255,255,0.1); }
        </style>
    `;

    const canvas = container.querySelector('#paint-canvas');
    const parent = container.querySelector('#paint-area');
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    const ctx = canvas.getContext('2d');
    let painting = false;

    function startPosition(e) { painting = true; draw(e); }
    function finishedPosition() { painting = false; ctx.beginPath(); }

    function draw(e) {
        if (!painting) return;
        const rect = canvas.getBoundingClientRect();
        ctx.lineWidth = document.getElementById('paint-size').value;
        ctx.lineCap = 'round';
        ctx.strokeStyle = document.getElementById('paint-color').value;
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }

    canvas.addEventListener('mousedown', startPosition);
    canvas.addEventListener('mouseup', finishedPosition);
    canvas.addEventListener('mousemove', draw);

    window.paintClear = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
    window.paintSave = () => {
        const link = document.createElement('a');
        link.download = 'drawing.png';
        link.href = canvas.toDataURL();
        link.click();
    };
}

function renderOSSettings(container) {
    container.style.cssText = 'padding:0; color:#fff; height:100%; overflow-y:auto; background:transparent;';

    if (!document.getElementById('settings-css')) {
        const style = document.createElement('style');
        style.id = 'settings-css';
        style.textContent = `
            .settings-container { max-width: 560px; margin: 0 auto; padding: 32px 24px; }
            .settings-header { margin-bottom: 32px; }
            .settings-header h1 { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.5px; margin-bottom: 4px; }
            .settings-header p { color: rgba(255,255,255,0.4); font-size: 0.85rem; }
            .settings-section { margin-bottom: 28px; }
            .section-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.35); margin-bottom: 12px; font-weight: 600; }
            .setting-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 0; overflow: hidden; }
            .setting-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,0.04); }
            .setting-row.link-row { cursor: pointer; text-decoration: none; color: inherit; transition: background 0.2s; }
            .setting-row.link-row:hover { background: rgba(255,255,255,0.06); }
            .setting-row:last-child { border-bottom: none; }
            .setting-info { flex: 1; margin-right: 16px; }
            .setting-name { font-size: 0.9rem; font-weight: 500; margin-bottom: 2px; }
            .setting-desc { font-size: 0.75rem; color: rgba(255,255,255,0.4); }
            .st-select { background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08); color: #fff; padding: 8px 12px; border-radius: 8px; outline: none; cursor: pointer; min-width: 140px; font-size: 0.85rem; transition: all 0.15s; }
            .st-select:hover { border-color: rgba(255,255,255,0.15); background: rgba(0,0,0,0.35); }
            .st-select:focus { border-color: rgba(255,255,255,0.25); }
            .st-btn { background: rgba(255,255,255,0.08); border: none; color: rgba(255,255,255,0.8); padding: 8px 14px; border-radius: 8px; cursor: pointer; transition: all 0.15s; font-size: 0.85rem; font-weight: 500; }
            .st-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
            .st-btn.danger { background: rgba(239, 68, 68, 0.15); color: #f87171; }
            .st-btn.danger:hover { background: rgba(239, 68, 68, 0.25); }
            @keyframes fadeInUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        `;
        document.head.appendChild(style);
    }

    let proxyVal = localStorage.getItem('light-proxy-transport');
    let searchVal = localStorage.getItem('light-search-engine');

    container.innerHTML = `
        <div class="settings-container">
            <div class="settings-header">
                <h1>Settings</h1>
            </div>

            <div class="settings-section">
                <div class="section-title">Appearance</div>
                <div class="setting-card">
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-name">Tab Style (Beta)</div>
                        </div>
                        <select class="st-select" onchange="window.updateTabLayoutStyle ? window.updateTabLayoutStyle(this.value) : (localStorage.setItem('light-tab-style', this.value), location.reload())">
                            <option value="dots" ${localStorage.getItem('light-tab-style') === 'dots' ? 'selected' : ''}>Compact Dots</option>
                            <option value="default" ${(!localStorage.getItem('light-tab-style') || localStorage.getItem('light-tab-style') === 'default') ? 'selected' : ''}>Top Bar</option>
                            <option value="vertical" ${localStorage.getItem('light-tab-style') === 'vertical' ? 'selected' : ''}>Vertical Sidebar</option>
                            <option value="radial" ${localStorage.getItem('light-tab-style') === 'radial' ? 'selected' : ''}>Radial Arc</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <div class="section-title">Proxy</div>
                <div class="setting-card">
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-name">Proxy Transport</div>
                        </div>
                        <select class="st-select" onchange="switchProxyTransport(this.value)">
                            <option value="uv" ${proxyVal === 'uv' ? 'selected' : ''}>Ultraviolet</option>
                            <option value="scramjet" ${proxyVal !== 'uv' ? 'selected' : ''}>Scramjet</option>
                        </select>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-name">Dynamic Wisp (Requires Restart)</div>
                            <div class="setting-desc">Switches to the BEST avaliable wisp protocol.</div>
                        </div>
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                            <input type="checkbox" id="dynamic-wisp-toggle" 
                                   ${localStorage.getItem('light-dynamic-wisp') !== 'false' ? 'checked' : ''}
                                   onchange="localStorage.setItem('light-dynamic-wisp', this.checked); if(this.checked) localStorage.removeItem('light-wss-url'); location.reload();"
                                   style="width:18px; height:18px; accent-color:#60a5fa;">
                        </label>
                    </div>
                    <div class="setting-row" id="wisp-url-row" style="${localStorage.getItem('light-dynamic-wisp') !== 'false' ? 'display:none' : ''}">
                        <div class="setting-info">
                            <div class="setting-name">Wisp Server</div>
                            <div class="setting-desc">Custom server URL (leave blank for default).</div>
                        </div>
                        <input type="text" class="st-select" placeholder="wss://wisp.lightlink.space" 
                                value="${localStorage.getItem('light-wss-url') || ''}"
                                onchange="window.updateWisp ? window.updateWisp(this.value) : localStorage.setItem('light-wss-url', this.value)"
                                style="width: 180px;">
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-name">Search Engine</div>
                            <div class="setting-desc">DuckDuckGo is default.</div>
                        </div>
                        <select class="st-select" onchange="localStorage.setItem('light-search-engine', this.value)">
                            <option value="duckduckgo" ${searchVal !== 'google' && searchVal !== 'bing' ? 'selected' : ''}>DuckDuckGo</option>
                            <option value="google" ${searchVal === 'google' ? 'selected' : ''}>Google</option>
                            <option value="bing" ${searchVal === 'bing' ? 'selected' : ''}>Bing</option>
                        </select>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-name">Close Warning</div>
                        </div>
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                            <input type="checkbox" id="close-warning-toggle" 
                                   ${localStorage.getItem('light-close-warning') === 'true' ? 'checked' : ''}
                                   onchange="localStorage.setItem('light-close-warning', this.checked)"
                                   style="width:18px; height:18px; accent-color:#60a5fa;">
                        </label>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <div class="section-title">Cloak</div>
                <div class="setting-card">
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-name">Off-screen Cloak</div>
                            <div class="setting-desc">Enable cloak when the cursor leaves the window.</div>
                        </div>
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                            <input type="checkbox" id="cloak-toggle" 
                                   ${localStorage.getItem('light-cloak-enabled') === 'true' ? 'checked' : ''}
                                   onchange="localStorage.setItem('light-cloak-enabled', this.checked); if(this.checked) alert('Cloak enabled: It works when your cursor leaves the window. Click anywhere when it opens to exit it.');"
                                   style="width:18px; height:18px; accent-color:#60a5fa;">
                        </label>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-name">Cloak URL</div>
                            <div class="setting-desc">The URL to display when cloaked.</div>
                        </div>
                        <input type="text" class="st-select" placeholder="https://google.com" 
                                value="${localStorage.getItem('light-cloak-url') || 'https://google.com'}"
                                onchange="localStorage.setItem('light-cloak-url', this.value)"
                                style="width: 180px;">
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <div class="section-title">Saving</div>
                <div class="setting-card">
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-name">Export Data</div>
                            <div class="setting-desc">Download your .lightdata file</div>
                        </div>
                        <button class="st-btn" onclick="exportLightData()">Export</button>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-name">Import Data</div>
                            <div class="setting-desc">Restore from a .lightdata file.</div>
                        </div>
                        <label class="st-btn" style="cursor:pointer;">
                            Import
                            <input type="file" accept=".lightdata" style="display:none;" onchange="importLightData(this.files[0])">
                        </label>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-name">Reset Everything</div>
                            <div class="setting-desc">Mainly just fixes proxies if they break.</div>
                        </div>
                        <button class="st-btn danger" onclick="if(confirm('Reset all data?')){localStorage.clear(); location.reload();}">Reset</button>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <div class="section-title">Feedback</div>
                <div class="setting-card">
                    <div class="setting-row" style="flex-direction:column; align-items:stretch; gap:12px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="setting-info" style="margin-right:0;">
                                <div class="setting-name">Send Feedback</div>
                            </div>
                            <select class="st-select" id="feedback-type" style="min-width:120px;">
                                <option value="General">General</option>
                                <option value="Bug Report">Bug Report</option>
                                <option value="Feature Request">Feature Request</option>
                            </select>
                        </div>
                        <textarea id="feedback-message" placeholder="What do you think can be changed..." 
                            style="width:100%; min-height:100px; padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.25); color:#fff; font-family:inherit; font-size:0.85rem; resize:vertical; outline:none;"
                            maxlength="2000"></textarea>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span id="feedback-status" style="font-size:0.75rem; color:rgba(255,255,255,0.4);"></span>
                            <button class="st-btn" id="send-feedback-btn" onclick="sendFeedback()">
                                <i class="ri-send-plane-line" style="margin-right:6px;"></i>Send Feedback
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <div class="section-title">Credits</div>
                <div class="setting-card">
                    <a href="https://github.com/titaniumnetwork-dev/Ultraviolet-App" target="_blank" class="setting-row link-row">
                        <div class="setting-info">
                            <div class="setting-name">Ultraviolet App</div>
                            <div class="setting-desc">Helped for Ultraviolet Proxy</div>
                        </div>
                        <i class="ri-external-link-line" style="color:rgba(255,255,255,0.3)"></i>
                    </a>
                    <a href="https://github.com/MercuryWorkshop/scramjet-app" target="_blank" class="setting-row link-row">
                        <div class="setting-info">
                            <div class="setting-name">Scramjet App</div>
                            <div class="setting-desc">Helped for Scramjet Proxy</div>
                        </div>
                        <i class="ri-external-link-line" style="color:rgba(255,255,255,0.3)"></i>
                    </a>
                    <a href="https://remixicon.com/" target="_blank" class="setting-row link-row">
                        <div class="setting-info">
                            <div class="setting-name">Remix Icons</div>
                            <div class="setting-desc">Helped with icons in frontend</div>
                        </div>
                        <i class="ri-external-link-line" style="color:rgba(255,255,255,0.3)"></i>
                    </a>
                    <a href="https://github.com/MercuryWorkshop/scramjet" target="_blank" class="setting-row link-row">
                        <div class="setting-info">
                            <div class="setting-name">Scramjet</div>
                            <div class="setting-desc">Helped for Scramjet Proxy</div>
                        </div>
                        <i class="ri-external-link-line" style="color:rgba(255,255,255,0.3)"></i>
                    </a>
                    <a href="https://github.com/titaniumnetwork-dev/Ultraviolet" target="_blank" class="setting-row link-row">
                        <div class="setting-info">
                            <div class="setting-name">Ultraviolet</div>
                            <div class="setting-desc">Helped for Ultraviolet Proxy</div>
                        </div>
                        <i class="ri-external-link-line" style="color:rgba(255,255,255,0.3)"></i>
                    </a>
                    <a href="https://nowgg.fun/" target="_blank" class="setting-row link-row">
                        <div class="setting-info">
                            <div class="setting-name">Froggies Arcade</div>
                            <div class="setting-desc">Helped for specific games</div>
                        </div>
                        <i class="ri-external-link-line" style="color:rgba(255,255,255,0.3)"></i>
                    </a>
                    <a href="https://niftybuttons.com/" target="_blank" class="setting-row link-row">
                        <div class="setting-info">
                            <div class="setting-name">NiftyButtons</div>
                            <div class="setting-desc">Helped for specific icons</div>
                        </div>
                        <i class="ri-external-link-line" style="color:rgba(255,255,255,0.3)"></i>
                    </a>
                        <a href="https://github.com/vercel/geist-font" target="_blank" class="setting-row link-row">
                        <div class="setting-info">
                            <div class="setting-name">Giest Font</div>
                            <div class="setting-desc">Helped for font</div>
                        </div>
                        <i class="ri-external-link-line" style="color:rgba(255,255,255,0.3)"></i>
                    </a>
                        <a href="https://wttr.in/" target="_blank" class="setting-row link-row">
                        <div class="setting-info">
                            <div class="setting-name">wttr.in</div>
                            <div class="setting-desc">Helped for weather</div>
                        </div>
                        <i class="ri-external-link-line" style="color:rgba(255,255,255,0.3)"></i>
                    </a>
                        <a href="https://open-meteo.com/" target="_blank" class="setting-row link-row">
                        <div class="setting-info">
                            <div class="setting-name">Open-Meteo</div>
                            <div class="setting-desc">Helped for weather (fallback)</div>
                        </div>
                        <i class="ri-external-link-line" style="color:rgba(255,255,255,0.3)"></i>
                    </a>
                </div>
            </div>
        </div>
    `;

    if (window.makeMagnetic) {
        container.querySelectorAll('.st-btn, .st-select').forEach(window.makeMagnetic);
    }
}

function exportLightData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('light-')) {
            data[key] = localStorage.getItem(key);
        }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'settings.lightdata';
    a.click();
    URL.revokeObjectURL(url);
}

function importLightData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            for (const [key, value] of Object.entries(data)) {
                if (key.startsWith('light-')) {
                    localStorage.setItem(key, value);
                }
            }
            location.reload();
        } catch {
            alert('Invalid file');
        }
    };
    reader.readAsText(file);
}

async function sendFeedback() {
    const messageEl = document.getElementById('feedback-message');
    const typeEl = document.getElementById('feedback-type');
    const statusEl = document.getElementById('feedback-status');
    const btnEl = document.getElementById('send-feedback-btn');

    const message = messageEl.value.trim();
    const feedbackType = typeEl.value;
    const username = localStorage.getItem('void_username') || null;

    if (!message) {
        statusEl.textContent = 'Please enter a message';
        statusEl.style.color = '#f87171';
        return;
    }

    btnEl.disabled = true;
    btnEl.innerHTML = '<i class="ri-loader-4-line" style="margin-right:6px; animation: spin 1s linear infinite;"></i>Sending...';
    statusEl.textContent = '';

    try {
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, feedbackType, username })
        });

        const data = await response.json();

        if (data.success) {
            statusEl.textContent = '✓ Feedback sent! Thank you.';
            statusEl.style.color = '#4ade80';
            messageEl.value = '';
        } else {
            statusEl.textContent = data.error || 'Failed to send feedback';
            statusEl.style.color = '#f87171';
        }
    } catch (error) {
        statusEl.textContent = 'Network error. Please try again.';
        statusEl.style.color = '#f87171';
    }

    btnEl.disabled = false;
    btnEl.innerHTML = '<i class="ri-send-plane-line" style="margin-right:6px;"></i>Send Feedback';
}

async function switchProxyTransport(value) {
    localStorage.setItem('light-proxy-transport', value);

    if (!('serviceWorker' in navigator)) {
        location.reload();
        return;
    }

    try {
        // Unregister existing service workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
            await reg.unregister();
        }

        // Register the new service worker based on selected transport
        const swPath = value === 'uv' ? '/uv.worker.js' : '/sj.worker.js';
        const registration = await navigator.serviceWorker.register(swPath, { scope: '/' });

        // Wait for it to be ready
        if (registration.installing) {
            await new Promise((resolve) => {
                registration.installing.addEventListener('statechange', (e) => {
                    if (e.target.state === 'activated') resolve();
                });
                setTimeout(resolve, 3000); // Timeout fallback
            });
        }

        // Wait for controller
        if (!navigator.serviceWorker.controller) {
            await new Promise((resolve) => {
                const timeout = setTimeout(resolve, 2000);
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });
            });
        }

        console.log(`Switched to ${value} proxy`);

        // Reinitialize proxy if needed
        if (value === 'scramjet' && window.initScramjetController) {
            await window.initScramjetController();
        }

    } catch (e) {
        console.error('Failed to switch proxy:', e);
        location.reload(); // Fallback to reload
    }
}
