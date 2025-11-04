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
        // 종목명 매핑
        let eventName = '';
        switch(eventKey) {
            case 'standing_long_jump':
                eventName = '제자리멀리뛰기';
                break;
            case 'vertical_jump':
                eventName = '서전트점프(MD)';
                break;
            case 'grip_strength':
                eventName = '배근력';
                break;
            case '10m_dash':
                eventName = '10m달리기';
                break;
            // 추가 종목 매핑 필요시 여기에 추가
        }
        
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
                normalizedScore = Math.min(100, Math.max(0, ((record - 40) / 60) * 100));
                break;
            case 'grip_strength':
                normalizedScore = Math.min(100, Math.max(0, ((record - 40) / 80) * 100));
                break;
            case '10m_dash':
                // 낮을수록 좋음 (8초~12초)
                normalizedScore = Math.min(100, Math.max(0, ((12 - record) / 4) * 100));
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
    let hasData = false;
    
    studentData.sportsScores = {};
    
    inputs.forEach(input => {
        const eventKey = input.dataset.eventKey;
        const value = parseFloat(input.value);
        
        if (!isNaN(value) && value > 0) {
            studentData.sportsScores[eventKey] = value;
            hasData = true;
        }
    });
    
    if (!hasData) {
        alert('실기 기록을 입력해주세요.');
        return;
    }
    
    localStorage.setItem('counseling_student', JSON.stringify(studentData));
    
    alert('실기 기록이 저장되었습니다.');
    
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
    
    // 상담 결과 생성
    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>지역</th>
                        <th>대학명</th>
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
    
    universitiesData.forEach(univ => {
        const academicScore = studentData.academicScore;
        
        // 실기 점수 계산
        const sportsScore = calculateSportsScoreForUniversity(univ.name, studentData.gender);
        
        // 총점 계산 (내신 + 실기)
        const totalScore = academicScore + sportsScore;
        
        const avgScore = univ.avg_score;
        const safeScore = univ.safe_score;
        const expectedScore = univ.expected_score;
        
        // 총점 기준으로 점수 차이 계산
        const scoreDiff = totalScore - (avgScore || 0);
        
        // 합격 가능성 판단
        let possibility = '';
        let possibilityClass = '';
        
        if (totalScore >= (safeScore || 0)) {
            possibility = '안정';
            possibilityClass = 'text-success';
        } else if (totalScore >= (expectedScore || 0)) {
            possibility = '기대';
            possibilityClass = 'text-primary';
        } else if (totalScore >= (avgScore || 0)) {
            possibility = '보통';
            possibilityClass = 'text-warning';
        } else {
            possibility = '도전';
            possibilityClass = 'text-danger';
        }
        
        html += `
            <tr>
                <td>${univ.region || ''}</td>
                <td><strong>${univ.name || ''}</strong></td>
                <td>${academicScore.toFixed(1)}</td>
                <td>${sportsScore > 0 ? sportsScore.toFixed(1) : '-'}</td>
                <td><strong>${totalScore.toFixed(1)}</strong></td>
                <td>${avgScore ? avgScore.toFixed(1) : '-'}</td>
                <td>${safeScore ? safeScore.toFixed(1) : '-'}</td>
                <td>${expectedScore ? expectedScore.toFixed(1) : '-'}</td>
                <td class="${scoreDiff >= 0 ? 'text-success' : 'text-danger'}">
                    ${scoreDiff >= 0 ? '+' : ''}${scoreDiff.toFixed(1)}
                </td>
                <td>${univ.recruitment ? univ.recruitment['2026'] || univ.recruitment['2025'] || '-' : '-'}</td>
                <td>${univ.competition ? (univ.competition['2025'] || univ.competition['2024'] || '-') + ':1' : '-'}</td>
                <td class="${possibilityClass}"><strong>${possibility}</strong></td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div class="alert alert-info mt-3">
            <h6><i class="fas fa-info-circle me-2"></i>합격 가능성 기준</h6>
            <ul class="mb-0">
                <li><span class="text-success"><strong>안정</strong></span>: 안정점수 이상 (총점 기준)</li>
                <li><span class="text-primary"><strong>기대</strong></span>: 기대점수 이상</li>
                <li><span class="text-warning"><strong>보통</strong></span>: 합격 평균 이상</li>
                <li><span class="text-danger"><strong>도전</strong></span>: 합격 평균 미만</li>
            </ul>
            ${Object.keys(studentData.sportsScores || {}).length > 0 ? 
                '<p class="mb-0 mt-2"><small>실기 점수는 입력한 기록을 기반으로 환산되었습니다.</small></p>' :
                '<p class="mb-0 mt-2"><small class="text-warning">실기 기록을 입력하면 더 정확한 분석이 가능합니다.</small></p>'
            }
        </div>
    `;
    
    container.innerHTML = html;
}
