// --- グローバル変数 ---
const pages = document.querySelectorAll('.page');

const STORAGE_KEY = 'dailyRecords';
let dailyRecords = {}; 
let abnormalRecords = [];
let feedChart = null; 

// --- 初期化処理 ---
window.addEventListener('load', () => {
  loadFromStorage();
  // 初期ページを表示
  showPage('home', false);
});

// --- ローカルストレージ操作 ---
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dailyRecords));
}

function loadFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    dailyRecords = JSON.parse(data);
  }
}

// --- ページ切り替え機能 ---
function showPage(pageId, push = true) {
  const target = document.getElementById(pageId);
  if (!target) return;

  pages.forEach(p => p.classList.remove('active'));
  target.classList.add('active');

  // 履歴に追加
  if (push) {
    history.pushState({ page: pageId }, "", "#" + pageId);
  }

  // 管理日誌ページ（日付入力があるページ）に遷移した場合の初期表示
  const dateInput = target.querySelector('input[type="date"]');
  if (dateInput) {
    // 今日をデフォルトに設定（未入力の場合のみ）
    if (!dateInput.value) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
    loadDailyRecord(pageId, dateInput.value);
  }
}

/* ブラウザ戻る / 進む対応 */
window.onpopstate = function (event) {
  if (event.state && event.state.page) {
    showPage(event.state.page, false);
  }
};

// --- ナビゲーション関数 ---
function goHome() { showPage("home"); }
function openPhone() { showPage("phone"); }
function goBack() { history.back(); }
function goForward() { history.forward(); }

// --- 日付変更時の連動処理 ---
function handleDateChange(inputEl) {
  const pageId = inputEl.closest('.page').id;
  const selectedDate = inputEl.value;
  loadDailyRecord(pageId, selectedDate);
}

// --- 保存機能 ---
function saveDailyRecord() {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;

  const pageId = activePage.id;
  const dateInput = activePage.querySelector('input[type="date"]');
  
  if (!dateInput || !dateInput.value) {
    alert('日付を選択してください');
    return;
  }

  const date = dateInput.value;

  // ページごとのデータ保存領域を確保
  if (!dailyRecords[pageId]) {
    dailyRecords[pageId] = {};
  }

  // データの収集 
  dailyRecords[pageId][date] = {
    staff: {
      staff1: activePage.querySelector('.staff-input:nth-of-type(1)')?.value || '',
      staff2: activePage.querySelector('.staff-input:nth-of-type(2)')?.value || '',
    },
    environment: {
      waterTemp: activePage.querySelector('.sheetTemp1')?.value || null,
      roomTemp: activePage.querySelector('.sheetTemp')?.value || null,
      humidity: activePage.querySelector('.sheetHumidity')?.value || null,
      foodTotal: activePage.querySelector('.sheetFood')?.value || null,
    },
    memo: activePage.querySelector('textarea')?.value || '',
    manegmentCheck: activePage.querySelector('.manegment-check')?.checked || false,
    fishData: getFishTableData(activePage)
  };

  saveEnvData({
    area: "カフーの森",
    animal: "シロフクロウ",
    date: document.querySelector('input[type="date"]').value,
    temp: Number(document.querySelector(".sheetTemp")?.value),
    humidity: Number(document.querySelector(".sheetHumidity")?.value),
    food: Number(document.querySelector(".sheetFood")?.value)
  });

  saveToStorage();
  alert(`${date} のデータを保存しました`);
}

/* テーブルデータの取得 */
function getFishTableData(activePage) {
  const rows = activePage.querySelectorAll('.fishTable tr');
  const data = [];

  rows.forEach(row => {
    data.push({
      food: row.querySelector('input.text-food')?.value || '',
      state: row.querySelector('select')?.value || '良好',
      action: row.querySelector('td:last-child input')?.value || ''
    });
  });

  return data;
}

// --- 読み込み機能 ---
function loadDailyRecord(pageId, date) {
  const activePage = document.getElementById(pageId);
  if (!activePage) return;

  // ① 現在の入力項目をリセット
  activePage.querySelectorAll('input:not([type="date"]), textarea, select').forEach(el => {
    if (el.type === 'select-one') el.selectedIndex = 0;
    else el.value = '';
  });

  const record = dailyRecords[pageId]?.[date];
  if (!record) return; // 記録がない場合はリセット状態で終了

  // ② activePage 内の要素にデータを流し込む
  const staffInputs = activePage.querySelectorAll('.staff-input');
  if (staffInputs[0]) staffInputs[0].value = record.staff?.staff1 || '';
  if (staffInputs[1]) staffInputs[1].value = record.staff?.staff2 || '';

  const waterTemp = activePage.querySelector('.sheetTemp1');
  const roomTemp = activePage.querySelector('.sheetTemp');
  const humidity = activePage.querySelector('.sheetHumidity');
  const foodTotal = activePage.querySelector('.sheetFood');
  const animaltable = activePage.querySelector('.fishTable');
  const memo = activePage.querySelector('.sheetMemo');
  const manegmentCheck = activePage.querySelector('.manegment-check');

  if (waterTemp) waterTemp.value = record.environment?.waterTemp || '';
  if (roomTemp) roomTemp.value = record.environment?.roomTemp || '';
  if (humidity) humidity.value = record.environment?.humidity || '';
  if (foodTotal) foodTotal.value = record.environment?.foodTotal || '';
  if (animaltable) animaltable.value = record.environment?.animaltable || '';
  if (memo) memo.value = record.memo || '';
  if (manegmentCheck) manegmentCheck.checked = record.manegmentCheck || false;

  // テーブルデータの復元
  const rows = animaltable.querySelectorAll('tr');
  rows.forEach((row, i) => {
    if (record.fishData && record.fishData[i]) {
      const d = record.fishData[i];
      const inputFood = row.querySelector('input.text-food');
      const selectState = row.querySelector('select');
      const inputAction = row.querySelector('td:last-child input');

      if(inputFood) inputFood.value = d.food || '';
      if(selectState) selectState.value = d.state || '良好';
      if(inputAction) inputAction.value = d.action || '';
    }
  });
}

// --- 検索フィルター機能 ---
function filterAreaButtons() {
  const tag1Value = document.getElementById('tagFilter1').value;
  const tag2Value = document.getElementById('tagFilter2').value;
  const buttons = document.querySelectorAll('#management .sub-button');

  buttons.forEach(btn => {
    const tag1 = btn.dataset.tags1 || '';
    const tag2 = btn.dataset.tags2 || '';
    const matchTag1 = tag1Value === '' || tag1 === tag1Value;
    const matchTag2 = tag2Value === '' || tag2 === tag2Value;
    btn.style.display = (matchTag1 && matchTag2) ? '' : 'none';
  });
}

function filterAnimalButtons() {
  const tag3Value = document.getElementById('tagFilter3').value;
  const buttons = document.querySelectorAll('#management-kahunomori .sub-button2');

  buttons.forEach(btn => {
    const tag3 = btn.dataset.tags3 || '';
    btn.style.display = (tag3Value === '' || tag3 === tag3Value) ? '' : 'none';
  });
}

function filterAnimal2Buttons() {
  const tag4Value = document.getElementById('tagFilter4').value;
  const buttons = document.querySelectorAll('#management-bannaisuisou .sub-button3');

  buttons.forEach(btn => {
    // data-tags3に「第1水槽」などが入っているため、tags3を参照
    const tag4 = btn.dataset.tags3 || '';
    btn.style.display = (tag4Value === '' || tag4 === tag4Value) ? '' : 'none';
  });
}

// 検索ボタン
document.getElementById('searchButton')?.addEventListener('click', filterAreaButtons);
document.getElementById('searchButton2')?.addEventListener('click', filterAnimalButtons);
document.getElementById('searchButton3')?.addEventListener('click', filterAnimal2Buttons);

// --- グラフ・異常値関連 ---
function addFeedData() {
  if(!feedChart) return; 

  const dateInput = document.getElementById('feedDate');
  const valueInput = document.getElementById('feedValue');
  if (!dateInput || !valueInput) return;

  const dateValue = dateInput.value;
  const value = parseFloat(valueInput.value);

  if (!dateValue || Number.isNaN(value)) {
    alert('日にちとデータを入力してください');
    return;
  }

  const isAbnormal = value < 0 || value > 30;
  valueInput.classList.toggle('input-error', isAbnormal);

  const label = new Date(dateValue).toLocaleString();
  feedChart.data.labels.push(label);
  feedChart.data.datasets[0].data.push(value);

  const dataset = feedChart.data.datasets[0];
  if (!dataset.pointBackgroundColor) dataset.pointBackgroundColor = [];
  dataset.pointBackgroundColor.push(isAbnormal ? 'red' : '#4caf50');
  
  if (isAbnormal) {
    abnormalRecords.push({ index: dataset.data.length - 1, label, value });
    // renderAbnormalList は元のコードに定義がないため、必要に応じて追加してください
  }
  feedChart.update();
}

function saveEnvData(newData) {
  const existing =
    JSON.parse(localStorage.getItem("envData")) || [];

  const index = existing.findIndex(d =>
    d.animal === newData.animal &&
    d.area === newData.area &&
    d.date === newData.date
  );

  if (index >= 0) {
    existing[index] = newData; // 更新
  } else {
    existing.push(newData);    // 追加
  }

  localStorage.setItem("envData", JSON.stringify(existing));
}

const LIMITS = {
  "シロフクロウ": {
    temp: { min: 20, max: 26 },
    humidity: { min: 40, max: 70 },
    food: { min: 0.8, max: 1.5 }
  },
  "フンボルトペンギン": {
    temp1: { min: 10, max: 20},
    temp: { min: 18, max: 25 },
    humidity: { min: 50, max: 80 },
    food: { min: 1.5, max: 3.0 }
  },
  "第1水槽": {
    temp1: { min: 20, max: 40 },
    temp: { min: 25, max: 30 },
    humidity: { min: 30, max: 50 },
    food: { min: 0.2, max: 0.5 }
  }
};

function calcAverage(arr) {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

function drawLineChart(canvasId, animal, key, label, min, max, area=null) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const raw = JSON.parse(localStorage.getItem("envData") || "[]");

  const filtered = raw
    .filter(d => d.animal === animal &&
      (!area || d.area === area) && 
      typeof d[key] === "number"
    )
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-5);

  if (filtered.length === 0) return;

  const labels = filtered.map(d => d.date);
  const values = filtered.map(d => d[key]);
  const avg = calcAverage(values);

  const pointColors = values.map(v => {
    if (v > max) return "red";
    if (v < min) return "blue";
    return "#4caf50";
  });

  // 既存Chart破棄
  if (canvas.chart) {
    canvas.chart.destroy();
  }

  canvas.chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label,
          data: values,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: pointColors,
          borderWidth: 2
        },
        {
          label: "平均",
          data: Array(values.length).fill(avg),
          borderDash: [6, 6],
          pointRadius: 0,
          borderColor: "#999"
        },
        {
          label: "下限",
          data: Array(values.length).fill(min),
          borderDash: [4, 4],
          pointRadius: 0,
          borderColor: "blue"
        },
        {
          label: "上限",
          data: Array(values.length).fill(max),
          borderDash: [4, 4],
          pointRadius: 0,
          borderColor: "red"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function renderDataControlCharts() {
  // シロフクロウ
  const shiro = LIMITS["シロフクロウ"];
  drawLineChart("shiro-temp", "シロフクロウ", "temp", "室温", shiro.temp.min, shiro.temp.max);
  drawLineChart("shiro-humidity", "シロフクロウ", "humidity", "湿度", shiro.humidity.min, shiro.humidity.max);
  drawLineChart("shiro-food", "シロフクロウ", "food", "餌量", shiro.food.min, shiro.food.max);

  // ペンギン
  const peng = LIMITS["フンボルトペンギン"];
  drawLineChart("peng-temp1", "フンボルトペンギン", "temp1", "水温", peng.temp1.min, peng.temp1.max);
  drawLineChart("peng-temp", "フンボルトペンギン", "temp", "室温", peng.temp.min, peng.temp.max);
  drawLineChart("peng-humidity", "フンボルトペンギン", "humidity", "湿度", peng.humidity.min, peng.humidity.max);
  drawLineChart("peng-food", "フンボルトペンギン", "food", "餌量", peng.food.min, peng.food.max);

  //第1水槽
  const sw1 = LIMITS["第1水槽"];
  drawLineChart("temp1Chart", "第1水槽", "temp1", "水温(℃)", sw1.temp1.min,sw1.temp1.max);
  drawLineChart("tempChart", "第1水槽", "temp", "室温(℃)",sw1.temp.min,sw1.temp.max);
  drawLineChart("humidityChart", "第1水槽", "humidity", "湿度(%)",sw1.humidity.min,sw1.humidity.max);
  drawLineChart("foodChart", "第1水槽", "food", "給餌量",sw1.food.min,sw1.food.max);
}

function showPage(pageId, push = true) {
  const target = document.getElementById(pageId);
  if (!target) return;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  target.classList.add("active");

  if (push) {
    history.pushState({ page: pageId }, "", "#" + pageId);
  }

  // 日付入力初期化
  const dateInput = target.querySelector('input[type="date"]');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
    loadDailyRecord(pageId, dateInput.value);
  }

  // グラフ描画
  if (pageId === "datacontrol") {
    setTimeout(renderDataControlCharts, 0);
  }
}

function getAbnormalRecords(animal, key, min, max) {
  const data = JSON.parse(localStorage.getItem("envData") || "[]");

  return data.filter(d =>
    d.animal === animal &&
    typeof d[key] === "number" &&
    (d[key] < min || d[key] > max)
  );
}

function renderAbnormalList(animal, key, label, min, max) {
  const list = document.getElementById("abnormalList");
  if (!list) return;

  list.innerHTML = "";

  const records = getAbnormalRecords(animal, key, min, max);

  if (records.length === 0) {
    list.innerHTML = "<li>異常はありません</li>";
    return;
  }

  records.forEach(r => {
    const li = document.createElement("li");

    let status = "";
    if (r[key] > max) status = "上限超過";
    if (r[key] < min) status = "下限未満";

    li.textContent = `${r.date}：${label} ${r[key]}（${status}）`;
    li.style.color = status === "上限超過" ? "red" : "blue";

    list.appendChild(li);
  });
}
