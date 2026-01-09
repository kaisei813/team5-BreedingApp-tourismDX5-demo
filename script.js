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
    fishData: getFishTableData(activePage)
  };

  saveToStorage();
  alert(`${date} のデータを保存しました`);
}

/* テーブルデータの取得 */
function getFishTableData(activePage) {
  const rows = activePage.querySelectorAll('table[id^="fishTable"] tbody tr');
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
  const staff1 = activePage.querySelector('.staff-input:nth-of-type(1)');
  const staff2 = activePage.querySelector('.staff-input:nth-of-type(2)');
  if (staff1) staff1.value = record.staff?.staff1 || '';
  if (staff2) staff2.value = record.staff?.staff2 || '';

  const waterTemp = activePage.querySelector('.sheetTemp1');
  const roomTemp = activePage.querySelector('.sheetTemp');
  const humidity = activePage.querySelector('.sheetHumidity');
  const foodTotal = activePage.querySelector('.sheetFood');
  const memo = activePage.querySelector('textarea');

  if (waterTemp) waterTemp.value = record.environment?.waterTemp || '';
  if (roomTemp) roomTemp.value = record.environment?.roomTemp || '';
  if (humidity) humidity.value = record.environment?.humidity || '';
  if (foodTotal) foodTotal.value = record.environment?.foodTotal || '';
  if (memo) memo.value = record.memo || '';

  // テーブルデータの復元
  const rows = activePage.querySelectorAll('table[id^="fishTable"] tbody tr');
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