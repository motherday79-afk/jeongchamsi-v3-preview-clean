export const REGION_DATA = Object.freeze({
  "서울특별시": { "서울특별시": ["종로구","중구","용산구","성동구","광진구","동대문구","중랑구","성북구","강북구","도봉구","노원구","은평구","서대문구","마포구","양천구","강서구","구로구","금천구","영등포구","동작구","관악구","서초구","강남구","송파구","강동구"] },
  "부산광역시": { "부산광역시": ["중구","서구","동구","영도구","부산진구","동래구","남구","북구","해운대구","사하구","금정구","강서구","연제구","수영구","사상구","기장군"] },
  "대구광역시": { "대구광역시": ["중구","동구","서구","남구","북구","수성구","달서구","달성군","군위군"] },
  "인천광역시": { "인천광역시": ["중구","동구","미추홀구","연수구","남동구","부평구","계양구","서구","강화군","옹진군"] },
  "광주광역시": { "광주광역시": ["동구","서구","남구","북구","광산구"] },
  "대전광역시": { "대전광역시": ["동구","중구","서구","유성구","대덕구"] },
  "울산광역시": { "울산광역시": ["중구","남구","동구","북구","울주군"] },
  "세종특별자치시": { "세종특별자치시": [] },
  "경기도": {
    "수원시": ["장안구","권선구","팔달구","영통구"], "성남시": ["수정구","중원구","분당구"], "고양시": ["덕양구","일산동구","일산서구"],
    "용인시": ["처인구","기흥구","수지구"], "안산시": ["상록구","단원구"], "안양시": ["만안구","동안구"], "부천시": ["원미구","소사구","오정구"],
    "화성시": [], "평택시": [], "시흥시": [], "김포시": [], "광주시": [], "광명시": [], "군포시": [], "하남시": [], "오산시": [],
    "이천시": [], "안성시": [], "의왕시": [], "양평군": [], "여주시": [], "과천시": [], "의정부시": [], "남양주시": [], "파주시": [],
    "구리시": [], "포천시": [], "양주시": [], "동두천시": [], "가평군": [], "연천군": []
  },
  "강원특별자치도": {
    "춘천시": [], "원주시": [], "강릉시": [], "동해시": [], "태백시": [], "속초시": [], "삼척시": [], "홍천군": [], "횡성군": [],
    "영월군": [], "평창군": [], "정선군": [], "철원군": [], "화천군": [], "양구군": [], "인제군": [], "고성군": [], "양양군": []
  },
  "충청북도": {
    "청주시": ["상당구","서원구","흥덕구","청원구"], "충주시": [], "제천시": [], "보은군": [], "옥천군": [], "영동군": [], "증평군": [],
    "진천군": [], "괴산군": [], "음성군": [], "단양군": []
  },
  "충청남도": {
    "천안시": ["동남구","서북구"], "공주시": [], "보령시": [], "아산시": [], "서산시": [], "논산시": [], "계룡시": [], "당진시": [],
    "금산군": [], "부여군": [], "서천군": [], "청양군": [], "홍성군": [], "예산군": [], "태안군": []
  },
  "전북특별자치도": {
    "전주시": ["완산구","덕진구"], "군산시": [], "익산시": [], "정읍시": [], "남원시": [], "김제시": [], "완주군": [], "진안군": [],
    "무주군": [], "장수군": [], "임실군": [], "순창군": [], "고창군": [], "부안군": []
  },
  "전라남도": {
    "목포시": [], "여수시": [], "순천시": [], "나주시": [], "광양시": [], "담양군": [], "곡성군": [], "구례군": [], "고흥군": [],
    "보성군": [], "화순군": [], "장흥군": [], "강진군": [], "해남군": [], "영암군": [], "무안군": [], "함평군": [], "영광군": [],
    "장성군": [], "완도군": [], "진도군": [], "신안군": []
  },
  "경상북도": {
    "포항시": ["남구","북구"], "경주시": [], "김천시": [], "안동시": [], "구미시": [], "영주시": [], "영천시": [], "상주시": [], "문경시": [],
    "경산시": [], "의성군": [], "청송군": [], "영양군": [], "영덕군": [], "청도군": [], "고령군": [], "성주군": [], "칠곡군": [], "예천군": [],
    "봉화군": [], "울진군": [], "울릉군": []
  },
  "경상남도": {
    "창원시": ["의창구","성산구","마산합포구","마산회원구","진해구"], "진주시": [], "통영시": [], "사천시": [], "김해시": [], "밀양시": [],
    "거제시": [], "양산시": [], "의령군": [], "함안군": [], "창녕군": [], "고성군": [], "남해군": [], "하동군": [], "산청군": [],
    "함양군": [], "거창군": [], "합천군": []
  },
  "제주특별자치도": { "제주시": [], "서귀포시": [] }
});

function fillSelect(select, values, selected, placeholder) {
  if (!select) return;
  select.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  select.appendChild(first);
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    if (value === selected) option.selected = true;
    select.appendChild(option);
  }
}

function setDistrictState(group, province, city, selected = "") {
  const district = group.querySelector("[data-region-district]");
  if (!district) return;
  const districts = REGION_DATA[province]?.[city] || [];
  fillSelect(district, districts, selected, districts.length ? "구/군 선택" : "구/군 없음");
  district.disabled = districts.length === 0;
}

export function hydrateRegionSelectors(root = document) {
  root.querySelectorAll("[data-region-group]").forEach(group => {
    const province = group.querySelector("[data-region-province]");
    const city = group.querySelector("[data-region-city]");
    const selectedProvince = group.dataset.selectedProvince || province?.value || "";
    const selectedCity = group.dataset.selectedCity || "";
    const selectedDistrict = group.dataset.selectedDistrict || "";
    fillSelect(province, Object.keys(REGION_DATA), selectedProvince, "도/광역시 선택");
    fillSelect(city, selectedProvince ? Object.keys(REGION_DATA[selectedProvince] || {}) : [], selectedCity, "시/군 선택");
    city.disabled = !selectedProvince;
    setDistrictState(group, selectedProvince, selectedCity, selectedDistrict);
  });
}

export function handleRegionChange(select) {
  const group = select.closest("[data-region-group]");
  if (!group) return;
  const province = group.querySelector("[data-region-province]");
  const city = group.querySelector("[data-region-city]");
  if (select.matches("[data-region-province]")) {
    fillSelect(city, province.value ? Object.keys(REGION_DATA[province.value] || {}) : [], "", "시/군 선택");
    city.disabled = !province.value;
    setDistrictState(group, province.value, "", "");
  } else if (select.matches("[data-region-city]")) {
    setDistrictState(group, province.value, city.value, "");
  }
}
