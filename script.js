// 전역 변수
let allData = {};
let currentEvent = null;
let currentEventStats = null;
let distributionChart = null;
let chartMarkers = {
    personal: null,
    top10: null
};
let chartMarkerPluginRegistered = false;

const chartMarkerPlugin = {
    id: 'chartMarkerPlugin',
    afterDatasetsDraw(chart) {
        if ((!chartMarkers.personal && !chartMarkers.top10) || !chart.chartArea) {
            return;
        }
        
        const { ctx, chartArea } = chart;
        const barCount = chart.data.labels?.length || 0;
        if (!barCount) return;
        
        const chartWidth = chartArea.right - chartArea.left;
        
        const drawMarkerLine = (marker) => {
            if (!marker || marker.relativeX === null || marker.relativeX === undefined) {
                return;
            }
            const xPosition = chartArea.left + chartWidth * marker.relativeX;
            
            ctx.save();
            ctx.strokeStyle = marker.color || '#ff6384';
            ctx.lineWidth = marker.lineWidth || 3;
            ctx.setLineDash(marker.dash || [10, 5]);
            ctx.beginPath();
            ctx.moveTo(xPosition, chartArea.top);
            ctx.lineTo(xPosition, chartArea.bottom);
            ctx.stroke();
            ctx.restore();
        };
        
        drawMarkerLine(chartMarkers.personal);
        drawMarkerLine(chartMarkers.top10);
        
        ctx.save();
        ctx.textAlign = 'left';
        ctx.font = 'bold 14px "Segoe UI", "Malgun Gothic", sans-serif';
        let textY = chartArea.top + 24;
        
        if (chartMarkers.personal?.label) {
            ctx.fillStyle = chartMarkers.personal.labelColor || '#ff6384';
            ctx.fillText(chartMarkers.personal.label, chartArea.left + 10, textY);
            textY += 18;
        }
        
        if (chartMarkers.top10?.label) {
            ctx.fillStyle = chartMarkers.top10.labelColor || '#2563eb';
            ctx.fillText(chartMarkers.top10.label, chartArea.left + 10, textY);
        }
        ctx.restore();
    }
};

function ensureChartMarkerPlugin() {
    if (!chartMarkerPluginRegistered && typeof Chart !== 'undefined') {
        Chart.register(chartMarkerPlugin);
        chartMarkerPluginRegistered = true;
    }
}

const eventMapping = {
    'seoul': {
        'standing_long_jump': '제자리멀리뛰기',
        'sit_up': '앉아윗몸앞으로굽히기',
        '10m_dash': '10m왕복달리기',
        'vertical_jump': '서전트점프',
        '20m_dash': '20m왕복달리기',
        'grip_strength': '배근력',
        'medicine_ball_throw': '메디신볼던지기'
    },
    'inchoen': {
        'standing_long_jump': '제자리멀리뛰기',
        'sit_up': '윗몸일으키기',
        '10m_dash': '10m 왕복달리기',
        'grip_strength': '배근력',
        'medicine_ball_throw': '메디신볼던지기',
        'front_bend': '좌전굴'
    },
    'jeju': {
        'standing_long_jump': '제자리멀리뛰기',
        'sit_up': '윗몸일으키기',
        '20m_dash': '20m달리기',
        'grip_strength': '배근력'
    },
    'chungnam': {
        'standing_long_jump': '제자리멀리뛰기',
        'vertical_jump': '서전트점프',
        'grip_strength': '배근력',
        '10m_dash': '10M왕복달리기',
        'medicine_ball_throw': '메디신볼던지기',
        'sit_up': '앉아윗몸앞으로굽히기'
    },
    'chungbuk': {
        'standing_long_jump': '제자리멀리뛰기',
        'grip_strength': '배근력',
        '10m_dash': '10m왕복달리기',
        'medicine_ball_throw': '메디신볼던지기',
        'sit_up': '앉아윗몸앞으로굽히기'
    },
    'deajeon': {
        'standing_long_jump': '제자리멀리뛰기',
        'sit_up': '싯업',
        'front_bend': '앉아윗몸앞으로굽히기',
        '10m_dash': '10M왕복달리기',
        'medicine_ball_throw': '메디신볼던지기'
    },
    'kwangju': {
        '10m_dash': '10M 왕복 기록',
        'standing_long_jump': '제자리멀리뛰기 기록',
        'grip_strength': '배근력 기록',
        'front_bend': '좌전굴 기록',
        'medicine_ball_throw': '메디신볼던지기 기록'
    }
};

const eventDisplayNames = {
    'standing_long_jump': '제자리멀리뛰기',
    'vertical_jump': '서전트점프',
    'grip_strength': '배근력',
    'sit_up': '윗몸일으키기',
    '10m_dash': '10m 달리기',
    '20m_dash': '20m 달리기',
    'long_run': '오래달리기',
    'medicine_ball_throw': '메디신볼던지기',
    'front_bend': '앉아윗몸앞으로굽히기'
};

const unitMap = {
    'standing_long_jump': 'cm',
    'vertical_jump': 'cm',
    'grip_strength': 'kg',
    'sit_up': '회',
    '10m_dash': '초',
    '20m_dash': '초',
    'long_run': '초',
    'medicine_ball_throw': 'm',
    'front_bend': 'cm'
};

// CSV 데이터를 로드하여 저장할 변수
let careerGuideData = [];
let certificateData = [];
let loadmapData = [];
let careerMajors = [];
let careerJobDetails = {};
let certificationDetails = {};
let loadmapByCareer = {};

// CSV 파일 파싱 함수
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = [];
        let currentValue = '';
        let inQuotes = false;
        
        for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim());
        
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
    }
    
    return data;
}

// 진로 가이드 CSV 로드
async function loadCareerGuideData() {
    try {
        const response = await fetch('jinro/Guide.csv');
        if (!response.ok) throw new Error('Guide.csv 로드 실패');
        const csvText = await response.text();
        careerGuideData = parseCSV(csvText);
        
        // 학과별로 그룹화
        const majorMap = new Map();
        careerGuideData.forEach(row => {
            const major = row['학과'] || '';
            if (!major) return;
            
            if (!majorMap.has(major)) {
                majorMap.set(major, {
                    name: major,
                    careers: []
                });
            }
            
            majorMap.get(major).careers.push({
                career: row['진로'] || '',
                qualification: row['필요자격증'] || '',
                workplaces: row['주요 취업처'] || '',
                salary: row['초봉/연봉'] || '',
                strategy: row['준비전략'] || ''
            });
        });
        
        // careerMajors 배열 생성
        careerMajors = Array.from(majorMap.entries()).map(([majorName, data], index) => {
            const uniqueCareers = [...new Set(data.careers.map(c => c.career))];
            return {
                id: `major_${index}`,
                name: majorName,
                careers: data.careers,
                jobs: uniqueCareers
            };
        });
        
        // careerJobDetails 객체 생성
        careerGuideData.forEach(row => {
            const career = row['진로'] || '';
            if (!career) return;
            
            if (!careerJobDetails[career]) {
                careerJobDetails[career] = {
                    description: career,
                    qualification: row['필요자격증'] || '',
                    salary: row['초봉/연봉'] || '',
                    workplaces: row['주요 취업처'] || '',
                    strategy: row['준비전략'] || '',
                    certifications: []
                };
            }
            
            // 필요자격증 파싱
            const quals = (row['필요자격증'] || '').split(/[+또는및]/).map(q => q.trim()).filter(q => q);
            careerJobDetails[career].certifications = [...new Set([...careerJobDetails[career].certifications, ...quals])];
        });
        
        console.log('진로 가이드 데이터 로드 완료:', careerMajors.length, '개 학과');
    } catch (error) {
        console.error('진로 가이드 데이터 로드 오류:', error);
    }
}

// 자격증 CSV 로드
async function loadCertificateData() {
    try {
        const response = await fetch('jinro/Certificate.csv');
        if (!response.ok) throw new Error('Certificate.csv 로드 실패');
        const csvText = await response.text();
        certificateData = parseCSV(csvText);
        
        // certificationDetails 객체 생성 (새로운 필드 포함)
        certificateData.forEach(row => {
            const certName = row['자격증명'] || '';
            if (!certName) return;
            
            certificationDetails[certName] = {
                category: row['자격증 분류'] || '',
                agency: row['발급/관리기관'] || row['발급기관'] || '',
                requirement: row['응시자격'] || '',
                subjects: row['시험과목'] || '',
                preparationPeriod: row['준비기간'] || '',
                salary: row['연봉/처우'] || row['예상비용'] || '',
                difficulty: row['난이도'] || '',
                validity: row['유효기간'] || '',
                workplaces: row['주요 취업처'] || row['취업처/활용도'] || ''
            };
        });
        
        console.log('자격증 데이터 로드 완료:', Object.keys(certificationDetails).length, '개 자격증');
    } catch (error) {
        console.error('자격증 데이터 로드 오류:', error);
    }
}

// 로드맵 CSV 로드
async function loadLoadmapData() {
    try {
        const response = await fetch('jinro/loadmap.csv');
        if (!response.ok) throw new Error('loadmap.csv 로드 실패');
        const csvText = await response.text();
        loadmapData = parseCSV(csvText);
        
        // 진로별로 로드맵 그룹화
        loadmapData.forEach(row => {
            const career = row['진로목표'] || '';
            if (!career) return;
            
            if (!loadmapByCareer[career]) {
                loadmapByCareer[career] = [];
            }
            
            loadmapByCareer[career].push({
                stage: row['단계'] || '',
                content: row['구체적준비내용'] || '',
                period: row['예상기간'] || '',
                requiredCert: row['필수자격증'] || ''
            });
        });
        
        // 단계별로 정렬
        Object.keys(loadmapByCareer).forEach(career => {
            loadmapByCareer[career].sort((a, b) => {
                const stageA = a.stage.match(/\d+/)?.[0] || 0;
                const stageB = b.stage.match(/\d+/)?.[0] || 0;
                return parseInt(stageA) - parseInt(stageB);
            });
        });
        
        console.log('로드맵 데이터 로드 완료:', Object.keys(loadmapByCareer).length, '개 진로');
    } catch (error) {
        console.error('로드맵 데이터 로드 오류:', error);
    }
}

// DOM 로드 완료 시 실행
document.addEventListener('DOMContentLoaded', async function() {
    initializeApp();
    setupEventListeners();
    loadAllDataFiles();
    
    // CSV 데이터 로드 후 진로 가이드 초기화
    await Promise.all([loadCareerGuideData(), loadCertificateData(), loadLoadmapData()]);
    initializeCareerGuidance();
});

// 앱 초기화
function initializeApp() {
    console.log('체육 실기 분석 시스템 초기화');
    updateStatus('데이터를 로드하는 중입니다...', 'info');
}

// 이벤트 리스너 설정
function setupEventListeners() {
    document.getElementById('event-select').addEventListener('change', handleEventSelection);
    document.getElementById('load-event-data').addEventListener('click', loadEventData);
    document.getElementById('analyze-score').addEventListener('click', analyzePersonalScore);
    document.getElementById('personal-score').addEventListener('input', validateScoreInput);
}

// 모든 JSON 파일 로드
function loadAllDataFiles() {
    const files = [
        'data/seoul.json',
        'data/inchoen.json',
        'data/jeju.json',
        'data/chungnam.json',
        'data/chungbuk.json',
        'data/deajeon.json',
        'data/kwangju.json'
    ];

    let loadedCount = 0;
    let hasErrors = false;
    
    files.forEach(file => {
        const region = file.split('/')[1].split('.')[0];
        
        // GitHub Pages 호환 경로 처리
        let filePath;
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        
        if (hostname.includes('github.io')) {
            // GitHub Pages 환경
            // URL이 realhoonjang.github.io/go_on_to/ 인 경우 저장소 이름은 'go_on_to'
            const pathParts = pathname.split('/').filter(part => part);
            const repoName = pathParts[0] || 'go_on_to';  // 기본값 설정
            
            filePath = `/${repoName}/${file}`;
            console.log('GitHub Pages - Repo name:', repoName);
            console.log('GitHub Pages - Loading:', filePath);
        } else {
            // 로컬 환경
            filePath = file;
            console.log('Local file:', filePath);
        }
        
        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(jsonData => {
                allData[region] = processRegionData(jsonData, region);
                loadedCount++;
                
                if (loadedCount === files.length) {
                    if (hasErrors) {
                        updateStatus('일부 데이터 로드에 실패했습니다.', 'warning');
                    } else {
                        updateStatus('데이터 로드 완료! 종목을 선택하세요.', 'success');
                    }
                }
            })
            .catch(error => {
                console.error(`파일 로드 실패: ${filePath}`, error);
                hasErrors = true;
                loadedCount++;
                
                if (loadedCount === files.length) {
                    if (hasErrors && Object.keys(allData).length === 0) {
                        updateStatus('데이터 파일을 찾을 수 없습니다. GitHub 저장소를 확인해주세요.', 'danger');
                    } else {
                        updateStatus('일부 데이터 로드에 실패했습니다.', 'warning');
                    }
                }
            });
    });
}

// 지역 데이터 처리
function processRegionData(data, region) {
    const processedData = [];
    
    data.forEach((row, index) => {
        const record = {
            region: region,
            student_id: index + 1,
            gender: extractGender(row),
            events: extractEvents(row, region)
        };
        
        if (Object.keys(record.events).length > 0) {
            processedData.push(record);
        }
    });
    
    return processedData;
}

// 성별 추출
function extractGender(row) {
    const genderCols = ['성별', 'gender', 'Gender'];
    for (const col of genderCols) {
        if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
            return String(row[col]);
        }
    }
    return '미상';
}

// 종목별 기록 추출
function extractEvents(row, region) {
    const events = {};
    
    if (eventMapping[region]) {
        for (const [eventKey, colName] of Object.entries(eventMapping[region])) {
            if (row[colName] !== undefined && row[colName] !== null && row[colName] !== '') {
                const value = parseFloat(row[colName]);
                if (!isNaN(value) && value > 0) {
                    events[eventKey] = value;
                }
            }
        }
    }
    
    return events;
}

// 종목 선택 처리
function handleEventSelection() {
    const selectedEvent = document.getElementById('event-select').value;
    currentEvent = selectedEvent;
    
    if (selectedEvent) {
        updateUnitDisplay(selectedEvent);
        document.getElementById('data-distribution').style.display = 'none';
        document.getElementById('result-content').innerHTML = `
            <i class="fas fa-chart-line fa-3x mb-3"></i>
            <p>종목을 선택하고 기록을 입력한 후 '위치 분석' 버튼을 클릭하세요.</p>
        `;
    }
}

// 단위 표시 업데이트
function updateUnitDisplay(eventKey) {
    const unit = unitMap[eventKey] || '단위';
    document.getElementById('unit-display').textContent = unit;
}

// 종목별 데이터 수집 (성별 필터링 포함)
function getAllEventData(eventName, genderFilter = '전체') {
    const allEventData = [];
    
    for (const region in allData) {
        allData[region].forEach(record => {
            if (record.events[eventName] !== undefined) {
                // 성별 필터 적용
                if (genderFilter === '전체' || record.gender === genderFilter) {
                    allEventData.push({
                        score: record.events[eventName],
                        region: region,
                        gender: record.gender
                    });
                }
            }
        });
    }
    
    return allEventData;
}

// 종목 통계 계산 (성별 필터 포함)
function getEventStatistics(eventName, genderFilter = '전체') {
    const allEventData = getAllEventData(eventName, genderFilter);
    
    if (allEventData.length === 0) {
        return null;
    }
    
    // 10m 달리기의 경우 20초 이상인 이상치 제거
    let scores = allEventData
        .map(item => item.score)
        .filter(score => {
            if (eventName === '10m_dash' && score > 20) {
                return false;
            }
            return true;
        });
    
    // 이상치 제거 적용
    scores = removeOutliers(scores, eventName);
    
    if (scores.length === 0) {
        return null;
    }
    
    return {
        count: scores.length,
        mean: calculateMean(scores),
        std: calculateStd(scores),
        min: Math.min(...scores),
        max: Math.max(...scores),
        percentiles: {
            '25': calculatePercentile(scores, 25),
            '50': calculatePercentile(scores, 50),
            '75': calculatePercentile(scores, 75),
            '90': calculatePercentile(scores, 90),
            '95': calculatePercentile(scores, 95)
        },
        genderFilter: genderFilter
    };
}

// 통계 값 포맷팅 함수 (정수 종목은 소수점 제거)
function formatStatValue(value, eventName) {
    // 정수 값만 기록하는 종목들
    const integerEvents = ['sit_up'];
    
    if (integerEvents.includes(eventName)) {
        return Math.round(value);
    }
    
    return value.toFixed(2);
}

// 이상치 제거 함수
function removeOutliers(scores, eventName) {
    if (scores.length === 0) return scores;
    
    const sorted = [...scores].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    // 종목별 추가 이상치 제거 기준
    const eventBounds = {
        'standing_long_jump': { min: 50, max: 350 },  // 50cm~350cm
        'vertical_jump': { min: 20, max: 120 },        // 20cm~120cm
        'grip_strength': { min: 20, max: 300 },       // 20kg~300kg
        'sit_up': { min: 1, max: 200 },                // 1회~200회
        '10m_dash': { min: 5, max: 20 },               // 5초~20초 (이미 필터링됨)
        '20m_dash': { min: 10, max: 30 },             // 10초~30초
        'long_run': { min: 100, max: 1200 },           // 100초~1200초
        'medicine_ball_throw': { min: 1, max: 20 },    // 1m~20m
        'front_bend': { min: -20, max: 50 }            // -20cm~50cm
    };
    
    let bounds = { min: lowerBound, max: upperBound };
    
    if (eventBounds[eventName]) {
        bounds.min = Math.max(bounds.min, eventBounds[eventName].min);
        bounds.max = Math.min(bounds.max, eventBounds[eventName].max);
    }
    
    return scores.filter(score => score >= bounds.min && score <= bounds.max);
}

function initializeCareerGuidance() {
    const majorSelect = document.getElementById('career-major-select');
    const jobSelect = document.getElementById('career-job-select');
    const panel = document.getElementById('career-info-panel');
    const certSelect = document.getElementById('certificate-select');
    const certJobsPanel = document.getElementById('certificate-jobs-panel');

    if (!majorSelect || !jobSelect || !panel) {
        return;
    }

    const majorOptions = careerMajors.map(major => `<option value="${major.id}">${major.name}</option>`).join('');
    majorSelect.insertAdjacentHTML('beforeend', majorOptions);

    // 자격증 드롭박스 초기화
    if (certSelect && certJobsPanel) {
        const certOptions = Object.keys(certificationDetails).map(certName => 
            `<option value="${certName}">${certName}</option>`
        ).join('');
        certSelect.insertAdjacentHTML('beforeend', certOptions);

        certSelect.addEventListener('change', () => {
            const selectedCert = certSelect.value;
            if (!selectedCert) {
                certJobsPanel.innerHTML = `
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-info-circle fa-2x mb-2"></i>
                        <p class="mb-0">자격증을 선택하면 해당 자격증으로 취업할 수 있는 직업 정보를 보여드립니다.</p>
                    </div>`;
                return;
            }

            renderJobsByCertificate(selectedCert);
        });
    }

    majorSelect.addEventListener('change', () => {
        const selectedMajor = careerMajors.find(major => major.id === majorSelect.value);
        if (!selectedMajor) {
            jobSelect.innerHTML = '<option value="">먼저 학과를 선택해주세요</option>';
            jobSelect.disabled = true;
            panel.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-info-circle fa-2x mb-2"></i>
                    <p class="mb-0">학과와 직업을 선택하면 주요 정보를 보여드립니다.</p>
                </div>`;
            return;
        }

        // 학과 선택 시 해당 학과의 모든 진로 표시
        const jobOptions = selectedMajor.jobs.map(job => `<option value="${job}">${job}</option>`).join('');
        jobSelect.innerHTML = `<option value="">직업을 선택하세요</option>${jobOptions}`;
        jobSelect.disabled = false;
        
        // 학과 선택 시 해당 학과의 진로 목록 미리보기 표시
        if (selectedMajor.careers && selectedMajor.careers.length > 0) {
            const careerPreview = selectedMajor.careers.map(career => {
                return `
                    <div class="card mb-2">
                        <div class="card-body p-3">
                            <h6 class="card-title mb-2">${career.career}</h6>
                            <div class="small text-muted">
                                <div><i class="fas fa-certificate me-1"></i>필요자격: ${career.qualification || '-'}</div>
                                <div><i class="fas fa-won-sign me-1"></i>연봉: ${career.salary || '-'}</div>
                                <div><i class="fas fa-building me-1"></i>취업처: ${career.workplaces || '-'}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            panel.innerHTML = `
                <div class="mb-3">
                    <h5><i class="fas fa-graduation-cap me-2"></i>${selectedMajor.name} 진로 정보</h5>
                    <p class="text-muted">아래 진로 중 하나를 선택하면 상세 정보를 확인할 수 있습니다.</p>
                </div>
                <div class="career-preview">
                    ${careerPreview}
                </div>
            `;
        }
    });

    jobSelect.addEventListener('change', () => {
        renderCareerInformation(jobSelect.value, majorSelect.value);
    });
}

function renderCareerInformation(jobName, majorId) {
    const panel = document.getElementById('career-info-panel');
    if (!panel) return;

    if (!jobName) {
        panel.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-info-circle fa-2x mb-2"></i>
                <p class="mb-0">관심 직업을 선택하면 상세 정보를 확인할 수 있습니다.</p>
            </div>`;
        return;
    }

    const jobInfo = careerJobDetails[jobName];
    const majorInfo = careerMajors.find(major => major.id === majorId);

    if (!jobInfo) {
        panel.innerHTML = `
            <div class="alert alert-warning mb-0">
                <p class="mb-0">선택한 직업에 대한 정보를 찾을 수 없습니다.</p>
            </div>`;
        return;
    }

    // 필요자격증 목록 생성 (중복 제거)
    const requiredCerts = jobInfo.certifications || [];
    const uniqueCerts = [...new Set(requiredCerts)];

    // 자격증 정보 매칭 (부분 일치 포함)
    const matchedCertifications = [];
    uniqueCerts.forEach(certName => {
        // 정확한 이름으로 찾기
        let cert = certificationDetails[certName];
        
        // 부분 일치로 찾기
        if (!cert) {
            for (const [key, value] of Object.entries(certificationDetails)) {
                if (key.includes(certName) || certName.includes(key)) {
                    cert = value;
                    certName = key; // 실제 자격증명으로 업데이트
                    break;
                }
            }
        }
        
        if (cert) {
            matchedCertifications.push({ name: certName, info: cert });
        } else {
            // 자격증 정보가 없어도 표시
            matchedCertifications.push({ name: certName, info: null });
        }
    });

    const certificationList = matchedCertifications.map(({ name, info }) => {
        if (!info) {
            return `<li class="list-group-item">
                        <div class="fw-bold">${name}</div>
                        <small class="text-muted">상세 정보는 추후 업데이트 예정입니다.</small>
                    </li>`;
        }
        return `
            <li class="list-group-item">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center mb-2">
                            <div class="fw-bold me-2">${name}</div>
                            ${info.category ? `<span class="badge bg-secondary-subtle text-secondary">${info.category}</span>` : ''}
                        </div>
                        <div class="row g-2 small text-muted">
                            <div class="col-md-6">
                                <i class="fas fa-building me-1"></i><strong>발급기관:</strong> ${info.agency || '-'}
                            </div>
                            <div class="col-md-6">
                                <i class="fas fa-user-graduate me-1"></i><strong>응시자격:</strong> ${info.requirement || '-'}
                            </div>
                            ${info.subjects ? `<div class="col-md-6">
                                <i class="fas fa-book me-1"></i><strong>시험과목:</strong> ${info.subjects}
                            </div>` : ''}
                            ${info.preparationPeriod ? `<div class="col-md-6">
                                <i class="fas fa-calendar me-1"></i><strong>준비기간:</strong> ${info.preparationPeriod}
                            </div>` : ''}
                            <div class="col-md-6">
                                <i class="fas fa-won-sign me-1"></i><strong>연봉/처우:</strong> ${info.salary || '-'}
                            </div>
                            <div class="col-md-6">
                                <i class="fas fa-clock me-1"></i><strong>유효기간:</strong> ${info.validity || '-'}
                            </div>
                            <div class="col-12">
                                <i class="fas fa-briefcase me-1"></i><strong>주요 취업처:</strong> ${info.workplaces || '-'}
                            </div>
                        </div>
                    </div>
                    <span class="badge ${info.difficulty === '높음' || info.difficulty === '상' ? 'bg-danger' : info.difficulty === '중간' || info.difficulty === '중' ? 'bg-warning' : 'bg-success'} ms-2">${info.difficulty || '-'}</span>
                </div>
            </li>`;
    }).join('');

    const certificationHtml = matchedCertifications.length > 0
        ? `<ul class="list-group list-group-flush">${certificationList}</ul>`
        : `<div class="text-muted">추천 자격증 정보가 필요하지 않은 직무입니다.</div>`;

    // 로드맵 정보 가져오기
    const loadmap = loadmapByCareer[jobName] || [];
    const loadmapHtml = loadmap.length > 0 ? `
        <div class="mt-4">
            <h5 class="mb-3"><i class="fas fa-route me-2"></i>진로 로드맵</h5>
            <div class="timeline">
                ${loadmap.map((step, index) => `
                    <div class="timeline-item mb-4">
                        <div class="d-flex">
                            <div class="timeline-marker me-3">
                                <div class="timeline-number">${index + 1}</div>
                            </div>
                            <div class="flex-grow-1">
                                <div class="card">
                                    <div class="card-body">
                                        <h6 class="card-title mb-2">
                                            <i class="fas fa-step-forward me-2 text-primary"></i>${step.stage}
                                        </h6>
                                        <p class="card-text mb-2">${step.content}</p>
                                        <div class="small text-muted mb-2">
                                            <i class="fas fa-calendar-alt me-1"></i><strong>예상기간:</strong> ${step.period}
                                        </div>
                                        ${step.requiredCert ? `<div class="small text-info">
                                            <i class="fas fa-certificate me-1"></i><strong>필수자격증:</strong> ${step.requiredCert}
                                        </div>` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    panel.innerHTML = `
        <div class="career-summary">
            ${majorInfo ? `<span class="badge bg-primary-subtle text-primary mb-2">추천 학과: ${majorInfo.name}</span>` : ''}
            <h4 class="fw-bold">${jobName}</h4>
            <p class="text-muted mb-4">${jobInfo.description || jobName}</p>
            ${jobInfo.strategy ? `<div class="alert alert-info mb-3">
                <strong><i class="fas fa-lightbulb me-2"></i>준비전략:</strong> ${jobInfo.strategy}
            </div>` : ''}
            <div class="row g-3 career-meta">
                <div class="col-md-4">
                    <div class="meta-box">
                        <div class="meta-label">필요 자격</div>
                        <div class="meta-value">${jobInfo.qualification || '-'}</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="meta-box">
                        <div class="meta-label">예상 연봉(초봉)</div>
                        <div class="meta-value">${jobInfo.salary || '-'}</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="meta-box">
                        <div class="meta-label">취업처</div>
                        <div class="meta-value">${jobInfo.workplaces || '-'}</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="mt-4">
            <h5 class="mb-3"><i class="fas fa-id-card me-2"></i>추천 자격증</h5>
            ${certificationHtml}
        </div>
        ${loadmapHtml}
    `;
}

// 자격증별 관련 직업 표시 함수
function renderJobsByCertificate(certName) {
    const panel = document.getElementById('certificate-jobs-panel');
    if (!panel) return;

    // 자격증 정보 가져오기
    const certInfo = certificationDetails[certName];
    if (!certInfo) {
        panel.innerHTML = `
            <div class="alert alert-warning mb-0">
                <p class="mb-0">선택한 자격증에 대한 정보를 찾을 수 없습니다.</p>
            </div>`;
        return;
    }

    // 해당 자격증을 필요로 하는 직업 찾기
    const relatedJobs = [];
    
    // Guide.csv 데이터에서 해당 자격증을 필요로 하는 진로 찾기
    careerGuideData.forEach(row => {
        const requiredQuals = (row['필요자격증'] || '').toLowerCase();
        const certNameLower = certName.toLowerCase();
        
        // 부분 일치 검색 (자격증명이 필요자격증에 포함되어 있는지)
        if (requiredQuals.includes(certNameLower) || 
            certNameLower.includes(requiredQuals) ||
            requiredQuals.split(/[+또는및,]/).some(q => {
                const trimmed = q.trim();
                return trimmed.includes(certNameLower) || certNameLower.includes(trimmed);
            })) {
            const career = row['진로'] || '';
            if (career && !relatedJobs.find(j => j.career === career)) {
                relatedJobs.push({
                    career: career,
                    major: row['학과'] || '',
                    qualification: row['필요자격증'] || '',
                    workplaces: row['주요 취업처'] || '',
                    salary: row['초봉/연봉'] || '',
                    strategy: row['준비전략'] || ''
                });
            }
        }
    });

    // 자격증 정보 표시 (새로운 필드 포함)
    const certInfoHtml = `
        <div class="card mb-4">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fas fa-id-card me-2"></i>${certName}</h5>
                ${certInfo.category ? `<span class="badge bg-light text-dark">${certInfo.category}</span>` : ''}
            </div>
            <div class="card-body">
                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="small">
                            <strong><i class="fas fa-building me-1"></i>발급/관리기관:</strong> ${certInfo.agency || '-'}
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="small">
                            <strong><i class="fas fa-user-graduate me-1"></i>응시자격:</strong> ${certInfo.requirement || '-'}
                        </div>
                    </div>
                    ${certInfo.subjects ? `<div class="col-md-6">
                        <div class="small">
                            <strong><i class="fas fa-book me-1"></i>시험과목:</strong> ${certInfo.subjects}
                        </div>
                    </div>` : ''}
                    ${certInfo.preparationPeriod ? `<div class="col-md-6">
                        <div class="small">
                            <strong><i class="fas fa-calendar me-1"></i>준비기간:</strong> ${certInfo.preparationPeriod}
                        </div>
                    </div>` : ''}
                    <div class="col-md-6">
                        <div class="small">
                            <strong><i class="fas fa-won-sign me-1"></i>연봉/처우:</strong> ${certInfo.salary || '-'}
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="small">
                            <strong><i class="fas fa-clock me-1"></i>유효기간:</strong> ${certInfo.validity || '-'}
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="small">
                            <strong><i class="fas fa-briefcase me-1"></i>주요 취업처:</strong> ${certInfo.workplaces || '-'}
                        </div>
                    </div>
                    <div class="col-12">
                        <span class="badge ${certInfo.difficulty === '높음' || certInfo.difficulty === '상' ? 'bg-danger' : certInfo.difficulty === '중간' || certInfo.difficulty === '중' ? 'bg-warning' : 'bg-success'}">
                            난이도: ${certInfo.difficulty || '-'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 관련 직업 목록 표시
    if (relatedJobs.length === 0) {
        panel.innerHTML = certInfoHtml + `
            <div class="alert alert-info mb-0">
                <p class="mb-0"><i class="fas fa-info-circle me-2"></i>해당 자격증을 필요로 하는 직업 정보를 찾을 수 없습니다.</p>
            </div>`;
        return;
    }

    const jobsList = relatedJobs.map((job, index) => {
        return `
            <div class="card mb-3 job-card" data-job-name="${job.career}" style="cursor: pointer; transition: all 0.2s;">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h5 class="card-title mb-2">
                                <i class="fas fa-briefcase me-2 text-primary"></i>${job.career}
                            </h5>
                            ${job.major ? `<div class="small text-muted mb-2">
                                <i class="fas fa-graduation-cap me-1"></i>관련 학과: ${job.major}
                            </div>` : ''}
                            <div class="small text-muted mb-1">
                                <i class="fas fa-won-sign me-1"></i>연봉: ${job.salary || '-'}
                            </div>
                            <div class="small text-muted">
                                <i class="fas fa-building me-1"></i>취업처: ${job.workplaces || '-'}
                            </div>
                        </div>
                        <i class="fas fa-chevron-right text-muted"></i>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    panel.innerHTML = certInfoHtml + `
        <div class="mb-3">
            <h5><i class="fas fa-briefcase me-2"></i>이 자격증으로 취업할 수 있는 직업 (${relatedJobs.length}개)</h5>
            <p class="text-muted small">아래 직업을 클릭하면 상세 정보를 확인할 수 있습니다.</p>
        </div>
        ${jobsList}
    `;

    // 직업 카드 클릭 이벤트 리스너 추가
    panel.querySelectorAll('.job-card').forEach(card => {
        card.addEventListener('click', function() {
            const jobName = this.getAttribute('data-job-name');
            if (jobName) {
                showJobDetail(jobName);
            }
        });
        
        // 호버 효과
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    });
}

// 직업 상세 정보 표시 함수 (자격증 탭에서 호출) - 전역 함수
window.showJobDetail = function(jobName) {
    // 학과별 진로 찾기 탭으로 전환
    const certTab = document.getElementById('cert-tab');
    const majorTab = document.getElementById('major-tab');
    if (certTab && majorTab) {
        certTab.classList.remove('active');
        majorTab.classList.add('active');
        
        const certPanel = document.getElementById('cert-panel');
        const majorPanel = document.getElementById('major-panel');
        if (certPanel && majorPanel) {
            certPanel.classList.remove('show', 'active');
            majorPanel.classList.add('show', 'active');
        }
    }

    // 해당 직업이 속한 학과 찾기
    const jobMajor = careerMajors.find(major => major.jobs.includes(jobName));
    if (jobMajor) {
        const majorSelect = document.getElementById('career-major-select');
        const jobSelect = document.getElementById('career-job-select');
        
        if (majorSelect) {
            majorSelect.value = jobMajor.id;
            majorSelect.dispatchEvent(new Event('change'));
        }
        
        // 직업 선택
        setTimeout(() => {
            if (jobSelect) {
                jobSelect.value = jobName;
                jobSelect.dispatchEvent(new Event('change'));
            }
        }, 100);
    } else {
        // 학과를 찾을 수 없으면 직접 직업 정보 표시
        renderCareerInformation(jobName, '');
    }
}

function getFilteredScoresForEvent(eventName, gender) {
    const rawData = getAllEventData(eventName, gender);
    if (!rawData || rawData.length === 0) {
        return [];
    }
    
    let scores = rawData.map(item => item.score).filter(score => {
        if (eventName === '10m_dash' && score > 20) {
            return false;
        }
        return true;
    });
    
    return removeOutliers(scores, eventName);
}

function getTopTenThreshold(eventName, gender) {
    const filteredScores = getFilteredScoresForEvent(eventName, gender);
    if (filteredScores.length === 0) {
        return null;
    }
    
    const percentileTarget = higherIsBetterEvents.includes(eventName) ? 90 : 10;
    return calculatePercentile(filteredScores, percentileTarget);
}

// 평균 계산
function calculateMean(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

// 표준편차 계산
function calculateStd(values) {
    const mean = calculateMean(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
}

// 백분위수 계산
function calculatePercentile(sortedValues, percentile) {
    const sorted = [...sortedValues].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    if (lower === upper) {
        return sorted[lower];
    }
    
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

// 높을수록 좋은 종목 목록 (낮을수록 좋은 종목: 10m_dash, 20m_dash, long_run)
const higherIsBetterEvents = ['standing_long_jump', 'vertical_jump', 'grip_strength', 'sit_up', 'medicine_ball_throw', 'front_bend'];
const lowerIsBetterEvents = ['10m_dash', '20m_dash', 'long_run'];

// 백분위수 계산 (성별 필터 포함) - 이상치 제거 버전과 동일한 데이터 사용
function calculateScorePercentile(eventName, score, genderFilter = '전체') {
    const allEventData = getAllEventData(eventName, genderFilter);
    
    if (allEventData.length === 0) {
        return null;
    }
    
    // 통계 계산과 동일한 이상치 제거 로직 적용
    let scores = allEventData.map(item => item.score);
    
    // 10m 달리기의 경우 20초 이상인 이상치 제거
    scores = scores.filter(score => {
        if (eventName === '10m_dash' && score > 20) {
            return false;
        }
        return true;
    });
    
    // 이상치 제거 적용
    scores = removeOutliers(scores, eventName);
    
    if (scores.length === 0) {
        return null;
    }
    
    // 종목이 높을수록 좋은지, 낮을수록 좋은지 확인
    const isHigherBetter = higherIsBetterEvents.includes(eventName);
    
    let betterCount;
    
    if (isHigherBetter) {
        // 높을수록 좋은 종목: 점수보다 높은 값들의 개수
        betterCount = scores.filter(s => s > score).length;
    } else {
        // 낮을수록 좋은 종목: 점수보다 낮은 값들의 개수
        betterCount = scores.filter(s => s < score).length;
    }
    
    // 백분위수 계산: 나보다 좋은(높은 또는 낮은) 점수의 비율
    const percentile = (betterCount / scores.length) * 100;
    
    // percentile이 클수록 더 많은 사람이 나보다 좋은 점수를 받았다는 의미
    // 따라서 percentile이 "하위권 비율"을 나타냄
    return percentile;
}

// 종목 데이터 로드
function loadEventData() {
    if (!currentEvent) {
        updateStatus('먼저 종목을 선택해주세요.', 'warning');
        return;
    }
    
    // 성별 필터 가져오기
    const genderFilter = document.getElementById('gender-filter').value;
    
    // 데이터 분포 섹션 표시
    const distributionSection = document.getElementById('data-distribution');
    distributionSection.style.display = 'block';
    
    // 로딩 스피너는 card-body 내부에 표시
    const cardBody = distributionSection.querySelector('.card-body');
    
    cardBody.innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">로딩 중...</span>
            </div>
            <p class="mt-3">데이터를 처리하고 있습니다...</p>
        </div>
    `;
    
    setTimeout(() => {
        const stats = getEventStatistics(currentEvent, genderFilter);
        
        if (!stats) {
            cardBody.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    해당 종목의 데이터를 찾을 수 없습니다.
                </div>
            `;
            updateStatus('해당 종목의 데이터를 찾을 수 없습니다.', 'danger');
            return;
        }
        
        currentEventStats = stats;
        
        // 원래 내용 복원 - 성별별 비교 차트
        cardBody.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <div style="height: 400px;">
                        <canvas id="distributionChart"></canvas>
                    </div>
                </div>
                <div class="col-md-4">
                    <div id="statistics-info"></div>
                </div>
            </div>
        `;
        
        displayEventStatistics(stats, genderFilter);
        createGenderComparisonChart(stats, genderFilter);
        
        document.getElementById('data-distribution').scrollIntoView({ 
            behavior: 'smooth' 
        });
        
        const filterText = genderFilter === '전체' ? '전체 성별' : `${genderFilter}학생`;
        updateStatus(`${filterText} 데이터 분석 완료! 개인 기록을 입력하세요.`, 'success');
    }, 300);
}

// 종목 통계 표시 (성별별 비교)
function displayEventStatistics(stats, currentFilter = '전체') {
    const container = document.getElementById('statistics-info');
    if (!container) {
        console.error('통계 정보 컨테이너를 찾을 수 없습니다.');
        return;
    }
    
    const eventName = eventDisplayNames[currentEvent];
    
    let html = '';
    
    // 선택된 성별에 따라 통계 표시
    if (currentFilter === '전체') {
        // 남학생과 여학생 통계 가져오기
        const maleStats = getEventStatistics(currentEvent, '남');
        const femaleStats = getEventStatistics(currentEvent, '여');
        
        html = `<h5>${eventName} 통계 비교</h5>`;
        
        if (maleStats && femaleStats) {
        html += `
            <div class="mt-3">
                <h6 class="text-primary">남학생 통계</h6>
                <div class="stat-item">
                    <div class="stat-value">${maleStats.count}</div>
                    <div class="stat-label">총 데이터 수</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${formatStatValue(maleStats.mean, currentEvent)}</div>
                    <div class="stat-label">평균</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${formatStatValue(maleStats.min, currentEvent)} ~ ${formatStatValue(maleStats.max, currentEvent)}</div>
                    <div class="stat-label">최솟값 ~ 최댓값</div>
                </div>
            </div>
            <hr class="my-3">
            <div>
                <h6 class="text-danger">여학생 통계</h6>
                <div class="stat-item">
                    <div class="stat-value">${femaleStats.count}</div>
                    <div class="stat-label">총 데이터 수</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${formatStatValue(femaleStats.mean, currentEvent)}</div>
                    <div class="stat-label">평균</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${formatStatValue(femaleStats.min, currentEvent)} ~ ${formatStatValue(femaleStats.max, currentEvent)}</div>
                    <div class="stat-label">최솟값 ~ 최댓값</div>
                </div>
            </div>
        `;
        }
    } else {
        // 특정 성별만 선택된 경우
        const selectedStats = getEventStatistics(currentEvent, currentFilter);
        
        if (selectedStats && selectedStats.count > 0) {
            const genderText = currentFilter === '남' ? '남학생' : '여학생';
            
            html = `<h5>${eventName} ${genderText} 통계</h5>`;
            html += `<p class="text-muted mb-3"><small>${genderText} 기준</small></p>`;
            html += `
                <div class="stat-item">
                    <div class="stat-value">${selectedStats.count}</div>
                    <div class="stat-label">총 데이터 수</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${formatStatValue(selectedStats.mean, currentEvent)}</div>
                    <div class="stat-label">평균</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${formatStatValue(selectedStats.min, currentEvent)} ~ ${formatStatValue(selectedStats.max, currentEvent)}</div>
                    <div class="stat-label">최솟값 ~ 최댓값</div>
                </div>
            `;
        } else {
            html = `<h5>${eventName}</h5>`;
            html += `<div class="alert alert-info">선택한 성별의 데이터가 없습니다.</div>`;
        }
    }
    
    container.innerHTML = html;
}

// 히스토그램 데이터 생성
function generateHistogramData(scores, bins = 30) {
    if (scores.length === 0) return { labels: [], data: [] };
    
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min;
    
    // 기록이 모두 정수인지 확인
    const isAllIntegers = scores.every(score => score % 1 === 0);
    
    let optimalBins, binSize;
    
    if (isAllIntegers) {
        // 정수 종목: 각 정수마다 빈을 생성하거나, 합리적인 구간으로 나눔
        const uniqueCount = [...new Set(scores)].length;
        if (range <= 30) {
            // 작은 범위: 각 정수마다 빈
            optimalBins = range + 1;
            binSize = 1;
        } else if (range <= 100) {
            // 중간 범위: 5단위로 구간 생성
            optimalBins = Math.ceil(range / 5);
            binSize = 5;
        } else {
            // 큰 범위: 10단위로 구간 생성
            optimalBins = Math.ceil(range / 10);
            binSize = 10;
        }
    } else {
        // 소수 종목: 더 많은 구간으로 나눔
        optimalBins = bins;
        binSize = range / optimalBins;
    }
    
    const histogram = Array(optimalBins).fill(0);
    const binLabels = [];
    
    scores.forEach(score => {
        const binIndex = Math.min(Math.floor((score - min) / binSize), optimalBins - 1);
        histogram[binIndex]++;
    });
    
    for (let i = 0; i < optimalBins; i++) {
        if (isAllIntegers) {
            // 정수 종목: 빈 시작값을 정수로 표시
            const binStartValue = min + i * binSize;
            binLabels.push(Math.round(binStartValue));
        } else {
            // 소수 종목: 빈 시작값을 소수점 1자리로 표시
            const binStartValue = min + i * binSize;
            binLabels.push(binStartValue.toFixed(1));
        }
    }
    
    return { labels: binLabels, data: histogram };
}

// 성별 비교 히스토그램 차트 생성
function createGenderComparisonChart(stats, currentFilter) {
    const canvas = document.getElementById('distributionChart');
    if (!canvas) {
        console.error('분포 차트 캔버스를 찾을 수 없습니다.');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (distributionChart) {
        distributionChart.destroy();
    }
    chartMarkers.personal = null;
    chartMarkers.top10 = null;
    
    const datasets = [];
    let labels = [];
    
    // 선택된 성별에 따라 데이터 필터링
    if (currentFilter === '전체') {
        // 남학생 히스토그램
        const maleData = getAllEventData(currentEvent, '남');
        if (maleData.length > 0) {
            let filteredMaleScores = maleData.map(item => item.score).filter(score => {
                if (currentEvent === '10m_dash' && score > 20) return false;
                return true;
            });
            filteredMaleScores = removeOutliers(filteredMaleScores, currentEvent);
            const maleHistogram = generateHistogramData(filteredMaleScores);
            datasets.push({
                label: '남학생',
                data: maleHistogram.data,
                backgroundColor: 'rgba(54, 162, 235, 0.4)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            });
        }
        
        // 여학생 히스토그램
        const femaleData = getAllEventData(currentEvent, '여');
        if (femaleData.length > 0) {
            let filteredFemaleScores = femaleData.map(item => item.score).filter(score => {
                if (currentEvent === '10m_dash' && score > 20) return false;
                return true;
            });
            filteredFemaleScores = removeOutliers(filteredFemaleScores, currentEvent);
            const femaleHistogram = generateHistogramData(filteredFemaleScores);
            datasets.push({
                label: '여학생',
                data: femaleHistogram.data,
                backgroundColor: 'rgba(255, 99, 132, 0.4)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            });
        }
        
        // 라벨 생성 (전체)
        let allScores = [];
        const maleDataAll = getAllEventData(currentEvent, '남');
        const femaleDataAll = getAllEventData(currentEvent, '여');
        
        maleDataAll.forEach(item => {
            if (!(currentEvent === '10m_dash' && item.score > 20)) {
                allScores.push(item.score);
            }
        });
        femaleDataAll.forEach(item => {
            if (!(currentEvent === '10m_dash' && item.score > 20)) {
                allScores.push(item.score);
            }
        });
        
        // 이상치 제거
        allScores = removeOutliers(allScores, currentEvent);
        
        labels = generateHistogramData(allScores).labels;
    } else {
        // 선택된 성별만 표시
        const selectedData = getAllEventData(currentEvent, currentFilter);
        if (selectedData.length > 0) {
            let filteredScores = selectedData.map(item => item.score).filter(score => {
                if (currentEvent === '10m_dash' && score > 20) return false;
                return true;
            });
            filteredScores = removeOutliers(filteredScores, currentEvent);
            const histogram = generateHistogramData(filteredScores);
            
            const genderLabel = currentFilter === '남' ? '남학생' : '여학생';
            const backgroundColor = currentFilter === '남' ? 'rgba(54, 162, 235, 0.4)' : 'rgba(255, 99, 132, 0.4)';
            const borderColor = currentFilter === '남' ? 'rgba(54, 162, 235, 1)' : 'rgba(255, 99, 132, 1)';
            
            datasets.push({
                label: genderLabel,
                data: histogram.data,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 1
            });
            
            labels = histogram.labels;
        }
    }
    
    ensureChartMarkerPlugin();
    
    distributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.slice(0, datasets[0]?.data.length || 30),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                title: {
                    display: true,
                    text: currentFilter === '전체' ? 
                        `${eventDisplayNames[currentEvent]} 성별별 기록 분포` :
                        `${eventDisplayNames[currentEvent]} ${currentFilter === '남' ? '남학생' : '여학생'} 기록 분포`,
                    font: {
                        size: 23,
                        weight: 'bold'
                    },
                    color: '#333'
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 19
                        },
                        color: '#333'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return `${context.dataset.label}: ${value}명`;
                        }
                    },
                    bodyFont: {
                        size: 19
                    },
                    titleFont: {
                        size: 19
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '학생 수',
                        font: {
                            size: 19,
                            weight: 'bold'
                        },
                        color: '#333'
                    },
                    ticks: {
                        font: {
                            size: 17
                        },
                        color: '#555'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '기록',
                        font: {
                            size: 19,
                            weight: 'bold'
                        },
                        color: '#333'
                    },
                    ticks: {
                        maxRotation: 45,
                        font: {
                            size: 17
                        },
                        color: '#555',
                        callback: function(value, index) {
                            // 구간 수에 따라 적절한 간격으로 라벨 표시
                            const totalLabels = labels.length;
                            let step;
                            if (totalLabels <= 10) {
                                step = 1; // 모든 라벨 표시
                            } else if (totalLabels <= 20) {
                                step = 2; // 2개마다
                            } else if (totalLabels <= 40) {
                                step = 5; // 5개마다
                            } else {
                                step = Math.ceil(totalLabels / 15); // 최대 15개
                            }
                            
                            if (index % step === 0) {
                                return labels[value];
                            }
                            return '';
                        }
                    }
                }
            }
        }
    });
}

// 분포 차트 생성 (기존 함수, 호환성 유지)
function createDistributionChart(stats) {
    const canvas = document.getElementById('distributionChart');
    if (!canvas) {
        console.error('분포 차트 캔버스를 찾을 수 없습니다.');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (distributionChart) {
        distributionChart.destroy();
    }
    chartMarkers.personal = null;
    chartMarkers.top10 = null;
    
    const labels = ['25%', '50%', '75%', '90%', '95%'];
    const values = [
        stats.percentiles['25'],
        stats.percentiles['50'],
        stats.percentiles['75'],
        stats.percentiles['90'],
        stats.percentiles['95']
    ];
    
    const genderText = stats.genderFilter === '전체' ? '전체' : `${stats.genderFilter}학생`;
    const chartTitle = `${eventDisplayNames[currentEvent]} (${genderText})`;
    
    ensureChartMarkerPlugin();
    
    distributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: eventDisplayNames[currentEvent],
                data: values,
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(255, 193, 7, 0.8)',
                    'rgba(220, 53, 69, 0.8)',
                    'rgba(40, 167, 69, 0.8)'
                ],
                borderColor: [
                    'rgba(102, 126, 234, 1)',
                    'rgba(118, 75, 162, 1)',
                    'rgba(255, 193, 7, 1)',
                    'rgba(220, 53, 69, 1)',
                    'rgba(40, 167, 69, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: chartTitle,
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '기록'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '백분위수'
                    }
                }
            }
        }
    });
}

// 개인 기록 분석
function analyzePersonalScore() {
    if (!currentEvent) {
        updateStatus('먼저 종목을 선택해주세요.', 'warning');
        return;
    }
    
    const scoreInput = document.getElementById('personal-score');
    const score = parseFloat(scoreInput.value);
    const gender = document.getElementById('student-gender').value;
    
    if (!score || isNaN(score)) {
        updateStatus('유효한 기록을 입력해주세요.', 'warning');
        return;
    }
    
    if (!gender) {
        updateStatus('성별을 선택해주세요.', 'warning');
        return;
    }
    
    // 로딩 표시
    const resultContent = document.getElementById('result-content');
    const originalContent = resultContent.innerHTML;
    
    resultContent.innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">로딩 중...</span>
            </div>
            <p class="mt-3">데이터를 처리하고 있습니다...</p>
        </div>
    `;
    
    setTimeout(() => {
        const percentile = calculateScorePercentile(currentEvent, score, gender);
        
        if (percentile === null) {
            resultContent.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    해당 종목의 데이터를 찾을 수 없습니다.
                </div>
            `;
            updateStatus('해당 종목의 데이터를 찾을 수 없습니다.', 'danger');
            return;
        }
        
        const stats = getEventStatistics(currentEvent, gender);
        displayAnalysisResult({
            score: score,
            percentile: percentile,
            statistics: stats,
            gender: gender
        });
        
        // 히스토그램에 개인 위치 표시
        displayPersonalPositionOnChart(score, gender);
        
        document.getElementById('analysis-result').scrollIntoView({ 
            behavior: 'smooth' 
        });
        
        updateStatus('분석이 완료되었습니다.', 'success');
    }, 300);
}

function calculateRelativePosition(score, labelValues, avgBinSize) {
    if (!labelValues || labelValues.length === 0 || isNaN(score)) {
        return null;
    }
    
    const barCount = labelValues.length;
    let targetIndex = 0;
    
    for (let i = 0; i < barCount; i++) {
        const binStart = labelValues[i];
        const binEnd = (i < barCount - 1) ? labelValues[i + 1] : binStart + avgBinSize;
        const isLast = i === barCount - 1;
        
        if (score <= labelValues[0]) {
            targetIndex = 0;
            break;
        }
        
        if (score >= binStart && (score < binEnd || (isLast && score <= binEnd))) {
            targetIndex = i;
            break;
        }
        
        if (score > binEnd && isLast) {
            targetIndex = barCount - 1;
        }
    }
    
    return (targetIndex + 0.5) / barCount;
}

// 히스토그램에 개인 위치 표시
function displayPersonalPositionOnChart(score, gender) {
    if (!distributionChart) {
        return;
    }
    
    setTimeout(() => {
        const labels = distributionChart.data.labels;
        if (!labels || labels.length === 0) return;
        
        // 라벨을 숫자로 변환
        const labelValues = labels.map(label => {
            const num = parseFloat(label.toString().replace(/[^0-9.-]/g, ''));
            return isNaN(num) ? null : num;
        }).filter(v => v !== null);
        
        if (labelValues.length === 0) return;
        
        // bin 크기 계산 (인접 라벨 간의 차이)
        const binSizes = [];
        for (let i = 1; i < labelValues.length; i++) {
            binSizes.push(labelValues[i] - labelValues[i-1]);
        }
        const avgBinSize = binSizes.length > 0 ? 
            binSizes.reduce((a, b) => a + b, 0) / binSizes.length : 5;
        
        const personalRelative = calculateRelativePosition(score, labelValues, avgBinSize);
        if (personalRelative === null) return;
        
        const unit = unitMap[currentEvent] ? ` ${unitMap[currentEvent]}` : '';
        const formattedScore = formatStatValue(score, currentEvent);
        
        chartMarkers.personal = {
            relativeX: personalRelative,
            color: 'rgba(255, 99, 132, 0.9)',
            dash: [10, 5],
            label: `내 기록: ${formattedScore}${unit}`,
            labelColor: 'rgba(255, 99, 132, 1)'
        };
        
        const topThreshold = getTopTenThreshold(currentEvent, gender);
        if (topThreshold !== null) {
            const topRelative = calculateRelativePosition(topThreshold, labelValues, avgBinSize);
            if (topRelative !== null) {
                const formattedTop = formatStatValue(topThreshold, currentEvent);
                chartMarkers.top10 = {
                    relativeX: topRelative,
                    color: 'rgba(37, 99, 235, 0.95)',
                    dash: [6, 6],
                    label: `상위 10%선: ${formattedTop}${unit}`,
                    labelColor: 'rgba(37, 99, 235, 1)'
                };
            } else {
                chartMarkers.top10 = null;
            }
        } else {
            chartMarkers.top10 = null;
        }
        
        distributionChart.update('none');
    }, 200);
}

// 분석 결과 표시
function displayAnalysisResult(data) {
    const container = document.getElementById('result-content');
    if (!container) {
        console.error('결과 컨테이너를 찾을 수 없습니다.');
        return;
    }
    
    const percentile = Math.round(data.percentile);
    const grade = getGradeFromPercentile(percentile);
    const eventName = eventDisplayNames[currentEvent];
    const genderText = data.gender === '남' ? '남학생' : '여학생';
    
    // 백분위수는 "해당 값 이하/이상의 비율"이므로, 100에서 빼서 "상위 비율"로 표시
    const upperPercent = 100 - percentile;
    
    const html = `
        <div class="row">
            <div class="col-12 mb-4">
                <h4><i class="fas fa-user me-2"></i>${eventName} 분석 결과</h4>
                <p class="text-muted">성별: ${genderText} | 입력 기록: ${data.score}</p>
            </div>
        </div>
        <div class="row">
            <div class="col-md-6">
                <div class="result-card">
                    <h5>백분위수</h5>
                    <div class="percentile-display ${grade.class}">${upperPercent}%</div>
                    <p class="text-center">${grade.text}</p>
                    <div class="progress mb-2">
                        <div class="progress-bar" style="width: ${upperPercent}%"></div>
                    </div>
                    <small>전체 ${data.statistics.count}명 중 상위 ${upperPercent}%</small>
                </div>
            </div>
            <div class="col-md-6">
                <div class="result-card">
                    <h5>상세 정보</h5>
                    <div class="row">
                        <div class="col-6">
                            <div class="stat-item">
                                <div class="stat-value">${data.statistics.mean.toFixed(2)}</div>
                                <div class="stat-label">평균</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="stat-item">
                                <div class="stat-value">${data.statistics.std.toFixed(2)}</div>
                                <div class="stat-label">표준편차</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="stat-item">
                                <div class="stat-value">${data.statistics.min.toFixed(2)}</div>
                                <div class="stat-label">최솟값</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="stat-item">
                                <div class="stat-value">${data.statistics.max.toFixed(2)}</div>
                                <div class="stat-label">최댓값</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="row mt-4">
            <div class="col-12">
                <div class="alert alert-info">
                    <h5><i class="fas fa-lightbulb me-2"></i>분석 결과 해석</h5>
                    <ul class="mb-0">
                        <li><strong>상위 90% 이상:</strong> 우수한 수준입니다.</li>
                        <li><strong>상위 75% 이상:</strong> 양호한 수준입니다.</li>
                        <li><strong>상위 50% 이상:</strong> 평균 수준입니다.</li>
                        <li><strong>상위 25% 이상:</strong> 개선이 필요합니다.</li>
                        <li><strong>상위 25% 미만:</strong> 집중적인 훈련이 필요합니다.</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// 백분위수에 따른 등급 결정
// 백분위수 = 하위권 비율 (낮을수록 좋음)
// 상위권 비율로 변환하여 판정
function getGradeFromPercentile(percentile) {
    // percentile은 하위권 비율이므로 상위권 비율로 변환
    const rankingPercent = 100 - percentile;
    
    if (rankingPercent >= 90) {
        return { class: 'percentile-excellent', text: '우수' };
    } else if (rankingPercent >= 75) {
        return { class: 'percentile-good', text: '양호' };
    } else if (rankingPercent >= 50) {
        return { class: 'percentile-average', text: '보통' };
    } else if (rankingPercent >= 25) {
        return { class: 'percentile-poor', text: '개선필요' };
    } else {
        return { class: 'percentile-poor', text: '집중훈련' };
    }
}

// 기록 입력 검증
function validateScoreInput() {
    const input = document.getElementById('personal-score');
    const value = parseFloat(input.value);
    
    if (value < 0) {
        input.value = 0;
    }
}

// 로딩 스피너 표시 (더 이상 사용하지 않음)
function showLoadingSpinner(containerId) {
    // 이제 각 함수 내부에서 직접 처리합니다
}

// 로딩 스피너 숨김 (더 이상 사용하지 않음)
function hideLoadingSpinner(containerId) {
    // 이제 각 함수 내부에서 직접 처리합니다
}

// 상태 업데이트
function updateStatus(message, type = 'info') {
    const alert = document.getElementById('status-alert');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-info-circle me-2"></i>${message}
    `;
}
