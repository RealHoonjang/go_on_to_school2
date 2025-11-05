// 체육대학 입시 상담 시스템
let universitiesData = [];
let scoringTableData = {};
let studentData = {
    name: '',
    gender: '',
    academicScore: null,
    sportsScores: {}
};

// 실기 종목 목록 (남/여 공통)
const sportsEvents = [
    { key: 'standing_long_jump', name: '제자리멀리뛰기', unit: 'cm' },
    { key: 'vertical_jump', name: '서전트점프(MD)', unit: 'cm' },
    { key: 'vertical_jump_touch', name: '서전트점프(터치)', unit: 'cm' },
    { key: 'grip_strength', name: '배근력', unit: 'kg' },
    { key: 'sit_up', name: '윗몸일으키기', unit: '회' },
    { key: 'front_bend', name: '앉아윗몸앞으로굽히기', unit: 'cm' },
    { key: '10m_dash', name: '10m 달리기', unit: '초' },
    { key: '20m_dash', name: '20m 달리기', unit: '초' },
    { key: 'long_run', name: '오래달리기', unit: '초' },
    { key: 'medicine_ball_throw', name: '메디신볼던지기', unit: 'm' }
];

// 대학별 실기 종목 매핑 (주요 대학만 우선 구현)
const universityEventMapping = {
    '가천대 체육': {
        'male': ['standing_long_jump'],
        'female': ['standing_long_jump']
    },
    '가톨릭관동대 체육교육': {
        'male': ['standing_long_jump'],
        'female': ['standing_long_jump']
    }
};

// DOM 로드 완료 시 실행
document.addEventListener('DOMContentLoaded', function() {
    loadUniversitiesData();
    loadScoringTableData();
    setupCounselingEventListeners();
    loadStudentDataFromStorage();
});

// 대학 데이터 로드
async function loadUniversitiesData() {
    try {
        const response = await fetch('data/universities.json');
        if (response.ok) {
            universitiesData = await response.json();
            console.log(`${universitiesData.length}개 대학 데이터 로드 완료`);
        } else {
            console.error('대학 데이터 로드 실패');
        }
    } catch (error) {
        console.error('대학 데이터 로드 오류:', error);
    }
}

// 배점표 데이터 로드
async function loadScoringTableData() {
    try {
        const response = await fetch('data/scoring_table.json');
        if (response.ok) {
            scoringTableData = await response.json();
            console.log('배점표 데이터 로드 완료');
        } else {
            console.log('배점표 데이터 없음 (실기 환산 기능 사용 불가)');
        }
    } catch (error) {
        console.log('배점표 데이터 로드 오류 (무시):', error);
    }
}

// VLOOKUP 유사 함수: 기록에 해당하는 점수 찾기
function vlookupScore(record, scoringTable, isHigherBetter = true) {
    if (!scoringTable || scoringTable.length === 0) {
        return 0;
    }
    
    // 정렬된 테이블에서 가장 가까운 값 찾기
    if (isHigherBetter) {
        // 높을수록 좋은 종목 (기록이 높을수록 점수 높음)
        // 정렬: 기록 오름차순
        const sorted = [...scoringTable].sort((a, b) => a.record - b.record);
        
        // 정확히 일치하는 값 찾기
        const exact = sorted.find(item => item.record === record);
        if (exact) return exact.score;
        
        // 범위 내 보간
        for (let i = 0; i < sorted.length - 1; i++) {
            if (record >= sorted[i].record && record <= sorted[i + 1].record) {
                // 선형 보간
                const ratio = (record - sorted[i].record) / (sorted[i + 1].record - sorted[i].record);
                return sorted[i].score + (sorted[i + 1].score - sorted[i].score) * ratio;
            }
        }
        
        // 범위 밖: 가장 가까운 값 반환
        if (record < sorted[0].record) return sorted[0].score;
        if (record > sorted[sorted.length - 1].record) return sorted[sorted.length - 1].score;
    } else {
        // 낮을수록 좋은 종목 (기록이 낮을수록 점수 높음)
        // 정렬: 기록 오름차순
        const sorted = [...scoringTable].sort((a, b) => a.record - b.record);
        
        const exact = sorted.find(item => item.record === record);
        if (exact) return exact.score;
        
        // 범위 내 보간 (낮을수록 좋은 경우)
        for (let i = 0; i < sorted.length - 1; i++) {
            if (record >= sorted[i].record && record <= sorted[i + 1].record) {
                // 선형 보간
                const ratio = (record - sorted[i].record) / (sorted[i + 1].record - sorted[i].record);
                return sorted[i + 1].score + (sorted[i].score - sorted[i + 1].score) * ratio;
            }
        }
        
        if (record < sorted[0].record) return sorted[sorted.length - 1].score;
        if (record > sorted[sorted.length - 1].record) return sorted[0].score;
    }
    
    return 0;
}

// 종목 키를 종목명으로 변환
function getEventName(eventKey) {
    switch(eventKey) {
        case 'standing_long_jump':
            return '제자리멀리뛰기';
        case 'vertical_jump':
            return '서전트점프(MD)';
        case 'vertical_jump_touch':
            return '서전트점프(터치)';
        case 'grip_strength':
            return '배근력';
        case 'sit_up':
            return '윗몸일으키기';
        case 'front_bend':
            return '앉아윗몸앞으로굽히기';
        case '10m_dash':
            return '10m달리기';
        case '20m_dash':
            return '20m달리기';
        case 'long_run':
            return '오래달리기';
        case 'medicine_ball_throw':
            return '메디신볼던지기';
        default:
            return '';
    }
}

// 종목명을 종목 키로 변환 (대학별 종목명 매핑용)
function getEventKeyFromName(eventName) {
    const mapping = {
        '제자리멀리뛰기': 'standing_long_jump',
        '서전트점프(MD)': 'vertical_jump',
        '서전트점프(터치)': 'vertical_jump_touch',
        '배근력': 'grip_strength',
        '윗몸일으키기': 'sit_up',
        '앉아윗몸앞으로굽히기': 'front_bend',
        '10m달리기': '10m_dash',
        '20m달리기': '20m_dash',
        '오래달리기': 'long_run',
        '메디신볼던지기': 'medicine_ball_throw'
    };
    return mapping[eventName] || null;
}

// 대학별로 필요한 종목 목록 가져오기
function getRequiredEventsForUniversity(universityName, gender) {
    const genderKey = gender === '남' ? 'male' : 'female';
    const requiredEvents = [];
    
    // 배점표 데이터에서 대학별 종목 확인
    if (scoringTableData.universities && scoringTableData.universities[universityName]) {
        const univData = scoringTableData.universities[universityName][genderKey];
        if (univData && Object.keys(univData).length > 0) {
            // 배점표에 있는 종목들이 필요 종목
            Object.keys(univData).forEach(eventName => {
                const eventKey = getEventKeyFromName(eventName);
                if (eventKey) {
                    requiredEvents.push(eventKey);
                }
            });
        }
    }
    
    // 배점표 데이터가 없으면 universityEventMapping 확인
    if (requiredEvents.length === 0 && universityEventMapping[universityName]) {
        const events = universityEventMapping[universityName][genderKey];
        if (events) {
            requiredEvents.push(...events);
        }
    }
    
    // 둘 다 없으면 모든 종목을 필요로 하는 것으로 간주 (기본값)
    if (requiredEvents.length === 0) {
        return sportsEvents.map(e => e.key);
    }
    
    return requiredEvents;
}

// 입력한 종목과 대학이 요구하는 종목 비교
function compareEventsWithUniversity(universityName, gender, inputEvents) {
    const requiredEvents = getRequiredEventsForUniversity(universityName, gender);
    const inputEventSet = new Set(inputEvents);
    const requiredEventSet = new Set(requiredEvents);
    
    // 입력한 종목이 필요한 종목에 모두 포함되어 있는지 확인
    const hasAllRequired = requiredEvents.every(event => inputEventSet.has(event));
    
    // 부족한 종목 목록
    const missingEvents = requiredEvents.filter(event => !inputEventSet.has(event));
    
    // 입력한 종목 중 필요한 종목
    const matchedEvents = inputEvents.filter(event => requiredEventSet.has(event));
    
    return {
        hasAllRequired,
        missingEvents,
        matchedEvents,
        requiredEvents
    };
}

// 실기 기록을 대학별 점수로 환산
function calculateSportsScoreForUniversity(universityName, gender) {
    if (!studentData.sportsScores || Object.keys(studentData.sportsScores).length === 0) {
        return 0;
    }
    
    // 배점표 데이터가 없으면 기본 환산 로직 사용
    if (!scoringTableData.universities || !scoringTableData.universities[universityName]) {
        // 간단한 환산 로직 (기본값)
        return calculateBasicSportsScore();
    }
    
    const genderKey = gender === '남' ? 'male' : 'female';
    const univData = scoringTableData.universities[universityName][genderKey];
    
    if (!univData || Object.keys(univData).length === 0) {
        return calculateBasicSportsScore();
    }
    
    let totalScore = 0;
    let eventCount = 0;
    
        // 종목별 점수 계산
        for (const [eventKey, record] of Object.entries(studentData.sportsScores)) {
            const eventName = getEventName(eventKey);
            
            if (eventName && univData[eventName]) {
                const isHigherBetter = !['10m_dash', '20m_dash', 'long_run'].includes(eventKey);
                const score = vlookupScore(record, univData[eventName], isHigherBetter);
                totalScore += score;
                eventCount++;
            }
        }
    
    // 평균 계산 (대학별 가중치 적용은 추후 구현)
    return eventCount > 0 ? totalScore : 0;
}

// 기본 실기 점수 환산 (배점표 없을 때)
function calculateBasicSportsScore() {
    // 간단한 환산: 각 종목을 100점 만점 기준으로 환산
    // 실제로는 대학별/종목별 배점이 다르지만, 기본값으로 사용
    let totalScore = 0;
    let count = 0;
    
    // 표준화된 점수 계산 (임시)
    for (const [eventKey, record] of Object.entries(studentData.sportsScores)) {
        // 각 종목별 기본 환산 점수 (100점 만점 기준)
        let normalizedScore = 0;
        
        switch(eventKey) {
            case 'standing_long_jump':
                // 200cm~300cm 범위를 0~100점으로 환산
                normalizedScore = Math.min(100, Math.max(0, ((record - 200) / 100) * 100));
                break;
            case 'vertical_jump':
            case 'vertical_jump_touch':
                // 40cm~100cm 범위를 0~100점으로 환산
                normalizedScore = Math.min(100, Math.max(0, ((record - 40) / 60) * 100));
                break;
            case 'grip_strength':
                // 40kg~120kg 범위를 0~100점으로 환산
                normalizedScore = Math.min(100, Math.max(0, ((record - 40) / 80) * 100));
                break;
            case 'sit_up':
                // 50회~100회 범위를 0~100점으로 환산
                normalizedScore = Math.min(100, Math.max(0, ((record - 50) / 50) * 100));
                break;
            case 'front_bend':
                // 10cm~30cm 범위를 0~100점으로 환산
                normalizedScore = Math.min(100, Math.max(0, ((record - 10) / 20) * 100));
                break;
            case '10m_dash':
                // 낮을수록 좋음 (8초~12초)
                normalizedScore = Math.min(100, Math.max(0, ((12 - record) / 4) * 100));
                break;
            case '20m_dash':
                // 낮을수록 좋음 (3초~5초)
                normalizedScore = Math.min(100, Math.max(0, ((5 - record) / 2) * 100));
                break;
            case 'long_run':
                // 낮을수록 좋음 (300초~600초, 5분~10분)
                normalizedScore = Math.min(100, Math.max(0, ((600 - record) / 300) * 100));
                break;
            case 'medicine_ball_throw':
                // 5m~15m 범위를 0~100점으로 환산
                normalizedScore = Math.min(100, Math.max(0, ((record - 5) / 10) * 100));
                break;
            default:
                normalizedScore = 50; // 기본값
        }
        
        totalScore += normalizedScore;
        count++;
    }
    
    // 평균을 실기 점수로 사용 (실제로는 대학별 가중치 적용 필요)
    return count > 0 ? totalScore / count : 0;
}

// 이벤트 리스너 설정
function setupCounselingEventListeners() {
    document.getElementById('load-student-data').addEventListener('click', saveStudentInfo);
    document.getElementById('save-academic-score').addEventListener('click', saveAcademicScore);
    document.getElementById('save-sports-scores').addEventListener('click', saveSportsScores);
    document.getElementById('counseling-gender').addEventListener('change', updateSportsEventInputs);
}

// 학생 정보 저장
function saveStudentInfo() {
    const name = document.getElementById('student-name').value.trim();
    const gender = document.getElementById('counseling-gender').value;
    
    if (!name || !gender) {
        alert('학생 이름과 성별을 모두 입력해주세요.');
        return;
    }
    
    studentData.name = name;
    studentData.gender = gender;
    
    // localStorage에 저장
    localStorage.setItem('counseling_student', JSON.stringify(studentData));
    
    // 실기 입력 필드 업데이트
    updateSportsEventInputs();
    
    alert(`${name} 학생의 정보가 저장되었습니다.`);
    
    // 상담 결과 업데이트
    updateCounselingResults();
}

// 내신 점수 저장
function saveAcademicScore() {
    const score = parseFloat(document.getElementById('academic-score').value);
    
    if (isNaN(score) || score <= 0) {
        alert('유효한 내신 점수를 입력해주세요.');
        return;
    }
    
    studentData.academicScore = score;
    localStorage.setItem('counseling_student', JSON.stringify(studentData));
    
    alert(`내신 점수 ${score}점이 저장되었습니다.`);
    
    // 상담 결과 업데이트
    updateCounselingResults();
}

// 실기 기록 저장
function saveSportsScores() {
    const inputs = document.querySelectorAll('#sports-events-input input[type="number"]');
    
    studentData.sportsScores = {};
    
    inputs.forEach(input => {
        const eventKey = input.dataset.eventKey;
        const value = parseFloat(input.value);
        
        if (!isNaN(value) && value > 0) {
            studentData.sportsScores[eventKey] = value;
        }
    });
    
    const inputCount = Object.keys(studentData.sportsScores).length;
    
    if (inputCount === 0) {
        alert('실기 기록을 입력해주세요.');
        return;
    }
    
    localStorage.setItem('counseling_student', JSON.stringify(studentData));
    
    alert(`${inputCount}개 종목의 실기 기록이 저장되었습니다.`);
    
    // 상담 결과 업데이트
    updateCounselingResults();
}

// 실기 종목 입력 필드 업데이트
function updateSportsEventInputs() {
    const container = document.getElementById('sports-events-input');
    container.innerHTML = '';
    
    const gender = document.getElementById('counseling-gender').value;
    
    if (!gender) {
        container.innerHTML = '<p class="text-muted">성별을 선택하면 실기 종목 입력 필드가 표시됩니다.</p>';
        return;
    }
    
    // 실기 종목별 입력 필드 생성
    sportsEvents.forEach(event => {
        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-4 mb-3';
        
        const label = document.createElement('label');
        label.className = 'form-label';
        label.textContent = `${event.name} (${event.unit})`;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'form-control';
        input.dataset.eventKey = event.key;
        input.step = event.unit === '회' ? '1' : '0.01';
        input.placeholder = `${event.name} 기록`;
        
        // 저장된 값이 있으면 불러오기
        if (studentData.sportsScores && studentData.sportsScores[event.key]) {
            input.value = studentData.sportsScores[event.key];
        }
        
        colDiv.appendChild(label);
        colDiv.appendChild(input);
        container.appendChild(colDiv);
    });
}

// 저장된 학생 데이터 불러오기
function loadStudentDataFromStorage() {
    const saved = localStorage.getItem('counseling_student');
    if (saved) {
        try {
            studentData = JSON.parse(saved);
            
            // 입력 필드에 값 채우기
            if (studentData.name) {
                document.getElementById('student-name').value = studentData.name;
            }
            if (studentData.gender) {
                document.getElementById('counseling-gender').value = studentData.gender;
                updateSportsEventInputs();
            }
            if (studentData.academicScore) {
                document.getElementById('academic-score').value = studentData.academicScore;
            }
        } catch (error) {
            console.error('저장된 데이터 불러오기 실패:', error);
        }
    }
}

// 대학별 상담 결과 업데이트
function updateCounselingResults() {
    const container = document.getElementById('university-counseling-results');
    
    if (!studentData.name || !studentData.gender) {
        container.innerHTML = '<p class="text-muted text-center">학생 정보를 입력하고 저장해주세요.</p>';
        return;
    }
    
    if (!studentData.academicScore) {
        container.innerHTML = '<p class="text-muted text-center">내신 점수를 입력하고 저장해주세요.</p>';
        return;
    }
    
    if (!universitiesData || universitiesData.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">대학 데이터를 불러오는 중...</p>';
        return;
    }
    
    const inputEvents = Object.keys(studentData.sportsScores || {});
    const inputEventCount = inputEvents.length;
    const inputEventNames = inputEvents.map(key => {
        const event = sportsEvents.find(e => e.key === key);
        return event ? event.name : key;
    }).join(', ');
    
    if (inputEventCount === 0) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <h6><i class="fas fa-exclamation-triangle me-2"></i>실기 기록 미입력</h6>
                <p class="mb-0">실기 기록을 입력하면 대학 추천이 가능합니다.</p>
            </div>
        `;
        return;
    }
    
    // 합격 가능성 판단 함수
    const getPossibility = (totalScore, avgScore, safeScore, expectedScore) => {
        if (totalScore >= (safeScore || 0)) {
            return { text: '안정', class: 'text-success' };
        } else if (totalScore >= (expectedScore || 0)) {
            return { text: '기대', class: 'text-primary' };
        } else if (totalScore >= (avgScore || 0)) {
            return { text: '보통', class: 'text-warning' };
        } else {
            return { text: '도전', class: 'text-danger' };
        }
    };
    
    // 모든 대학 분석 (입력한 종목 포함 여부 확인)
    const allUniversityResults = [];
    
    universitiesData.forEach(univ => {
        const comparison = compareEventsWithUniversity(univ.name, studentData.gender, inputEvents);
        
        const academicScore = studentData.academicScore;
        const currentSportsScore = calculateSportsScoreForUniversity(univ.name, studentData.gender);
        const currentTotalScore = academicScore + currentSportsScore;
        
        const avgScore = univ.avg_score;
        const safeScore = univ.safe_score;
        const expectedScore = univ.expected_score;
        
        const possibility = getPossibility(currentTotalScore, avgScore, safeScore, expectedScore);
        
        allUniversityResults.push({
            univ,
            academicScore,
            sportsScore: currentSportsScore,
            totalScore: currentTotalScore,
            scoreDiff: currentTotalScore - (avgScore || 0),
            possibility,
            requiredEvents: comparison.requiredEvents,
            matchedEvents: comparison.matchedEvents,
            missingEvents: comparison.missingEvents,
            hasAllRequired: comparison.hasAllRequired
        });
    });
    
    // 입력한 종목이 모두 포함된 대학만 필터링
    const eligibleUniversities = allUniversityResults.filter(r => r.hasAllRequired);
    
    // 결과 정렬: 합격 가능성 순으로 (안정 > 기대 > 보통 > 도전)
    const sortResults = (results) => {
        const order = { '안정': 0, '기대': 1, '보통': 2, '도전': 3 };
        return results.sort((a, b) => {
            const orderA = order[a.possibility.text] || 4;
            const orderB = order[b.possibility.text] || 4;
            if (orderA !== orderB) return orderA - orderB;
            return b.totalScore - a.totalScore;
        });
    };
    
    const sortedEligible = sortResults(eligibleUniversities);
    const sortedAll = sortResults(allUniversityResults);
    
    // HTML 생성
    let html = '';
    
    // 입력한 종목 정보 표시
    html += `
        <div class="alert alert-success mb-4">
            <h6><i class="fas fa-check-circle me-2"></i>입력한 종목 정보</h6>
            <p class="mb-0">
                <strong>${inputEventCount}개 종목</strong>: ${inputEventNames}
            </p>
        </div>
    `;
    
    // 추천 대학 목록 (입력한 종목이 모두 포함된 대학)
    if (sortedEligible.length > 0) {
        html += `
            <h5 class="mb-3"><i class="fas fa-star me-2 text-warning"></i>입력한 종목이 모두 포함된 추천 대학 (${sortedEligible.length}개)</h5>
            <div class="table-responsive mb-5">
                <table class="table table-hover table-sm">
                    <thead class="table-success">
                        <tr>
                            <th>지역</th>
                            <th>대학명</th>
                            <th>필요 종목</th>
                            <th>내신점수</th>
                            <th>실기점수</th>
                            <th>총점</th>
                            <th>합격평균</th>
                            <th>안정점수</th>
                            <th>기대점수</th>
                            <th>점수차이</th>
                            <th>모집정원</th>
                            <th>경쟁률</th>
                            <th>합격가능성</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        sortedEligible.forEach(result => {
            const { univ, academicScore, sportsScore, totalScore, scoreDiff, possibility, requiredEvents } = result;
            
            // 필요 종목 목록을 종목명으로 변환
            const requiredEventNames = requiredEvents.map(key => {
                const event = sportsEvents.find(e => e.key === key);
                return event ? event.name : key;
            }).join(', ');
            
            html += `
                <tr>
                    <td>${univ.region || ''}</td>
                    <td><strong>${univ.name || ''}</strong></td>
                    <td>
                        <small class="text-info">${requiredEventNames}</small>
                        <br><small class="text-success"><i class="fas fa-check-circle"></i> 모든 종목 충족</small>
                    </td>
                    <td>${academicScore.toFixed(1)}</td>
                    <td>${sportsScore > 0 ? sportsScore.toFixed(1) : '-'}</td>
                    <td><strong>${totalScore.toFixed(1)}</strong></td>
                    <td>${univ.avg_score ? univ.avg_score.toFixed(1) : '-'}</td>
                    <td>${univ.safe_score ? univ.safe_score.toFixed(1) : '-'}</td>
                    <td>${univ.expected_score ? univ.expected_score.toFixed(1) : '-'}</td>
                    <td class="${scoreDiff >= 0 ? 'text-success' : 'text-danger'}">
                        ${scoreDiff >= 0 ? '+' : ''}${scoreDiff.toFixed(1)}
                    </td>
                    <td>${univ.recruitment ? univ.recruitment['2026'] || univ.recruitment['2025'] || '-' : '-'}</td>
                    <td>${univ.competition ? (univ.competition['2025'] || univ.competition['2024'] || '-') + ':1' : '-'}</td>
                    <td class="${possibility.class}"><strong>${possibility.text}</strong></td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
    } else {
        html += `
            <div class="alert alert-warning mb-4">
                <h6><i class="fas fa-exclamation-triangle me-2"></i>추천 가능한 대학이 없습니다</h6>
                <p class="mb-0">입력한 종목(${inputEventNames})이 모두 포함된 대학이 없습니다.</p>
            </div>
        `;
    }
    
    // 부족한 종목이 있는 대학 목록
    const universitiesWithMissing = sortedAll.filter(r => !r.hasAllRequired && r.missingEvents.length > 0);
    
    if (universitiesWithMissing.length > 0) {
        html += `
            <h5 class="mb-3"><i class="fas fa-info-circle me-2"></i>부족한 종목이 있는 대학 (${universitiesWithMissing.length}개)</h5>
            <div class="alert alert-info mb-3">
                <small><i class="fas fa-info-circle me-1"></i>아래 대학들은 입력한 종목 외에 추가 종목이 필요합니다. 부족한 종목을 확인하세요.</small>
            </div>
            <div class="table-responsive mb-5">
                <table class="table table-hover table-sm">
                    <thead class="table-warning">
                        <tr>
                            <th>지역</th>
                            <th>대학명</th>
                            <th>필요 종목</th>
                            <th>부족한 종목</th>
                            <th>내신점수</th>
                            <th>실기점수</th>
                            <th>총점</th>
                            <th>합격평균</th>
                            <th>합격가능성</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        universitiesWithMissing.forEach(result => {
            const { univ, academicScore, sportsScore, totalScore, scoreDiff, possibility, requiredEvents, missingEvents } = result;
            
            // 필요 종목 목록을 종목명으로 변환
            const requiredEventNames = requiredEvents.map(key => {
                const event = sportsEvents.find(e => e.key === key);
                return event ? event.name : key;
            }).join(', ');
            
            // 부족한 종목 목록을 종목명으로 변환
            const missingEventNames = missingEvents.map(key => {
                const event = sportsEvents.find(e => e.key === key);
                return event ? event.name : key;
            }).join(', ');
            
            html += `
                <tr>
                    <td>${univ.region || ''}</td>
                    <td><strong>${univ.name || ''}</strong></td>
                    <td>
                        <small class="text-info">${requiredEventNames}</small>
                    </td>
                    <td>
                        <small class="text-danger"><i class="fas fa-exclamation-circle"></i> <strong>${missingEventNames}</strong></small>
                    </td>
                    <td>${academicScore.toFixed(1)}</td>
                    <td>${sportsScore > 0 ? sportsScore.toFixed(1) : '-'}</td>
                    <td><strong>${totalScore.toFixed(1)}</strong></td>
                    <td>${univ.avg_score ? univ.avg_score.toFixed(1) : '-'}</td>
                    <td class="${possibility.class}"><strong>${possibility.text}</strong></td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    // 안내 메시지
    html += `
        <div class="alert alert-info mt-3">
            <h6><i class="fas fa-info-circle me-2"></i>합격 가능성 기준</h6>
            <ul class="mb-0">
                <li><span class="text-success"><strong>안정</strong></span>: 안정점수 이상 (총점 기준)</li>
                <li><span class="text-primary"><strong>기대</strong></span>: 기대점수 이상</li>
                <li><span class="text-warning"><strong>보통</strong></span>: 합격 평균 이상</li>
                <li><span class="text-danger"><strong>도전</strong></span>: 합격 평균 미만</li>
            </ul>
            <p class="mb-0 mt-2">
                <small>실기 점수는 입력한 ${inputEventCount}개 종목(${inputEventNames})을 기반으로 환산되었습니다.</small>
                <br><small class="text-muted">* 표시된 대학은 입력한 종목이 해당 대학의 필요 종목에 모두 포함된 대학입니다.</small>
            </p>
        </div>
    `;
    
    container.innerHTML = html;
}
