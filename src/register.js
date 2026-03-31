import '../style.css';

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

  let selectedLocationData = null;
  let debounceTimer = null;

  // フォームリセット用関数
  function resetFormUI() {
    form.reset();
    editingIdInput.value = "";
    selectedLocationData = null;
    submitBtn.textContent = "保存";
    cancelEditBtn.style.display = "none";
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
    
    // 入力が空になったらリストを消す
    if (!query) {
      suggestList.style.display = "none";
      suggestList.innerHTML = "";
      selectedLocationData = null;
      return;
    }

    // 以前のタイマーをクリア
    clearTimeout(debounceTimer);

    // 800ms後に入力が止まっていればフェッチする
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
            
            // 候補をクリックしたときの処理
            div.addEventListener("click", () => {
              locationInput.value = item.display_name; // 入力欄に名前を反映
              suggestList.style.display = "none";      // リストを隠す
              
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

  // サジェストリストの外側をクリックしたら閉じる
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
            location: locationText, // ユーザー入力を優先
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            country: address.country || "不明",
            province_zh: address.state || ""
          };
        } else {
          // 見つからない場合は最低限のデータで作成
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

    // 記録の作成(フォーム送信データ + サジェストで取得したデータ)
    const newLog = {
      id: editingId ? parseInt(editingId) : Date.now(), // 更新時は元のIDを保持
      date: formData.get("date"),
      title: formData.get("title"),
      location: selectedLocationData.location,
      memo: formData.get("memo"),
      country: selectedLocationData.country,
      lat: selectedLocationData.lat,
      lon: selectedLocationData.lon,
      province_zh: selectedLocationData.province_zh
    };

    // localStorageに保存されているデータを配列として取り出す
    let logs = JSON.parse(localStorage.getItem("travelLogs") || "[]");

    if (editingId) {
      // 既存の記録を更新
      logs = logs.map(log => log.id === newLog.id ? newLog : log);
    } else {
      // 現在の記録配列に、新しい記録を追加
      logs.push(newLog);
    }

    // 再び配列をJSON文字列に変換してlocalStorageに保存
    localStorage.setItem("travelLogs", JSON.stringify(logs));

    resetFormUI();
    loadLogs();
  });


  function loadLogs() {
    const logs = JSON.parse(localStorage.getItem("travelLogs") || "[]");
    
    // 日付の新しい順に並び替え
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    list.innerHTML = "";

    logs.forEach((log) => {
      const div = document.createElement("div");
      div.className = "log-card";

      // 緯度経度の表示があれば追加
      const coordText = (log.lat && log.lon) ? `<br><small>(${log.lat.toFixed(4)}, ${log.lon.toFixed(4)})</small>` : "";

      div.innerHTML = `
        <h3>${log.title} (<a href="shortcuts://run-shortcut?name=FindTripPhotos&input=${log.date}" style="color: #4a90e2; text-decoration: none;">${log.date}</a>)</h3>
        <p><strong>場所:</strong> ${log.location} ${coordText}</p>
        <p>${log.memo}</p>
        <p><strong>国:</strong> ${log.country} <strong>省:</strong> ${log.province_zh || "なし"}</p>
        <div>
          <button class="edit-btn" data-id="${log.id}">編集</button>
          <button class="delete-btn" data-id="${log.id}">削除</button>
        </div>
      `;

      // 編集ボタンのイベント
      div.querySelector(".edit-btn").addEventListener("click", () => {
        // UIにデータをセット
        editingIdInput.value = log.id;
        dateInput.value = log.date;
        titleInput.value = log.title;
        locationInput.value = log.location;
        memoInput.value = log.memo;

        // 検索や上書きをしないよう内部データを復元
        selectedLocationData = {
          location: log.location,
          lat: log.lat,
          lon: log.lon,
          country: log.country,
          province_zh: log.province_zh
        };

        // ボタンの表示切替
        submitBtn.textContent = "更新";
        cancelEditBtn.style.display = "block";

        // フォームまでスクロール
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      // 削除ボタンのイベント
      div.querySelector(".delete-btn").addEventListener("click", () => {
        // キャッシュから削除 (後方互換用)
        const cache = JSON.parse(localStorage.getItem("locationCache") || "{}");
        delete cache[log.location];
        localStorage.setItem("locationCache", JSON.stringify(cache));

        const idToDelete = log.id;
        const newLogs = logs.filter(l => l.id !== idToDelete);

        localStorage.setItem("travelLogs", JSON.stringify(newLogs));
        
        // もし現在編集中のものを削除したならフォームをリセット
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