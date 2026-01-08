// --- グローバル変数 ---
const pages = document.querySelectorAll('.page');

const STORAGE_KEY = 'dailyRecords';
let dailyRecords = {}; // 構造: { pageId: { date: { data... } } }
let abnormalRecords = [];
let feedChart = null; // グラフオブジェクト用

// --- 初期化処理 ---
window.addEventListener('load', () => {
  loadFromStorage();
  // 初期ページ（home）を表示
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
  pages.forEach(p => p.classList.remove('active'));

  const target = document.getElementById(pageId);
  if (!target) return;

  target.classList.add('active');

  // 履歴に追加
  if (push) {
    history.pushState({ page: pageId }, "", "#" + pageId);
  }

  // 管理日誌ページ（日付入力があるページ）に遷移した場合の初期表示
  const dateInput = target.querySelector('input[type="date"]');
  if (dateInput) {
    // 今日をデフォルトに設定
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    loadDailyRecord(pageId, today);
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
    staff1: activePage.querySelector('.staff-input:nth-of-type(1)')?.value || '',
    staff2: activePage.querySelector('.staff-input:nth-of-type(2)')?.value || '',
    temp: activePage.querySelector('#sheetTemp')?.value || '',
    humidity: activePage.querySelector('#sheetHumidity')?.value || '',
    foodTotal: activePage.querySelector('#sheetFood')?.value || '',
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
    // 各生物/個体ごとの行データを取得
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
  const record = (dailyRecords[pageId] && dailyRecords[pageId][date]) ? dailyRecords[pageId][date] : null;

  // フォームへの反映（データがない場合は空にする）
  activePage.querySelector('.staff-input:nth-of-type(1)').value = record?.staff1 || '';
  activePage.querySelector('.staff-input:nth-of-type(2)').value = record?.staff2 || '';
  activePage.querySelector('#sheetTemp').value = record?.temp || '';
  activePage.querySelector('#sheetHumidity').value = record?.humidity || '';
  activePage.querySelector('#sheetFood').value = record?.foodTotal || '';
  activePage.querySelector('textarea').value = record?.memo || '';

  // テーブルデータの復元
  const rows = activePage.querySelectorAll('table[id^="fishTable"] tbody tr');
  rows.forEach((row, i) => {
    const inputFood = row.querySelector('input.text-food');
    const selectState = row.querySelector('select');
    const inputAction = row.querySelector('td:last-child input');

    if (record && record.fishData && record.fishData[i]) {
      const d = record.fishData[i];
      if(inputFood) inputFood.value = d.food || '';
      if(selectState) selectState.value = d.state || '良好';
      if(inputAction) inputAction.value = d.action || '';
    } else {
      if(inputFood) inputFood.value = '';
      if(selectState) selectState.value = '良好';
      if(inputAction) inputAction.value = '';
    }
  });
}

// --- 検索フィルター機能 (既存コードの維持) ---
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

// 検索ボタンへのイベントリスナー登録
const searchBtn1 = document.getElementById('searchButton');
if(searchBtn1) searchBtn1.addEventListener('click', filterAreaButtons);

const searchBtn2 = document.getElementById('searchButton2');
if(searchBtn2) searchBtn2.addEventListener('click', filterAnimalButtons);

// --- グラフ・異常値関連 (既存コードの整理) ---
function addFeedData() {
  if(!feedChart) return; // グラフ未初期化時は処理しない

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
    renderAbnormalList();
  }
  feedChart.update();
}