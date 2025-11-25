import streamlit as st
import pandas as pd
import json
import os
from pathlib import Path
import plotly.graph_objects as go
import plotly.express as px
from collections import defaultdict
import numpy as np

# 페이지 설정
st.set_page_config(
    page_title="체육 진로 진학 프로그램 분석 시스템",
    page_icon="🏃",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 데이터 로드 함수들
@st.cache_data
def load_json_data(file_path):
    """JSON 파일 로드"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        st.error(f"파일 로드 오류: {file_path} - {str(e)}")
        return None

@st.cache_data
def load_csv_data(file_path):
    """CSV 파일 로드"""
    try:
        return pd.read_csv(file_path, encoding='utf-8')
    except Exception as e:
        st.error(f"CSV 파일 로드 오류: {file_path} - {str(e)}")
        return None

# 데이터 경로 설정
DATA_DIR = Path("data")
JINRO_DIR = Path("jinro")
LOGO_DIR = Path("logo")

# 종목 매핑
EVENT_MAPPING = {
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
}

EVENT_DISPLAY_NAMES = {
    'standing_long_jump': '제자리멀리뛰기',
    'vertical_jump': '서전트점프',
    'grip_strength': '배근력',
    'sit_up': '윗몸일으키기',
    '10m_dash': '10m 달리기',
    '20m_dash': '20m 달리기',
    'long_run': '오래달리기',
    'medicine_ball_throw': '메디신볼던지기',
    'front_bend': '앉아윗몸앞으로굽히기'
}

UNIT_MAP = {
    'standing_long_jump': 'cm',
    'vertical_jump': 'cm',
    'grip_strength': 'kg',
    'sit_up': '회',
    '10m_dash': '초',
    '20m_dash': '초',
    'long_run': '초',
    'medicine_ball_throw': 'm',
    'front_bend': 'cm'
}

# 지역명 매핑
REGION_NAMES = {
    'seoul': '서울',
    'inchoen': '인천',
    'jeju': '제주',
    'chungnam': '충남',
    'chungbuk': '충북',
    'deajeon': '대전',
    'kwangju': '광주'
}

def process_region_data(data, region):
    """지역 데이터 처리"""
    processed = []
    if not isinstance(data, list):
        return processed
    
    for item in data:
        if not isinstance(item, dict):
            continue
        
        processed_item = {
            'region': REGION_NAMES.get(region, region),
            'gender': item.get('성별', ''),
            'event': item.get('종목', ''),
            'score': item.get('기록', None)
        }
        
        # 기록을 숫자로 변환
        if processed_item['score'] is not None:
            try:
                processed_item['score'] = float(processed_item['score'])
            except (ValueError, TypeError):
                processed_item['score'] = None
        
        if processed_item['score'] is not None:
            processed.append(processed_item)
    
    return processed

@st.cache_data
def load_all_sports_data():
    """모든 지역의 체육 실기 데이터 로드"""
    all_data = {}
    regions = ['seoul', 'inchoen', 'jeju', 'chungnam', 'chungbuk', 'deajeon', 'kwangju']
    
    for region in regions:
        file_path = DATA_DIR / f"{region}.json"
        if file_path.exists():
            data = load_json_data(file_path)
            if data:
                all_data[region] = process_region_data(data, region)
    
    return all_data

def get_filtered_scores(event_key, gender, all_data):
    """특정 종목과 성별에 대한 점수 필터링"""
    scores = []
    
    for region, data in all_data.items():
        event_name = EVENT_MAPPING.get(region, {}).get(event_key, '')
        if not event_name:
            continue
        
        for item in data:
            if item['event'] == event_name and item['gender'] == gender:
                if item['score'] is not None:
                    scores.append(item['score'])
    
    return sorted(scores)

def calculate_percentile(score, scores, higher_is_better=True):
    """백분위 계산"""
    if not scores or score is None:
        return None
    
    if higher_is_better:
        below_count = sum(1 for s in scores if s < score)
    else:
        below_count = sum(1 for s in scores if s > score)
    
    percentile = (below_count / len(scores)) * 100
    return round(percentile, 2)

def get_top_10_threshold(scores, higher_is_better=True):
    """상위 10% 임계값 계산"""
    if not scores:
        return None
    
    sorted_scores = sorted(scores, reverse=higher_is_better)
    index = int(len(sorted_scores) * 0.1)
    if index >= len(sorted_scores):
        index = len(sorted_scores) - 1
    
    return sorted_scores[index]

def create_distribution_chart(scores, personal_score=None, top10_threshold=None, 
                              event_name="", unit="", higher_is_better=True):
    """분포 차트 생성"""
    if not scores:
        return None
    
    # 히스토그램 데이터 생성
    hist, bins = np.histogram(scores, bins=30)
    bin_centers = (bins[:-1] + bins[1:]) / 2
    
    fig = go.Figure()
    
    # 히스토그램 바
    fig.add_trace(go.Bar(
        x=bin_centers,
        y=hist,
        name='분포',
        marker_color='rgba(31, 111, 235, 0.6)',
        hovertemplate='기록: %{x:.2f} ' + unit + '<br>인원: %{y}<extra></extra>'
    ))
    
    # 개인 기록 선
    if personal_score is not None:
        fig.add_vline(
            x=personal_score,
            line_dash="solid",
            line_color="#ff6384",
            line_width=3,
            annotation_text="내 기록",
            annotation_position="top left",
            annotation_font_color="#ff6384",
            annotation_font_size=14
        )
    
    # 상위 10% 선
    if top10_threshold is not None:
        fig.add_vline(
            x=top10_threshold,
            line_dash="dash",
            line_color="#2563eb",
            line_width=2,
            annotation_text="상위 10%",
            annotation_position="top left",
            annotation_font_color="#2563eb",
            annotation_font_size=14
        )
    
    fig.update_layout(
        title=f"{event_name} 기록 분포",
        xaxis_title=f"기록 ({unit})",
        yaxis_title="인원",
        hovermode='x unified',
        template='plotly_white',
        height=400
    )
    
    return fig

# 메인 앱
def main():
    # 사이드바 - 로고 및 네비게이션
    with st.sidebar:
        if (LOGO_DIR / "logo.jpg").exists():
            st.image(str(LOGO_DIR / "logo.jpg"), width=200)
        else:
            st.title("🏃 체육 진로 진학 프로그램")
        
        st.markdown("---")
        page = st.radio(
            "메뉴 선택",
            ["📊 실기 성적 분석", "🎓 진로 및 자격증 정보"],
            label_visibility="collapsed"
        )
    
    if page == "📊 실기 성적 분석":
        show_analysis_page()
    else:
        show_career_page()

def show_analysis_page():
    """실기 성적 분석 페이지"""
    st.title("🏃 체육 실기 성적 분석 시스템")
    st.markdown("7개 시·도의 실기 데이터를 한 번에 비교하고, 내 기록을 기반으로 합격 가능성을 빠르게 확인하세요.")
    
    # 데이터 로드
    all_data = load_all_sports_data()
    
    if not all_data:
        st.error("데이터를 로드할 수 없습니다. 데이터 파일을 확인해주세요.")
        return
    
    # 종목 선택
    col1, col2 = st.columns([2, 1])
    
    with col1:
        event_options = {name: key for key, name in EVENT_DISPLAY_NAMES.items()}
        selected_event_name = st.selectbox(
            "분석할 종목을 선택하세요",
            options=list(EVENT_DISPLAY_NAMES.values()),
            key="event_select"
        )
        selected_event_key = event_options[selected_event_name]
    
    with col2:
        gender = st.selectbox("성별", ["남", "여"], key="gender_select")
    
    if not selected_event_key:
        st.info("종목을 선택해주세요.")
        return
    
    # 해당 종목의 데이터 필터링
    scores = get_filtered_scores(selected_event_key, gender, all_data)
    
    if not scores:
        st.warning(f"{selected_event_name} 종목의 {gender}성 데이터를 찾을 수 없습니다.")
        return
    
    # 통계 정보
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("총 인원", f"{len(scores):,}명")
    with col2:
        st.metric("평균", f"{np.mean(scores):.2f} {UNIT_MAP[selected_event_key]}")
    with col3:
        st.metric("중앙값", f"{np.median(scores):.2f} {UNIT_MAP[selected_event_key]}")
    with col4:
        st.metric("표준편차", f"{np.std(scores):.2f}")
    
    st.markdown("---")
    
    # 개인 기록 입력
    st.subheader("📝 개인 기록 입력")
    col1, col2 = st.columns([1, 2])
    
    with col1:
        higher_is_better = selected_event_key not in ['10m_dash', '20m_dash', 'long_run']
        unit = UNIT_MAP[selected_event_key]
        
        personal_score = st.number_input(
            f"내 기록 ({unit})",
            min_value=0.0,
            value=float(np.median(scores)) if scores else 0.0,
            step=0.01 if unit in ['초', 'm'] else 1.0,
            key="personal_score"
        )
    
    with col2:
        if personal_score is not None and personal_score > 0:
            percentile = calculate_percentile(personal_score, scores, higher_is_better)
            top10_threshold = get_top_10_threshold(scores, higher_is_better)
            
            if percentile is not None:
                # 백분위 등급
                if percentile >= 90:
                    grade = "우수"
                    grade_color = "green"
                elif percentile >= 70:
                    grade = "양호"
                    grade_color = "blue"
                elif percentile >= 50:
                    grade = "보통"
                    grade_color = "orange"
                else:
                    grade = "미흡"
                    grade_color = "red"
                
                st.metric("내 백분위", f"{percentile:.1f}%", f"{grade} ({grade_color})")
                
                if top10_threshold is not None:
                    if higher_is_better:
                        diff = personal_score - top10_threshold
                        st.info(f"상위 10% 기준: {top10_threshold:.2f} {unit} (차이: {diff:+.2f} {unit})")
                    else:
                        diff = top10_threshold - personal_score
                        st.info(f"상위 10% 기준: {top10_threshold:.2f} {unit} (차이: {diff:+.2f} {unit})")
    
    st.markdown("---")
    
    # 분포 차트
    st.subheader("📊 기록 분포")
    if personal_score and personal_score > 0:
        top10_threshold = get_top_10_threshold(scores, higher_is_better)
        fig = create_distribution_chart(
            scores, 
            personal_score, 
            top10_threshold,
            selected_event_name,
            UNIT_MAP[selected_event_key],
            higher_is_better
        )
    else:
        fig = create_distribution_chart(
            scores,
            None,
            None,
            selected_event_name,
            UNIT_MAP[selected_event_key],
            higher_is_better
        )
    
    if fig:
        st.plotly_chart(fig, use_container_width=True)
    
    # 상세 통계
    with st.expander("📈 상세 통계 보기"):
        df_stats = pd.DataFrame({
            '통계': ['최소값', '1사분위수', '중앙값', '3사분위수', '최대값', '평균', '표준편차'],
            '값': [
                np.min(scores),
                np.percentile(scores, 25),
                np.median(scores),
                np.percentile(scores, 75),
                np.max(scores),
                np.mean(scores),
                np.std(scores)
            ]
        })
        df_stats['단위'] = UNIT_MAP[selected_event_key]
        st.dataframe(df_stats, use_container_width=True)

def show_career_page():
    """진로 및 자격증 정보 페이지"""
    st.title("🎓 체육 진로 및 자격증 정보")
    
    # 데이터 로드
    guide_df = load_csv_data(JINRO_DIR / "Guide.csv")
    cert_df = load_csv_data(JINRO_DIR / "Certificate.csv")
    loadmap_df = load_csv_data(JINRO_DIR / "loadmap.csv")
    
    if guide_df is None or cert_df is None:
        st.error("데이터를 로드할 수 없습니다.")
        return
    
    # 탭 구성
    tab1, tab2 = st.tabs(["🎓 학과별 진로 찾기", "📜 자격증별 직업 찾기"])
    
    with tab1:
        show_major_career_tab(guide_df, cert_df, loadmap_df)
    
    with tab2:
        show_certificate_career_tab(guide_df, cert_df)

def show_major_career_tab(guide_df, cert_df, loadmap_df):
    """학과별 진로 찾기 탭"""
    # 학과 목록
    majors = sorted(guide_df['학과'].dropna().unique())
    
    if not majors:
        st.warning("학과 데이터가 없습니다.")
        return
    
    selected_major = st.selectbox("희망 학과", ["선택하세요"] + list(majors))
    
    if selected_major == "선택하세요":
        st.info("학과를 선택해주세요.")
        return
    
    # 해당 학과의 진로 필터링
    major_careers = guide_df[guide_df['학과'] == selected_major]
    
    if major_careers.empty:
        st.warning(f"{selected_major} 학과의 진로 정보가 없습니다.")
        return
    
    # 진로 선택
    careers = sorted(major_careers['진로'].dropna().unique())
    selected_career = st.selectbox("관심 직업", ["선택하세요"] + list(careers))
    
    if selected_career == "선택하세요":
        # 진로 목록 미리보기
        st.subheader(f"📋 {selected_major} 진로 목록")
        preview_df = major_careers[['진로', '필요자격증', '초봉/연봉', '주요 취업처']].drop_duplicates()
        st.dataframe(preview_df, use_container_width=True)
        return
    
    # 선택한 진로의 상세 정보
    career_info = major_careers[major_careers['진로'] == selected_career].iloc[0]
    
    st.markdown("---")
    st.subheader(f"💼 {selected_career}")
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("필요 자격", career_info.get('필요자격증', '-'))
    with col2:
        st.metric("예상 연봉", career_info.get('초봉/연봉', '-'))
    with col3:
        st.metric("주요 취업처", career_info.get('주요 취업처', '-'))
    
    if pd.notna(career_info.get('준비전략')):
        st.info(f"**준비전략:** {career_info['준비전략']}")
    
    # 필요 자격증 정보
    required_certs = str(career_info.get('필요자격증', '')).split(',')
    if required_certs and required_certs[0]:
        st.markdown("### 📜 추천 자격증")
        for cert_name in required_certs:
            cert_name = cert_name.strip()
            if not cert_name:
                continue
            
            # 자격증 정보 찾기
            cert_info = cert_df[cert_df['자격증명'].str.contains(cert_name, na=False, case=False)]
            
            if not cert_info.empty:
                cert_row = cert_info.iloc[0]
                with st.expander(f"📄 {cert_row['자격증명']}"):
                    col1, col2 = st.columns(2)
                    with col1:
                        st.write(f"**분류:** {cert_row.get('자격증 분류', '-')}")
                        st.write(f"**발급기관:** {cert_row.get('발급/관리기관', '-')}")
                        st.write(f"**응시자격:** {cert_row.get('응시자격', '-')}")
                        st.write(f"**시험과목:** {cert_row.get('시험과목', '-')}")
                    with col2:
                        st.write(f"**준비기간:** {cert_row.get('준비기간', '-')}")
                        st.write(f"**연봉/처우:** {cert_row.get('연봉/처우', '-')}")
                        st.write(f"**유효기간:** {cert_row.get('유효기간', '-')}")
                        st.write(f"**난이도:** {cert_row.get('난이도', '-')}")
                    st.write(f"**주요 취업처:** {cert_row.get('주요 취업처', '-')}")
            else:
                st.write(f"📄 {cert_name} (상세 정보 없음)")
    
    # 로드맵 정보
    if loadmap_df is not None:
        career_loadmap = loadmap_df[loadmap_df['진로목표'] == selected_career]
        if not career_loadmap.empty:
            st.markdown("### 🗺️ 진로 로드맵")
            for idx, row in career_loadmap.iterrows():
                with st.container():
                    st.markdown(f"#### {row.get('단계', '')}")
                    st.write(f"**구체적 준비내용:** {row.get('구체적준비내용', '-')}")
                    st.write(f"**예상기간:** {row.get('예상기간', '-')}")
                    if pd.notna(row.get('필수자격증')):
                        st.write(f"**필수자격증:** {row.get('필수자격증', '-')}")
                    st.markdown("---")

def show_certificate_career_tab(guide_df, cert_df):
    """자격증별 직업 찾기 탭"""
    # 자격증 목록
    certificates = sorted(cert_df['자격증명'].dropna().unique())
    
    if not certificates:
        st.warning("자격증 데이터가 없습니다.")
        return
    
    selected_cert = st.selectbox("자격증 선택", ["선택하세요"] + list(certificates))
    
    if selected_cert == "선택하세요":
        st.info("자격증을 선택해주세요.")
        return
    
    # 자격증 정보
    cert_info = cert_df[cert_df['자격증명'] == selected_cert].iloc[0]
    
    st.markdown("---")
    st.subheader(f"📜 {selected_cert}")
    
    col1, col2 = st.columns(2)
    with col1:
        st.write(f"**분류:** {cert_info.get('자격증 분류', '-')}")
        st.write(f"**발급기관:** {cert_info.get('발급/관리기관', '-')}")
        st.write(f"**응시자격:** {cert_info.get('응시자격', '-')}")
        st.write(f"**시험과목:** {cert_info.get('시험과목', '-')}")
    with col2:
        st.write(f"**준비기간:** {cert_info.get('준비기간', '-')}")
        st.write(f"**연봉/처우:** {cert_info.get('연봉/처우', '-')}")
        st.write(f"**유효기간:** {cert_info.get('유효기간', '-')}")
        st.write(f"**난이도:** {cert_info.get('난이도', '-')}")
    
    st.write(f"**주요 취업처:** {cert_info.get('주요 취업처', '-')}")
    
    st.markdown("---")
    
    # 해당 자격증을 필요로 하는 직업 찾기
    st.subheader("💼 이 자격증으로 취업할 수 있는 직업")
    
    # 부분 일치 검색
    related_careers = guide_df[
        guide_df['필요자격증'].str.contains(selected_cert, na=False, case=False)
    ]
    
    if related_careers.empty:
        st.info("해당 자격증을 필요로 하는 직업 정보를 찾을 수 없습니다.")
        return
    
    for idx, career_row in related_careers.iterrows():
        with st.expander(f"💼 {career_row['진로']} ({career_row.get('학과', '-')})"):
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("필요 자격", career_row.get('필요자격증', '-'))
            with col2:
                st.metric("예상 연봉", career_row.get('초봉/연봉', '-'))
            with col3:
                st.metric("주요 취업처", career_row.get('주요 취업처', '-'))
            
            if pd.notna(career_row.get('준비전략')):
                st.info(f"**준비전략:** {career_row['준비전략']}")

if __name__ == "__main__":
    main()

