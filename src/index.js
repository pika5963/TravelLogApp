import L from 'leaflet';

// 地図をリセットする関数
function resetMap(map) {
    map.eachLayer(layer => {
        if (layer instanceof L.TileLayer || layer instanceof L.GeoJSON) {
            map.removeLayer(layer);
        }
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors, © CARTO'
    }).addTo(map);
}

// クリックした地域の詳細記録をパネルに表示する関数
function createInfoPanel(event, logs) {
    let popup = document.getElementById('info-popup');
    if (popup) popup.remove();
    if (logs.length === 0) return;

    popup = document.createElement('div');
    popup.id = 'info-popup';
    popup.style.position = 'absolute';
    popup.style.backgroundColor = 'rgba(0,0,0,0.85)';
    popup.style.border = '1px solid #444';
    popup.style.color = 'white';
    popup.style.borderRadius = '8px';
    popup.style.padding = '10px';
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
        row.style.borderBottom = '1px solid #555';
        row.style.fontSize = '0.95rem';
        row.style.whiteSpace = 'nowrap';
        row.style.overflow = 'hidden';
        row.style.textOverflow = 'ellipsis';

        // 最初のコンマまでを取得して名称のみにする（例：四姑娘山镇, 小金县... -> 四姑娘山镇）
        const cleanName = log.location ? log.location.split(',')[0].trim() : "不明な場所";
        
        // 日付をタップ可能なショートカット連携リンクにする
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

// 省の判定に使用する対応リスト（簡体字を含むように拡張）
const provinceMapping = {
    "上海": "Shanghai Municipality",
    "北京": "Beijing Municipality",
    "天津": "Tianjin Municipality",
    "重庆": "Chongqing Municipality", // 重慶（簡体字）
    "重慶": "Chongqing Municipality",
    "河北": "Hebei Province",
    "山西": "Shanxi Province",
    "内蒙古": "Inner Mongolia Autonomous Region", // 内モンゴル（簡体字）
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
    let match = null;
    for (let key in provinceMapping) {
        if (provinceZh.includes(key)) {
            match = provinceMapping[key];
            break;
        }
    }
    return match;
}

document.addEventListener("DOMContentLoaded", () => {
    const map = L.map('map').setView([35.8617, 104.1954], 4);
    resetMap(map);

    const infoPanel = document.createElement('div');
    infoPanel.id = 'info-panel';
    document.body.appendChild(infoPanel);

    const modeButtons = document.querySelectorAll('.mode-buttons button');

    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            switch (mode) {
                // 世界表示
                case 'world':
                    map.setView([20, 0], 2);
                    resetMap(map);
                    const visitedCountries = getVisitedCountryNamesFromStorage();
                    renderWorldMode(map, visitedCountries);
                    break;
                
                // 中国表示
                case 'china':
                    map.setView([35.817, 104.1954], 4);
                    resetMap(map);

                    const logs = JSON.parse(localStorage.getItem("travelLogs") || "[]");
                    const visitedProvinces = new Set();
                    const pinQueue = [];

                    logs.forEach(log => {
                        // 中国以外の記録はスキップ（国名が中国、もしくは地名に中国が含まれているか、省名データがあるもの）
                        if (log.country !== "中国" && !(log.location && log.location.includes("中国")) && !log.province_zh) return;

                        if (log.lat && log.lon) {
                            pinQueue.push(log);
                        }
                        
                        // province
                        if (log.province_zh) {
                            const provinceEn = getProvinceEn(log.province_zh);
                            if (provinceEn) {
                                visitedProvinces.add(provinceEn);
                            }
                        }
                    });
                    
                    pinQueue.forEach(log => {
                        L.circleMarker([log.lat, log.lon], {
                            radius: 6,
                            fillColor: '#4a90e2',
                            color: '#3366cc',
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.6
                        }).addTo(map).bindPopup(`<strong>${log.title || log.location}</strong><br>${log.province_zh || ""}`);
                    });

                    fetch('./china-province.geojson')
                        .then(res => res.json())
                        .then(geojson => {
                            L.geoJSON(geojson, {
                                style: feature => {
                                    const provinceNameEn = feature.properties.name;
                                    return visitedProvinces.has(provinceNameEn)
                                        ? { fillColor: '#4a90e2', color: '#3366cc', weight: 1, fillOpacity: 0.6 }
                                        : { fillColor: '#e0e0e0', color: '#cccccc', weight: 0.5, fillOpacity: 0.2 };
                                },
                                onEachFeature: (feature, layer) => {
                                    layer.on('click', (e) => {
                                        const provinceEn = feature.properties.name;
                                        const matchingLogs = logs.filter(log => {
                                            if(!log.province_zh) return false;
                                            return getProvinceEn(log.province_zh) === provinceEn;
                                        });
                                        createInfoPanel(e.originalEvent, matchingLogs);
                                    });
                                }
                            }).addTo(map);
                        })
                        .catch(err => console.error('中国地図のGeoJSON読込に失敗しました:', err));
                    break;
                
                case 'japan':
                    map.setView([36.2048, 138.2539], 5);
                    resetMap(map);
                    break;
            }
        });       
    });

    // 初回ロード時は中国モードをデフォルト化する
    const chinaButton = document.querySelector('button[data-mode="china"]');
    if (chinaButton) {
        chinaButton.click();
    }
})

function renderWorldMode(map, visitedCountryNames) {
    fetch('./world-110m.geojson')
    .then(res => res.json())
    .then(geojson => {
        L.geoJSON(geojson, {
            style: feature => {
                const countryName = feature.properties.name;
                if(visitedCountryNames.includes(countryName)) {
                    return { fillColor: '#4a90e2', color: '#3366cc', weight: 1, fillOpacity: 0.6 };
                } else {
                    return { fillColor: '#e0e0e0', color: '#cccccc', weight: 0.5, fillOpacity: 0.2 };
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
    .catch(err => console.error('世界地図の読み込みに失敗しました:', err));
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
            // マッピングがあれば英語名に、なければそのまま使用
            const enName = countryMapping[log.country] || log.country;
            countries.add(enName);
        }
    });
    return Array.from(countries);
}