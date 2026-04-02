import L from 'leaflet';

let map;
let currentMode = 'china';

// テーマの初期化
let currentTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        if (theme === 'dark') {
            themeIcon.className = 'ph ph-sun';
        } else {
            themeIcon.className = 'ph ph-moon';
        }
    }
}
applyTheme(currentTheme);

// 地図をリセットする関数
function resetMap() {
    if (!map) return;
    map.eachLayer(layer => {
        if (layer instanceof L.TileLayer || layer instanceof L.GeoJSON || layer instanceof L.Marker || layer instanceof L.CircleMarker) {
            map.removeLayer(layer);
        }
    });

    const tileUrl = currentTheme === 'dark' 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
        attribution: '© OpenStreetMap contributors, © CARTO'
    }).addTo(map);
}

// カスタムアイコンを作成する関数
function createCustomIcon(colorClass = '') {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="pin ${colorClass}"></div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    });
}

function updateProgressCard(label, value, iconClass) {
    const valueEl = document.getElementById('progress-val');
    const labelEl = document.querySelector('.progress-label');
    const iconEl = document.querySelector('.progress-icon i');

    if (valueEl) {
        const parts = value.split(' ');
        if (parts.length > 1 && !isNaN(parts[0])) {
            valueEl.innerHTML = `${parts[0]} <span style="font-size:1rem; font-weight:600; color:var(--text-muted);">${parts.slice(1).join(' ')}</span>`;
        } else {
            valueEl.textContent = value;
        }
    }
    if (labelEl) labelEl.textContent = label;
    if (iconEl && iconClass) iconEl.className = iconClass;
}

// クリックした地域の詳細記録をパネルに表示する関数
function createInfoPanel(event, logs) {
    let popup = document.getElementById('info-popup');
    if (popup) popup.remove();
    if (logs.length === 0) return;

    popup = document.createElement('div');
    popup.id = 'info-popup';
    popup.style.position = 'absolute';
    popup.style.backgroundColor = currentTheme === 'dark' ? 'rgba(26,27,38,0.95)' : 'rgba(255,255,255,0.95)';
    popup.style.border = currentTheme === 'dark' ? '1px solid #333' : '1px solid #ddd';
    popup.style.color = currentTheme === 'dark' ? 'white' : '#1a1b26';
    popup.style.borderRadius = '12px';
    popup.style.padding = '12px 16px';
    popup.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
    popup.style.maxWidth = '90%';
    popup.style.maxHeight = '300px';
    popup.style.overflowY = 'auto';
    popup.style.display = 'flex';
    popup.style.flexDirection = 'column';
    popup.style.gap = '10px';
    popup.style.zIndex = 1000;
    document.body.appendChild(popup);

    const {x, y} = event;
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;

    logs.forEach(log => {
        const row = document.createElement('div');
        row.style.padding = '6px 0';
        row.style.borderBottom = currentTheme === 'dark' ? '1px solid #444' : '1px solid #eee';
        row.style.fontSize = '0.95rem';
        row.style.whiteSpace = 'nowrap';
        row.style.overflow = 'hidden';
        row.style.textOverflow = 'ellipsis';

        const cleanName = log.location ? log.location.split(',')[0].trim() : "不明な場所";
        row.innerHTML = `<a href="shortcuts://run-shortcut?name=FindTripPhotos&input=${log.date}" style="color: #4a90e2; font-weight: bold; margin-right: 12px; text-decoration: none;">${log.date}</a><strong>${cleanName}</strong>`;
        popup.appendChild(row);
    });

    if (popup.lastChild) {
        popup.lastChild.style.borderBottom = 'none';
    }

    setTimeout(() => {
        document.addEventListener('click', function handler(evt) {
            if (!popup.contains(evt.target)) {
                popup.remove();
                document.removeEventListener('click', handler);
            }
        });
    }, 10);
}

// 省の判定に使用する対応リスト
const provinceMapping = {
    "上海": "Shanghai Municipality",
    "北京": "Beijing Municipality",
    "天津": "Tianjin Municipality",
    "重庆": "Chongqing Municipality",
    "重慶": "Chongqing Municipality",
    "河北": "Hebei Province",
    "山西": "Shanxi Province",
    "内蒙古": "Inner Mongolia Autonomous Region",
    "内モンゴル": "Inner Mongolia Autonomous Region",
    "辽宁": "Liaoning Province",
    "遼寧": "Liaoning Province",
    "吉林": "Jilin Province",
    "黑龙江": "Heilongjiang Province",
    "黒竜江": "Heilongjiang Province",
    "江苏": "Jiangsu Province",
    "江蘇": "Jiangsu Province",
    "浙江": "Zhejiang Province",
    "安徽": "Anhui Province",
    "福建": "Fujian Province",
    "江西": "Jiangxi Province",
    "山东": "Shandong Province",
    "山東": "Shandong Province",
    "河南": "Henan Province",
    "湖北": "Hubei Province",
    "湖南": "Hunan Province",
    "广东": "Guangdong Province",
    "広東": "Guangdong Province",
    "广西": "Guangxi Zhuang Autonomous Region",
    "広西": "Guangxi Zhuang Autonomous Region",
    "海南": "Hainan Province",
    "四川": "Sichuan Province",
    "贵州": "Guizhou Province",
    "貴州": "Guizhou Province",
    "云南": "Yunnan Province",
    "雲南": "Yunnan Province",
    "西藏": "Tibet Autonomous Region",
    "西蔵": "Tibet Autonomous Region",
    "陕西": "Shaanxi Province",
    "陝西": "Shaanxi Province",
    "甘肃": "Gansu province",
    "甘粛": "Gansu province",
    "青海": "Qinghai Province",
    "宁夏": "Ningxia Hui Autonomous Region",
    "寧夏": "Ningxia Hui Autonomous Region",
    "新疆": "Xinjiang Uygur Autonomous Region",
    "香港": "Hong Kong Special Administrative Region",
    "澳门": "Macao Special Administrative Region",
    "澳門": "Macao Special Administrative Region",
    "台湾": "Taiwan Province"
};

function getProvinceEn(provinceZh) {
    if (!provinceZh) return null;
    for (let key in provinceMapping) {
        if (provinceZh.includes(key)) {
            return provinceMapping[key];
        }
    }
    return null;
}

// UI Drawer Logic
function setupDrawer() {
    const exploreBtn = document.querySelector('.explore-link');
    const drawer = document.getElementById('journey-drawer');
    const closeBtn = document.getElementById('close-drawer-btn');
    const timelineContainer = document.getElementById('timeline-container');

    if (exploreBtn && drawer && closeBtn) {
        exploreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            renderTimelineLogs(timelineContainer, currentMode);
            drawer.classList.add('open');
            
            // Dynamic Header Updates
            const titlesContainer = drawer.querySelector('.drawer-titles');
            if (titlesContainer) {
                if (currentMode === 'world') {
                    titlesContainer.innerHTML = '<span class="section-subtitle">Timeline Experience</span><h2 class="section-title">Visited Countries</h2>';
                } else {
                    titlesContainer.innerHTML = '<span class="section-subtitle">MY ADVENTURES</span><h2 class="section-title">Journey History</h2>';
                }
            }
        });

        closeBtn.addEventListener('click', () => {
            drawer.classList.remove('open');
        });
    }
}

const flagMapping = {
    "Japan": "jp",
    "China": "cn",
    "South Korea": "kr",
    "United States of America": "us",
    "Taiwan": "tw",
    "Switzerland": "ch",
    "Italy": "it",
    "France": "fr",
    "Germany": "de"
};

function formatToDisplayDate(dateStr) {
  if(!dateStr) return "";
  const d = new Date(dateStr);
  if(isNaN(d.getTime())) return dateStr;
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${monthNames[d.getMonth()]} ${d.getFullYear()}`; // Screenshot just says OCT 2023
}

function renderFlatTimeline(container, logs) {
    if (logs.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No adventures yet.</p>';
        return;
    }

    logs.forEach(log => {
        // Find flag
        const enCountry = countryMapping[log.country] || log.country;
        const isoCode = flagMapping[enCountry];
        let bgStyle = "background-image: linear-gradient(135deg, #4a90e2, #8b5cf6);";
        if (isoCode) {
            bgStyle = `background-image: url('https://flagcdn.com/w80/${isoCode}.png');`;
        }
        
        const shortLocation = log.location ? log.location.split(',')[0].trim() : "Unknown";

        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
            <div class="timeline-node" style="${bgStyle}"></div>
            <div class="timeline-card">
                <div class="timeline-date">${formatToDisplayDate(log.date)}</div>
                <h3 class="timeline-address">${shortLocation}${enCountry ? `, ${enCountry}` : ''}</h3>
                <p class="timeline-memo">${log.memo || "Enjoying the journey."}</p>
                <a href="shortcuts://run-shortcut?name=FindTripPhotos&input=${log.date}" class="photos-btn">
                    <i class="ph-bold ph-image"></i> Photos
                </a>
            </div>
        `;
        container.appendChild(item);
    });
}

function renderTimelineLogs(container, mode) {
    let logs = JSON.parse(localStorage.getItem("travelLogs") || "[]");
    container.innerHTML = '';
    
    // CHINA MODE: Flat list, filtered to China only
    if (mode === 'china') {
        container.classList.remove('grouped-mode');
        logs = logs.filter(log => {
           return (log.country === "中国" || (log.location && log.location.includes("中国")) || log.province_zh);
        });
        logs.sort((a, b) => new Date(b.date) - new Date(a.date));
        renderFlatTimeline(container, logs);
        return;
    }
    
    // WORLD MODE: Grouped by country accordion
    container.classList.add('grouped-mode');
    const logsByCountry = {};
    logs.forEach(log => {
        const enCountry = countryMapping[log.country] || log.country || "Unknown";
        if (!logsByCountry[enCountry]) {
            logsByCountry[enCountry] = [];
        }
        logsByCountry[enCountry].push(log);
    });
    
    const sortedCountries = Object.keys(logsByCountry).sort((a, b) => {
        return logsByCountry[b].length - logsByCountry[a].length;
    });

    if (sortedCountries.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No adventures yet.</p>';
        return;
    }

    // Total Countries Card
    const totalCard = document.createElement('div');
    totalCard.className = 'total-countries-card';
    totalCard.innerHTML = `
      <div class="tcc-text">
         <span class="tcc-label">TOTAL COUNTRIES VISITED</span>
         <span class="tcc-value">${sortedCountries.length < 10 && sortedCountries.length > 0 ? '0' + sortedCountries.length : sortedCountries.length}</span>
      </div>
      <div class="tcc-icon">
         <i class="ph-fill ph-globe-hemisphere-west"></i>
      </div>
    `;
    container.appendChild(totalCard);

    // Render Accordions
    sortedCountries.forEach(country => {
        const countryLogs = logsByCountry[country];
        countryLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const isoCode = flagMapping[country];
        let flagHtml = isoCode 
            ? `<div class="cah-flag" style="background-image: url('https://flagcdn.com/w80/${isoCode}.png')"></div>`
            : `<div class="cah-flag placeholder-flag"></div>`;

        const accItem = document.createElement('div');
        accItem.className = 'country-accordion-item';
        
        const accHeader = document.createElement('div');
        accHeader.className = 'country-accordion-header';
        accHeader.innerHTML = `
           <div class="cah-left">
              ${flagHtml}
              <span class="cah-name">${country}</span>
           </div>
           <div class="cah-right">
              <span class="cah-badge">${countryLogs.length < 10 ? '0' + countryLogs.length : countryLogs.length}</span>
              <div class="cah-icon-wrap"><i class="ph ph-caret-down cah-caret"></i></div>
           </div>
        `;
        
        const accContent = document.createElement('div');
        accContent.className = 'country-accordion-content';
        
        let timelineHtml = '<div class="nested-timeline">';
        countryLogs.forEach(log => {
           const shortLocation = log.location ? log.location.split(',')[0].trim() : "Unknown";
           timelineHtml += `
             <div class="nt-node">
                <div class="nt-dot"></div>
                <div class="nt-body">
                    <div class="nt-header">
                        <h4 class="nt-title">${log.title || shortLocation}</h4>
                        <span class="nt-date">${formatToDisplayDate(log.date)}</span>
                    </div>
                    <div class="nt-location">
                        <i class="ph-fill ph-map-pin"></i> ${shortLocation}
                    </div>
                    <a href="shortcuts://run-shortcut?name=FindTripPhotos&input=${log.date}" class="nt-album-btn">
                        <i class="ph-bold ph-image"></i> VIEW ALBUM
                    </a>
                </div>
             </div>
           `;
        });
        timelineHtml += '</div>';
        accContent.innerHTML = timelineHtml;
        
        accHeader.addEventListener('click', () => {
           accItem.classList.toggle('open');
        });
        
        accItem.appendChild(accHeader);
        accItem.appendChild(accContent);
        container.appendChild(accItem);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    map = L.map('map', { zoomControl: false }).setView([35.8617, 104.1954], 4);
    
    // 右下にズームコントロールを配置
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', currentTheme);
            applyTheme(currentTheme);
            renderCurrentMode();
        });
    }

    const modeButtons = document.querySelectorAll('.mode-selector button');

    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentMode = btn.dataset.mode;
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderCurrentMode();
        });
    });

    setupDrawer();

    // 初回描画
    renderCurrentMode();
});

function renderCurrentMode() {
    resetMap();

    switch (currentMode) {
        case 'world':
            map.setView([35, 105], 2);
            const visitedCountries = getVisitedCountryNamesFromStorage();
            updateProgressCard('COUNTRIES VISITED', `${visitedCountries.length} Nations`, 'ph-fill ph-globe-hemisphere-west');
            renderWorldMode(visitedCountries);
            break;
        
        case 'china':
            map.setView([35.817, 104.1954], 4);
            const logs = JSON.parse(localStorage.getItem("travelLogs") || "[]");
            const visitedProvinces = new Set();
            const pinQueue = [];

            logs.forEach(log => {
                if (log.country !== "中国" && !(log.location && log.location.includes("中国")) && !log.province_zh) return;
                if (log.lat && log.lon) pinQueue.push(log);
                if (log.province_zh) {
                    const provinceEn = getProvinceEn(log.province_zh);
                    if (provinceEn) visitedProvinces.add(provinceEn);
                }
            });

            updateProgressCard('PROVINCES VISITED', `${visitedProvinces.size} Provinces`, 'ph-fill ph-map-pin');
            
            // Highlight regions
            fetch('./china-province.geojson')
                .then(res => res.json())
                .then(geojson => {
                    L.geoJSON(geojson, {
                        style: feature => {
                            const provinceNameEn = feature.properties.name;
                            return visitedProvinces.has(provinceNameEn)
                                ? { fillColor: '#4a90e2', color: '#4a90e2', weight: 1, fillOpacity: 0.3 }
                                : { fillColor: 'transparent', color: currentTheme === 'dark' ? '#555' : '#ccc', weight: 0.5, fillOpacity: 0 };
                        },
                        onEachFeature: (feature, layer) => {
                            layer.on('click', (e) => {
                                const provinceEn = feature.properties.name;
                                const matchingLogs = logs.filter(log => log.province_zh && getProvinceEn(log.province_zh) === provinceEn);
                                createInfoPanel(e.originalEvent, matchingLogs);
                            });
                        }
                    }).addTo(map);
                })
                .catch(err => console.error('GeoJSON Load failed:', err));

            // Drop Pins with stagger
            pinQueue.forEach((log, idx) => {
                const colorClass = idx % 2 === 0 ? '' : 'pin-purple'; // 交互に色を変えるなどのデモ
                L.marker([log.lat, log.lon], { icon: createCustomIcon(colorClass) })
                 .addTo(map)
                 .bindPopup(`<strong>${log.title || log.location}</strong><br>${log.province_zh || ""}`);
            });
            break;
    }
}

function renderWorldMode(visitedCountryNames) {
    fetch('./world-110m.geojson')
    .then(res => res.json())
    .then(geojson => {
        L.geoJSON(geojson, {
            style: feature => {
                const countryName = feature.properties.name;
                if(visitedCountryNames.includes(countryName)) {
                    return { fillColor: '#4a90e2', color: '#4a90e2', weight: 1, fillOpacity: 0.4 };
                } else {
                    return { fillColor: 'transparent', color: currentTheme === 'dark' ? '#555' : '#ccc', weight: 0.5, fillOpacity: 0 };
                }
            },
            onEachFeature: (feature, layer) => {
                layer.on('click', (e) => {
                    const countryName = feature.properties.name;
                    const logs = JSON.parse(localStorage.getItem("travelLogs") || "[]");
                    const matchingLogs = logs.filter(log => log.country === countryName);
                    createInfoPanel(e.originalEvent, matchingLogs);
                });
            }
        }).addTo(map)
    })
    .catch(err => console.error('GeoJSON Load failed:', err));
}

const countryMapping = {
    "中国": "China",
    "日本": "Japan",
    "韩国": "South Korea",
    "韓国": "South Korea",
    "美国": "United States of America",
    "米国": "United States of America",
    "台湾": "Taiwan",
    "台湾省": "Taiwan"
};

function getVisitedCountryNamesFromStorage() {
    const logs = JSON.parse(localStorage.getItem("travelLogs") || "[]");
    const countries = new Set();
    logs.forEach(log => {
        if (log.country) {
            const enName = countryMapping[log.country] || log.country;
            countries.add(enName);
        }
    });
    return Array.from(countries);
}