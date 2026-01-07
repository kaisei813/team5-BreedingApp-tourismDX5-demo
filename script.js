const pages = document.querySelectorAll('.page');

let pointColors = [];
let abnormalRecords = [];
const STORAGE_KEY = 'dailyRecords';
let dailyRecords = {};
let currentDate = '';

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dailyRecords));
}

function loadFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    dailyRecords = JSON.parse(data);
  }
}

/*ページ切替（履歴＋グラフ対応）*/
function showPage(pageId, push = true) {
  pages.forEach(p => p.classList.remove('active'));

  const target = document.getElementById(pageId);
  if (!target) return;

  target.classList.add('active');

  // 履歴に追加
  if (push) {
    history.pushState({ page: pageId }, "", "#" + pageId);
  }
}


/* フッターボタン */
function goHome() {
  showPage("home");
}

function openPhone() {
  showPage("phone");
}

function goBack() {
  history.back();
}

function goForward() {
  history.forward();
}

/* ブラウザ戻る / 進む対応*/
window.onpopstate = function (event) {
  if (event.state && event.state.page) {
    showPage(event.state.page, false);
  }
};


function filterDepartmentButtons() {
  const keyword = document.getElementById('searchInput').value.toLowerCase();
  const selectedTag = document.getElementById('tagFilter1').value;
  const selectedTag2 = document.getElementById('tagFilter2').value;

  const buttons = document.querySelectorAll('#departmentButtons .sub-button');

  buttons.forEach(btn => {
    const name = btn.dataset.name.toLowerCase();
    const tags = btn.dataset.tags.toLowerCase();

    const matchName = name.includes(keyword);
    const matchTag = !selectedTag || tags.includes(selectedTag);
    const matchTag2 = !selectedTag2 || tags.includes(selectedTag2);

    if (matchName && matchTag && matchTag2) {
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
  });
}


/*データ追加*/
function addFeedData() {
  
  if(!feedChart){
    initFeedChart();
  }
  const dateInput = document.getElementById('feedDate');
  const valueInput = document.getElementById('feedValue');

  if (!dateInput || !valueInput) {
    alert('魚類ページを開いてから入力してください');
    return;
  }

  const dateValue = dateInput.value;
  const value = parseFloat(valueInput.value);

  console.log('date:', dateValue, 'value:', value);

  if (!dateValue || Number.isNaN(value)) {
    alert('日にちとデータを入力してください');
    return;
  }

  const isAbnormal = value < 0 || value > 30;

  /*異常値チェック*/
  valueInput.classList.remove('input-error');

  if (value < 0 || value > 30) {
    valueInput.classList.add('input-error');
  }

  // 今日の「今の時刻」を自動で付与
  const now = new Date();
  const date = new Date(dateValue);
  date.setHours(now.getHours(), now.getMinutes(), 0);

  const label = date.toLocaleString();

  feedChart.data.labels.push(label);
  feedChart.data.datasets[0].data.push(value);

  const dataset = feedChart.data.datasets[0];
  if (!dataset.pointBackgroundColor) {
    dataset.pointBackgroundColor = [];
    dataset.pointBorderColor = [];
  }

  feedChart.data.datasets[0].pointBackgroundColor.push(isAbnormal ? 'red' : '#4caf50');
  feedChart.data.datasets[0].pointBorderColor.push(isAbnormal ? 'red' : '#4caf50');

  if (isAbnormal) {
  abnormalRecords.push({
    index: dataset.data.length-1,
    label,
    value
  });
  renderAbnormalList();
}

  feedChart.update();

  document.getElementById('feedDate').value = '';
  document.getElementById('feedValue').value = '';
}


function renderAbnormalList() {
  const container = document.getElementById('abnormalList');
  container.innerHTML = '';

  abnormalRecords.forEach((record, i) => {
    const row = document.createElement('div');
    row.style.marginBottom = '8px';

    row.innerHTML = `
      <span class="abnormal-text">
        ⚠ 異常値 ｜ ${record.label} ｜ 訂正：
      </span>
      <input type="number" id="fix-${i}" style="width:80px">
      <button onclick="fixAbnormal(${i})">訂正</button>
    `;

    container.appendChild(row);
  });
}

function fixAbnormal(listIndex) {
  const record = abnormalRecords[listIndex];
  const input = document.getElementById(`fix-${listIndex}`);
  const newValue = parseFloat(input.value);

  if (Number.isNaN(newValue)) {
    alert('正しい数値を入力してください');
    return;
  }

  const dataIndex = record.index; //グラフ用 index
  const dateLabel = record.label; //labels が "YYYY/MM/DD HH:mm" 形式なら日付だけ取得
                                  //日誌用　日付(yyyy-mm-dd)

  // グラフの値を上書き(更新)
  feedChart.data.datasets[0].data[dataIndex] = newValue;
  // 点の色を正常色に変更
  feedChart.data.datasets[0].pointBackgroundColor[dataIndex] = '#4caf50';
  feedChart.data.datasets[0].pointBorderColor[dataIndex] = '#4caf50';
  feedChart.update();

  //日誌データ更新
  if(dailyRecords[dateLabel]) {
    dailyRecords[dateLabel].waterTemp = newValue;
  }

  saveToStorage();

  // 異常値リストから削除
  abnormalRecords.splice(listIndex, 1);
  renderAbnormalList();

  alert('日誌とグラフを修正しました');
}

function loadDailyRecord(date) {
  document.getElementById('sheetDate').textContent = `日付：${date}`;

  const record = dailyRecords[date] || {};

  document.getElementById('sheetStaff1').value = record.staff1 || '';
  document.getElementById('sheetStaff2').value = record.staff2 || '';
  document.getElementById('sheetTemp').value = record.waterTemp || '';
  document.getElementById('sheetHumidity').value = record.humidity || '';
  document.getElementById('sheetFood').value = record.food || '';
  document.getElementById('sheetMemo').value = record.memo || '';

  loadFishTableData(record.fishData || []);
}

function get(id) {
  const el = document.getElementById(id);
  if (!el) console.error(`❌ IDが見つかりません: ${id}`);
  return el;
}

function getFishTableData() {
  const rows = document.querySelectorAll('#fishTable tbody tr');
  const data = [];

  rows.forEach(row => {
    data.push({
      number: row.querySelector('.fish-number')?.textContent || '',
      name: row.querySelector('.fish-name')?.textContent || '',
      food: row.querySelector('.fish-food input')?.value || '',
      state: row.querySelector('.fish-situation select')?.value || '',
      action: row.querySelector('.fish-action input')?.value || ''
    });
  });

  return data;
}

function saveDailyRecord() {
  if (!currentDate) {
    alert('日付が未選択です');
    return;
  }

  console.log('保存日付:', currentDate);

  dailyRecords[currentDate] = {
    staff1: document.getElementById('sheetStaff1').value,
    staff2: document.getElementById('sheetStaff2').value,

    waterTemp: document.getElementById('sheetTemp').value,
    humidity: document.getElementById('sheetHumidity').value,
    food: document.getElementById('sheetFood').value,
    
    memo: document.getElementById('sheetMemo').value,

    fishData: getFishTableData()
  };

  saveToStorage();           // ★ 保存

  alert('保存しました');
}

function openDailySheet() {
  const date = document.getElementById('calendarDate').value;
  if (!date) {
    alert('日付を選択してください');
    return;
  }

  currentDate = date;
  showPage('daily-sheet');
  loadDailyRecord(date);
}

window.addEventListener('load', () => {
  loadFromStorage();
});

function loadFishTableData(fishData = []) {
  const rows = document.querySelectorAll('#fishTable tbody tr');

  rows.forEach((row, i) => {
    if (!fishData[i]) return;

    row.querySelector('.fish-food input').value =
      fishData[i].food || '';

    row.querySelector('.fish-situation select').value =
      fishData[i].state || '良好';

    row.querySelector('.fish-action input').value =
      fishData[i].action || '';
  });
}

document.getElementById('searchButton').addEventListener('click', filterAreaButtons);

function filterAreaButtons() {
  /*const nameValue = document.getElementById('searchInput').value.trim(); 入力検索*/
  const tag1Value = document.getElementById('tagFilter1').value;
  const tag2Value = document.getElementById('tagFilter2').value;

  const buttons = document.querySelectorAll('#management .sub-button');

  buttons.forEach(btn => {
    /*const name = btn.dataset.name || ''; */
    const tag1 = btn.dataset.tags1 || '';
    const tag2 = btn.dataset.tags2 || '';

    /*const matchName =
      nameValue === '' || name.includes(nameValue);
*/
    const matchTag1 =
      tag1Value === '' || tag1 === tag1Value;

    const matchTag2 =
      tag2Value === '' || tag2 === tag2Value;

    if (/*matchName && */matchTag1 && matchTag2) {
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
  });
}

document.getElementById('searchButton2').addEventListener('click', filterAnimalButtons);

function filterAnimalButtons() {
  const tag3Value = document.getElementById('tagFilter3').value;

  const buttons = document.querySelectorAll('#management-kahunomori .sub-button2');

  buttons.forEach(btn => {
    const tag3 = btn.dataset.tags3 || '';


    const matchTag3 =
      tag3Value === '' || tag3 === tag3Value;

    if (matchTag3) {
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
  });
}
