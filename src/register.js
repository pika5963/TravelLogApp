import '../style.css';

// テーマの設定ロジック
let currentTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeIcon = document.querySelector('#theme-toggle-btn i');
    if (themeIcon) {
        if (theme === 'dark') {
            themeIcon.className = 'ph ph-sun';
        } else {
            themeIcon.className = 'ph ph-moon'; // Actually design has gear icon, but let's sync with theme
        }
    }
}
applyTheme(currentTheme);

// カレンダー表記用のフォーマット (ex: OCT 24, 2023)
function formatToDisplayDate(dateStr) {
  if(!dateStr) return "";
  const d = new Date(dateStr);
  if(isNaN(d.getTime())) return dateStr;
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// 枠線グラデーションのパターン定義
const gradients = [
  'linear-gradient(to bottom, #0ea5e9, #6366f1)', // Blue to Indigo
  'linear-gradient(to bottom, #d946ef, #8b5cf6)', // Fuchsia to Purple
  'linear-gradient(to bottom, #10b981, #3b82f6)', // Emerald to Blue
  'linear-gradient(to bottom, #3b82f6, #8b5cf6)', // Blue to Purple
  'linear-gradient(to bottom, #f59e0b, #ef4444)'  // Amber to Red
];

// DOM読込後に実行
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("travel-form");
  const list = document.getElementById("log-list");
  const locationInput = document.getElementById("location-input");
  const suggestList = document.getElementById("suggest-list");
  
  // 新規追加フォーム部品
  const dateInput = document.getElementById("date-input");
  const titleInput = document.getElementById("title-input");
  const memoInput = document.getElementById("memo-input");
  const editingIdInput = document.getElementById("editing-id");
  const submitBtn = document.getElementById("submit-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");

  const accordionToggle = document.getElementById("form-accordion-toggle");
  const accordionContent = document.getElementById("form-accordion-content");
  const logCountDisplay = document.getElementById("log-count-display");
  const themeToggleBtn = document.getElementById("theme-toggle-btn");

  let selectedLocationData = null;
  let debounceTimer = null;

  // テーマ切替ボタン
  if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
          currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
          localStorage.setItem('theme', currentTheme);
          applyTheme(currentTheme);
      });
  }

  // アコーディオン開閉
  if (accordionToggle && accordionContent) {
    accordionToggle.addEventListener("click", () => {
      accordionToggle.classList.toggle("open");
      accordionContent.classList.toggle("open");
    });
  }

  // フォームリセット用関数
  function resetFormUI() {
    form.reset();
    editingIdInput.value = "";
    selectedLocationData = null;
    submitBtn.innerHTML = '<i class="ph-fill ph-floppy-disk"></i> Save Memory';
    cancelEditBtn.style.display = "none";
    
    // アコーディオンを閉じる
    accordionToggle.classList.remove("open");
    accordionContent.classList.remove("open");
  }

  // キャンセルボタン
  cancelEditBtn.addEventListener("click", () => {
    resetFormUI();
  });

  // ブラウザのlocalStorageに保存されているデータを表示
  loadLogs();

  // サジェスト機能（Debounce処理）
  locationInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    
    if (!query) {
      suggestList.style.display = "none";
      suggestList.innerHTML = "";
      selectedLocationData = null;
      return;
    }

    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1`);
        const data = await res.json();

        suggestList.innerHTML = "";
        if (data.length > 0) {
          data.forEach(item => {
            const div = document.createElement("div");
            div.className = "suggest-item";
            div.textContent = item.display_name;
            
            div.addEventListener("click", () => {
              locationInput.value = item.display_name;
              suggestList.style.display = "none";
              
              const address = item.address || {};
              selectedLocationData = {
                location: item.display_name,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
                country: address.country || "不明",
                province_zh: address.state || ""
              };
            });
            suggestList.appendChild(div);
          });
          suggestList.style.display = "block";
        } else {
          suggestList.style.display = "none";
        }
      } catch (err) {
        console.error("サジェストの取得に失敗しました", err);
      }
    }, 800);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest('.autocomplete-wrapper')) {
      suggestList.style.display = "none";
    }
  });

  // 保存ボタンが押された場合の処理
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    let locationText = formData.get("location");

    // もしサジェストから選択せず直接Submitされた場合のフォールバック処理
    if (!selectedLocationData || selectedLocationData.location !== locationText) {
      try {
        const query = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationText)}&addressdetails=1`;
        const res = await fetch(query);
        const data = await res.json();
        
        if (data.length > 0) {
          const item = data[0];
          const address = item.address || {};
          selectedLocationData = {
            location: locationText, 
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            country: address.country || "不明",
            province_zh: address.state || ""
          };
        } else {
          selectedLocationData = {
            location: locationText,
            lat: null,
            lon: null,
            country: "不明",
            province_zh: ""
          };
        }
      } catch (err) {
        console.error("位置情報の取得に失敗しました", err);
        return;
      }
    }

    const editingId = editingIdInput.value;

    const newLog = {
      id: editingId ? parseInt(editingId) : Date.now(),
      date: formData.get("date"),
      title: formData.get("title"),
      location: selectedLocationData.location,
      memo: formData.get("memo"),
      country: selectedLocationData.country,
      lat: selectedLocationData.lat,
      lon: selectedLocationData.lon,
      province_zh: selectedLocationData.province_zh
    };

    let logs = JSON.parse(localStorage.getItem("travelLogs") || "[]");

    if (editingId) {
      logs = logs.map(log => log.id === newLog.id ? newLog : log);
    } else {
      logs.push(newLog);
    }

    localStorage.setItem("travelLogs", JSON.stringify(logs));

    resetFormUI();
    loadLogs();
  });


  function loadLogs() {
    const logs = JSON.parse(localStorage.getItem("travelLogs") || "[]");
    
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    list.innerHTML = "";
    if (logCountDisplay) {
        logCountDisplay.textContent = `${logs.length} Entries`;
    }

    logs.forEach((log, index) => {
      const div = document.createElement("div");
      div.className = "modern-log-card";
      
      // グラデーションをループで適用
      const gradient = gradients[index % gradients.length];
      div.style.setProperty('--card-gradient', gradient);

      // 都市名だけを取り出す簡易ロジック（例：Tokyo, Japan -> Tokyo）
      const shortLocation = log.location ? log.location.split(',')[0].trim() : "Unknown";
      
      div.innerHTML = `
        <div class="log-card-header">
            <span class="log-date">${formatToDisplayDate(log.date)}</span>
            <div class="location-pill">
                <i class="ph-fill ph-map-pin"></i>
                <span>${shortLocation}</span>
            </div>
        </div>
        <h3 class="log-title">${log.title}</h3>
        <p class="log-snippet">${log.memo || "No description provided."}</p>
        
        <div class="card-actions" style="margin-top:1rem; display:flex; gap:0.5rem; display:none;">
            <button class="edit-btn" style="background:#10b981; color:#fff; border:none; padding:0.4rem 1rem; border-radius:99px; font-size:0.8rem; cursor:pointer;" data-id="${log.id}">編集 / Edit</button>
            <button class="delete-btn" style="background:#ef4444; color:#fff; border:none; padding:0.4rem 1rem; border-radius:99px; font-size:0.8rem; cursor:pointer;" data-id="${log.id}">削除 / Delete</button>
        </div>
      `;

      // クリックでアクション表示/非表示トグル（シンプル化）
      div.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
            const actions = div.querySelector('.card-actions');
            actions.style.display = actions.style.display === 'none' ? 'flex' : 'none';
        }
      });

      // 編集ボタン
      div.querySelector(".edit-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        editingIdInput.value = log.id;
        dateInput.value = log.date;
        titleInput.value = log.title;
        locationInput.value = log.location;
        memoInput.value = log.memo;

        selectedLocationData = {
          location: log.location,
          lat: log.lat,
          lon: log.lon,
          country: log.country,
          province_zh: log.province_zh
        };

        submitBtn.innerHTML = '<i class="ph-fill ph-check-circle"></i> 更新 (Update)';
        cancelEditBtn.style.display = "block";
        
        // アコーディオンを開く
        accordionToggle.classList.add("open");
        accordionContent.classList.add("open");

        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      // 削除ボタン
      div.querySelector(".delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        if(!confirm("Are you sure you want to delete this memory?")) return;

        const cache = JSON.parse(localStorage.getItem("locationCache") || "{}");
        delete cache[log.location];
        localStorage.setItem("locationCache", JSON.stringify(cache));

        const idToDelete = log.id;
        const newLogs = logs.filter(l => l.id !== idToDelete);

        localStorage.setItem("travelLogs", JSON.stringify(newLogs));
        
        if (editingIdInput.value == idToDelete) {
          resetFormUI();
        } else {
          loadLogs();
        }
      });

      list.appendChild(div);
    });
  }

});