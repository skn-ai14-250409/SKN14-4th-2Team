from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
import json
import uuid
from urllib.parse import quote
import requests
import os
from bs4 import BeautifulSoup
import yfinance as yf
from pykrx import stock as pykrx_stock
import pandas as pd
from datetime import datetime, timedelta, timezone
import numpy as np
from .models import CustomUser, ChatSession, ChatMessage, Stock, StockFavorite, StockReview, StockReviewLike
from .utils2.stock_node import handle_analysis_node
from .utils2.main import run_langraph

# --- 별칭(Alias) 맵 ---
# 자주 사용되는 한글/약칭을 공식 명칭으로 변환합니다.
STOCK_ALIASES = {
    "네이버": "NAVER",
    "엘지": "LG",
    "지에스": "GS",
    "에스케이": "SK",
    "엔씨": "엔씨소프트",
    "엘지화학": "LG화학",
    "sk하이닉스": "SK하이닉스",
    "엘지에너지솔루션": "LG에너지솔루션",
    "lgdisplay": "LG디스플레이",
    "lg display": "LG디스플레이",
    "LG Display": "LG디스플레이",
}

def find_similar_companies(query, company_names, max_results=5):
    """유사한 기업명을 찾습니다."""
    query = query.lower().strip()
    similar_companies = []
    
    for company in company_names:
        company_lower = company.lower()
        
        # 정확한 일치
        if query in company_lower or company_lower in query:
            similar_companies.append(company)
        # 부분 일치 (2글자 이상)
        elif len(query) >= 2 and any(query[i:i+2] in company_lower for i in range(len(query)-1)):
            similar_companies.append(company)
        # 첫 글자 일치
        elif query[0] == company_lower[0]:
            similar_companies.append(company)
        # 검색어로 시작하는 회사명
        elif company_lower.startswith(query):
            similar_companies.append(company)
        # 검색어가 회사명에 포함된 경우
        elif query in company_lower:
            similar_companies.append(company)
    
    # 중복 제거 및 정렬
    similar_companies = list(set(similar_companies))
    similar_companies.sort()
    
    return similar_companies[:max_results]



def get_popular_stocks():
    """인기 검색 종목 데이터를 가져옵니다."""
    try:
        latest_day = pykrx_stock.get_nearest_business_day_in_a_week()
        
        # 인기 종목 리스트 (시가총액 상위 종목들)
        popular_tickers = [
            '005930',  # 삼성전자
            '000660',  # SK하이닉스
            '035420',  # NAVER
            '051910',  # LG화학
            '006400',  # 삼성SDI
        ]
        
        popular_stocks = []
        
        for ticker in popular_tickers:
            try:
                # 주가 정보 가져오기 (최근 2일 데이터)
                end_date = latest_day
                start_date = latest_day - timedelta(days=5)  # 충분한 데이터 확보
                price_info = pykrx_stock.get_market_ohlcv_by_date(start_date, end_date, ticker)
                
                if not price_info.empty and len(price_info) >= 2:
                    company_name = pykrx_stock.get_market_ticker_name(ticker)
                    
                    # 현재가와 전일 종가
                    current_price = price_info.iloc[-1]['종가']  # 최신 종가
                    prev_price = price_info.iloc[-2]['종가']    # 전일 종가
                    
                    price_change = current_price - prev_price
                    change_percent = (price_change / prev_price) * 100 if prev_price != 0 else 0
                    
                    popular_stocks.append({
                        'name': company_name,
                        'price': f"{current_price:,}",
                        'change': f"{price_change:+,}",
                        'changePercent': f"{change_percent:+.2f}%",
                        'isPositive': price_change >= 0
                    })
                    
                    print(f"인기 종목 {company_name}: 현재가 {current_price:,}, 변동 {price_change:+,} ({change_percent:+.2f}%)")
                    
            except Exception as e:
                print(f"종목 {ticker} 정보 가져오기 오류: {e}")
                continue
        
        print(f"인기 종목 {len(popular_stocks)}개 로드 완료")
        return popular_stocks
    except Exception as e:
        print(f"인기 종목 데이터 가져오기 오류: {e}")
        return []

def get_related_stocks(company_name, code):
    """관련 종목 데이터를 가져옵니다."""
    try:
        latest_day = pykrx_stock.get_nearest_business_day_in_a_week()
        
        # 회사 그룹별 관련 종목 매핑
        company_groups = {
            '삼성': ['005930', '006400', '000830', '207940', '068270'],  # 삼성전자, 삼성SDI, 삼성화재, 삼성바이오로직스, 셀트리온
            'SK': ['000660', '017670', '096770', '326030', '011790'],   # SK하이닉스, SK텔레콤, SK이노베이션, SK바이오팜, SKC
            'LG': ['051910', '373220', '066570', '051900', '034220'],   # LG화학, LG에너지솔루션, LG전자, LG생활건강, LG디스플레이
            '현대': ['005380', '000270', '012330', '010620', '011200'], # 현대차, 기아, 현대모비스, 현대미포조선, 현대상선
            '현대자동차': ['005380', '000270', '012330', '010620', '011200'], # 현대차, 기아, 현대모비스, 현대미포조선, 현대상선
            '포스코': ['005490', '003670', '047050', '058430', '009520'], # POSCO홀딩스, 포스코퓨처엠, 포스코인터내셔널, 포스코케미칼, 포스코홀딩스
            'NAVER': ['035420', '035720', '251270', '035600', '035000'], # NAVER, 카카오, 넷마블, SK이노베이션, 지투알
            '카카오': ['035720', '035420', '251270', '035600', '035000'], # 카카오, NAVER, NAVER, 넷마블, SK이노베이션, 지투알
        }
        
        # 회사명에서 그룹 찾기 (더 정확한 매칭)
        found_group = None
        print(f"관련 종목 검색: 회사명='{company_name}', 코드='{code}'")
        for group_name, group_codes in company_groups.items():
            if group_name in company_name or company_name in group_name:
                found_group = group_codes
                print(f"그룹 매칭 성공: '{group_name}' 그룹 찾음")
                break
        
        if not found_group:
            print(f"그룹 매칭 실패: '{company_name}'에 대한 그룹을 찾지 못함")
        
        if not found_group:
            # 그룹이 없으면 같은 섹터의 다른 기업들 찾기
            try:
                # yfinance로 섹터 정보 가져오기
                yahoo_code = f"{code}.KS" if code in pykrx_stock.get_market_ticker_list(date=latest_day, market="KOSPI") else f"{code}.KQ"
                ticker = yf.Ticker(yahoo_code)
                sector = ticker.info.get('sector', '')
                
                # 섹터별 관련 기업들
                sector_companies = {
                    'Technology': ['000660', '035420', '035720', '051910', '006400'],  # SK하이닉스, NAVER, 카카오, LG화학, 삼성SDI
                    'Consumer Cyclical': ['005380', '000270', '051900', '017670'],      # 현대차, 기아, LG생활건강, SK텔레콤
                    'Financial Services': ['207940', '000830', '012330'],               # 삼성화재, 삼성화재, 현대모비스
                    'Healthcare': ['068270', '326030', '207940'],                       # 셀트리온, SK바이오팜, 삼성바이오로직스
                }
                
                found_group = sector_companies.get(sector, [])  # 섹터가 없으면 빈 배열
                
            except Exception as e:
                print(f"섹터 정보 가져오기 오류: {e}")
                found_group = []  # 오류 시 빈 배열
        
        # 현재 종목 제외
        if code in found_group:
            found_group.remove(code)
        
        # 최대 5개까지만
        related_stocks = []
        for ticker_code in found_group[:5]:
            try:
                company_name = pykrx_stock.get_market_ticker_name(ticker_code)
                yahoo_code = f"{ticker_code}.KS" if ticker_code in pykrx_stock.get_market_ticker_list(date=latest_day, market="KOSPI") else f"{ticker_code}.KQ"
                
                related_stocks.append({
                    'name': company_name,
                    'code': yahoo_code
                })
            except Exception as e:
                print(f"관련 종목 {ticker_code} 정보 가져오기 오류: {e}")
                continue
        
        print(f"관련 종목 {len(related_stocks)}개 로드 완료")
        return related_stocks
        
    except Exception as e:
        print(f"관련 종목 데이터 가져오기 오류: {e}")
        return []

# --- 네이버 API 키 설정 ---
NAVER_CLIENT_ID = "_UjwRjk7ehd5FauRIy01" 
NAVER_CLIENT_SECRET = "CZlqMZvTnM"

def chatbot(request):
    """메인 챗봇 페이지 - 로그인 필요"""
    # 로그인하지 않은 경우 로그인 페이지로 리다이렉트
    if not request.user.is_authenticated:
        return redirect('accounts:home')
    
    # 사용자의 활성 채팅 세션들 가져오기
    chat_sessions = ChatSession.objects.filter(
        user=request.user, 
        is_active=True
    ).order_by('-updated_at')[:10]  # 최근 10개만
    
    # 템플릿에 전달할 컨텍스트
    context = {
        'user': request.user,
        'chat_sessions': chat_sessions,
        'user_json': user_to_dict(request.user)  # JavaScript에서 사용할 JSON 데이터
    }
    
    return render(request, 'app/main.html', context)

def stock(request):
    return render(request, 'app/stock.html')

def clean_html(html_string):
    """HTML 태그를 제거하고 텍스트만 반환합니다."""
    return BeautifulSoup(html_string, "html.parser").get_text()

def guess_category(title: str, description: str) -> str:
    """뉴스의 제목과 설명을 기반으로 카테고리를 추측합니다."""
    text = (title + " " + description).lower()
    if any(word in text for word in ["경제", "금융", "투자", "기업", "증시", "주식", "부동산"]):
        return "경제"
    elif any(word in text for word in ["기술", "ai", "인공지능", "반도체", "it", "테크", "과학"]):
        return "기술"
    elif any(word in text for word in ["정치", "정부", "대통령", "국회", "선거", "외교"]):
        return "정치"
    elif any(word in text for word in ["사회", "사건", "사고", "범죄", "교육", "노동"]):
        return "사회"
    elif any(word in text for word in ["문화", "예술", "영화", "음악", "연예", "방송"]):
        return "문화"
    elif any(word in text for word in ["스포츠", "축구", "야구", "농구", "올림픽"]):
        return "스포츠"
    else:
        return "기타"

def time_ago(pub_date: str) -> str:
    """RFC 1123 포맷의 날짜 문자열을 'n분 전'과 같은 상대 시간으로 변환합니다."""
    try:
        date_obj = datetime.strptime(pub_date, '%a, %d %b %Y %H:%M:%S %z')
        now = datetime.now(timezone.utc)
        diff = now - date_obj

        seconds = diff.total_seconds()
        days = diff.days

        if days >= 30:
            return f"{days // 30}달 전"
        if days >= 7:
            return f"{days // 7}주 전"
        if days > 0:
            return f"{days}일 전"
        if seconds >= 3600:
            return f"{int(seconds // 3600)}시간 전"
        if seconds >= 60:
            return f"{int(seconds // 60)}분 전"
        return "방금 전"
    except (ValueError, TypeError):
        return pub_date # 파싱 실패 시 원본 반환


def format_market_cap(cap):
    """시가총액을 '조'와 '억' 단위로 변환합니다."""
    # 1. Series 등 숫자가 아닌 값이 들어오는 경우를 먼저 안전하게 처리
    if not isinstance(cap, (int, float, np.number)):
        return "N/A"
    
    # 2. 이제 cap은 숫자 타입임이 보장되므로, 값을 비교
    if cap is None or cap == 0:
        return "N/A"
    
    cap = float(cap)
    trillion = int(cap // 1_0000_0000_0000)
    billion = int((cap % 1_0000_0000_0000) // 1_0000_0000)
    
    if trillion > 0 and billion > 0:
        return f"{trillion}조 {billion}억"
    elif trillion > 0:
        return f"{trillion}조"
    elif billion > 0:
        return f"{billion}억"
    else:
        return f"{int(cap // 1_0000)}만"

@csrf_exempt
def get_stock_info(request):
    """
    회사명을 받아 주식 정보를 조회하고 JSON으로 반환하는 API 뷰.
    yfinance를 사용하여 상세 정보를 추가로 가져옵니다.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            company_name = data.get('query', '').strip()
            period = data.get('period', '1m') # 기본값 1개월로 변경

            if not company_name:
                return JsonResponse({'success': False, 'error': '기업명을 입력해주세요.'})

            # KRX 티커 정보 로드 및 캐싱 개선 (휴일/주말에도 안전하게)
            if 'krx_tickers' not in get_stock_info.__dict__:
                latest_day_for_map = pykrx_stock.get_nearest_business_day_in_a_week()
                kospi = pykrx_stock.get_market_ticker_list(date=latest_day_for_map, market="KOSPI")
                kosdaq = pykrx_stock.get_market_ticker_list(date=latest_day_for_map, market="KOSDAQ")
                tickers = kospi + kosdaq
                name_to_code = {pykrx_stock.get_market_ticker_name(ticker): ticker for ticker in tickers}
                get_stock_info.krx_tickers = name_to_code
                print(f"KRX 티커 정보 로드 완료. ({len(tickers)}개 종목)")

            name_to_code = get_stock_info.krx_tickers
            
            # --- 스마트 검색 로직 ---
            code = None  # 변수 초기화
            
            # 1. KRX 코드로 검색 시도 (6자리 숫자인 경우)
            if company_name.isdigit() and len(company_name) == 6:
                print(f"KRX 코드로 검색 시도: {company_name}")
                try:
                    found_name = pykrx_stock.get_market_ticker_name(company_name)
                    if found_name:
                        code = company_name
                        company_name = found_name
                        print(f"KRX 코드로 회사명 찾음: {found_name} ({code})")
                    else:
                        return JsonResponse({"success": False, "error": "존재하지 않는 주식 코드입니다."})
                except Exception as e:
                    print(f"KRX 코드 검색 오류: {e}")
                    return JsonResponse({"success": False, "error": "존재하지 않는 주식 코드입니다."})
            else:
                # 2. 회사명으로 검색
                # 별칭(alias) 및 대소문자 처리
                search_term = company_name.lower().replace(" ", "")
                if search_term in STOCK_ALIASES:
                    company_name = STOCK_ALIASES[search_term]

                # 정확한 이름으로 코드 찾기 (대소문자 무시)
                found_code = None
                found_name = None
                for name, ticker_code in name_to_code.items():
                    if name.lower().replace(" ", "") == company_name.lower().replace(" ", ""):
                        found_code = ticker_code
                        found_name = name
                        break
                
                if not found_code:
                    # 일치하는 항목이 없으면, 유사한 기업명 찾기
                    print(f"검색어 '{company_name}'에 대한 정확한 일치를 찾지 못함")
                    similar_companies = find_similar_companies(company_name, name_to_code.keys())
                    print(f"유사한 기업명 {len(similar_companies)}개 발견: {similar_companies}")
                    if similar_companies:
                        error_message = f"정확한 기업명을 입력해주세요.\n혹시 이거 찾으세요?: {', '.join(similar_companies)}"
                    else:
                        error_message = "해당 기업명은 상장기업이 아닙니다."
                    return JsonResponse({"success": False, "error": error_message, "suggestions": similar_companies})
                
                code = found_code
                company_name = found_name # 공식 명칭으로 업데이트
            
            # yfinance Ticker 객체 생성
            latest_day = pykrx_stock.get_nearest_business_day_in_a_week()
            kospi_tickers = pykrx_stock.get_market_ticker_list(date=latest_day, market="KOSPI")
            
            is_kospi = code in kospi_tickers
            yahoo_code = f"{code}.KS" if is_kospi else f"{code}.KQ"
            
            # --- yfinance 상세 정보 조회 (안정성 강화) ---
            info = {}
            try:
                ticker = yf.Ticker(yahoo_code)
                info = ticker.info
            except Exception as e:
                print(f"!!! yfinance ticker.info 조회 중 오류 발생: {e}")
                print("!!! 상세 정보를 제외하고 차트 데이터만으로 응답을 구성합니다.")

            # --- 기본 정보 계산용 데이터 (항상 1년치) ---
            today = datetime.today()
            one_year_ago = today - timedelta(days=365)
            # yfinance는 종종 마지막 날 데이터를 누락하므로 하루를 더해줌
            history_df = yf.download(yahoo_code, start=one_year_ago, end=today + timedelta(days=1), progress=False, auto_adjust=True)

            if history_df.empty:
                return JsonResponse({"success": False, "error": "주가 데이터를 가져올 수 없습니다."})
            
            # multi-level column 처리
            full_close_series = history_df['Close'].iloc[:, 0] if isinstance(history_df['Close'], pd.DataFrame) else history_df['Close']
            full_high_series = history_df['High'].iloc[:, 0] if isinstance(history_df['High'], pd.DataFrame) else history_df['High']
            full_low_series = history_df['Low'].iloc[:, 0] if isinstance(history_df['Low'], pd.DataFrame) else history_df['Low']
            full_volume_series = history_df['Volume'].iloc[:, 0] if isinstance(history_df['Volume'], pd.DataFrame) else history_df['Volume']
            
            # 52주 최고/최저 및 등락률 등 계산
            fifty_two_week_high = full_high_series.max()
            fifty_two_week_low = full_low_series.min()
            latest_close = full_close_series.iloc[-1]
            previous_close = full_close_series.iloc[-2] if len(full_close_series) > 1 else latest_close
            price_change = latest_close - previous_close
            change_percent = (price_change / previous_close) * 100 if previous_close != 0 else 0

            # --- 차트용 데이터 (기간에 맞게 조회) ---
            if period == '1d':
                chart_df = yf.download(yahoo_code, period="1d", interval="15m", progress=False, auto_adjust=True)
                # 한국 시간대로 변환하고 더 읽기 쉬운 형식으로 표시
                try:
                    chart_df.index = chart_df.index.tz_convert('Asia/Seoul').strftime('%H:%M')
                except:
                    chart_df.index = chart_df.index.strftime('%H:%M')
            elif period == '1w':
                chart_df = yf.download(yahoo_code, period="5d", interval="1h", progress=False, auto_adjust=True)
                # 한국 시간대로 변환
                try:
                    chart_df.index = chart_df.index.tz_convert('Asia/Seoul').strftime('%m-%d %H:%M')
                except:
                    chart_df.index = chart_df.index.strftime('%m-%d %H:%M')
            elif period == '1m':
                chart_df = yf.download(yahoo_code, period="1mo", interval="1d", progress=False, auto_adjust=True)
                chart_df.index = chart_df.index.strftime('%m-%d')
            elif period == '3m':
                chart_df = yf.download(yahoo_code, period="3mo", interval="1d", progress=False, auto_adjust=True)
                chart_df.index = chart_df.index.strftime('%m-%d')
            elif period == '6m':
                try:
                    chart_df = yf.download(yahoo_code, period="6mo", interval="1d", progress=False, auto_adjust=True)
                    if chart_df.empty:
                        print(f"6개월 데이터가 비어있음: {yahoo_code}")
                        # 3개월 데이터로 대체
                        chart_df = yf.download(yahoo_code, period="3mo", interval="1d", progress=False, auto_adjust=True)
                    chart_df.index = chart_df.index.strftime('%m-%d')
                except Exception as e:
                    print(f"6개월 데이터 가져오기 오류: {e}")
                    # 3개월 데이터로 대체
                    chart_df = yf.download(yahoo_code, period="3mo", interval="1d", progress=False, auto_adjust=True)
                    chart_df.index = chart_df.index.strftime('%m-%d')
            elif period == '1y':
                chart_df = yf.download(yahoo_code, period="1y", interval="1d", progress=False, auto_adjust=True)
                chart_df.index = chart_df.index.strftime('%m-%d')
            elif period == '5y':
                chart_df = yf.download(yahoo_code, period="5y", interval="1wk", progress=False, auto_adjust=True)
                chart_df.index = chart_df.index.strftime('%Y-%m')
            elif period == 'max':
                chart_df = yf.download(yahoo_code, period="max", interval="1mo", progress=False, auto_adjust=True)
                chart_df.index = chart_df.index.strftime('%Y-%m')
            else:
                # 기본값: 1개월
                chart_df = yf.download(yahoo_code, period="1mo", interval="1d", progress=False, auto_adjust=True)
                chart_df.index = chart_df.index.strftime('%m-%d')
            
            chart_df = chart_df.reset_index()
            
            # 차트 데이터가 비어있는지 확인
            if chart_df.empty:
                print(f"차트 데이터가 비어있음: {yahoo_code}, 기간: {period}")
                return JsonResponse({"success": False, "error": "해당 기간의 차트 데이터를 가져올 수 없습니다."})
            
            chart_close_series = chart_df['Close'].iloc[:, 0] if isinstance(chart_df['Close'], pd.DataFrame) else chart_df['Close']
            
            # --- 데이터 값 안전하게 가져오기 (휴일/주말 고려) ---
            # info.get()의 값이 0인 경우도 비정상으로 간주하고, 마지막 거래일의 데이터로 대체합니다.
            latest_price_val = info.get('currentPrice') if info.get('currentPrice') not in [None, 0] else latest_close
            volume_val = info.get('volume') if info.get('volume') not in [None, 0] else full_volume_series.iloc[-1]
            day_high_val = info.get('dayHigh') if info.get('dayHigh') not in [None, 0] else full_high_series.iloc[-1]
            day_low_val = info.get('dayLow') if info.get('dayLow') not in [None, 0] else full_low_series.iloc[-1]
            
            # --- PER/PBR 또는 대체 정보 구성 (Fallback 로직 강화) ---
            per_label, per_value = "PER", info.get('trailingPE')
            if per_value is None:
                per_label, per_value = "Forward P/E", info.get('forwardPE')
                if per_value is None:
                    per_label = "EPS"
                    per_value = info.get('trailingEps')

            pbr_label, pbr_value = "PBR", info.get('priceToBook')
            if pbr_value is None:
                pbr_label = "배당수익률"
                dividend_yield = info.get('dividendYield')
                pbr_value = f"{dividend_yield * 100:.2f}%" if dividend_yield is not None else None

            # --- 추가 주식 정보 계산 ---
            # 52주 변동률
            fifty_two_week_change = ((latest_price_val - fifty_two_week_low) / fifty_two_week_low) * 100 if fifty_two_week_low != 0 else 0
            
            # 거래대금 (거래량 * 현재가)
            trading_value = volume_val * latest_price_val if isinstance(volume_val, (int, float)) else 0
            
            # 베타 (시장 대비 변동성)
            beta = info.get('beta', 'N/A')
            
            # ROE (자기자본이익률)
            roe = info.get('returnOnEquity')
            roe_value = f"{roe * 100:.2f}%" if roe is not None else "N/A"
            
            # ROA (총자산이익률)
            roa = info.get('returnOnAssets')
            roa_value = f"{roa * 100:.2f}%" if roa is not None else "N/A"
            
            # 부채비율
            debt_to_equity = info.get('debtToEquity')
            debt_ratio = f"{debt_to_equity:.2f}" if debt_to_equity is not None else "N/A"
            
            # 유동비율
            current_ratio = info.get('currentRatio')
            current_ratio_value = f"{current_ratio:.2f}" if current_ratio is not None else "N/A"
            
            # 배당성향
            payout_ratio = info.get('payoutRatio')
            payout_ratio_value = f"{payout_ratio * 100:.2f}%" if payout_ratio is not None else "N/A"



            # --- 인기 종목 정보 추가 ---
            popular_stocks_data = get_popular_stocks()
            print(f"인기 종목 데이터: {len(popular_stocks_data)}개")
            for stock in popular_stocks_data:
                print(f"  - {stock['name']}: {stock['price']} ({stock['change']})")

            # --- 관련 종목 정보 추가 ---
            related_stocks_data = get_related_stocks(company_name, code)
            print(f"관련 종목 데이터: {len(related_stocks_data)}개")
            for stock in related_stocks_data:
                print(f"  - {stock['name']}: {stock['code']}")

            response_data = {
                'success': True,
                'companyName': info.get('shortName', company_name),
                'code': yahoo_code,
                'period': period, # 현재 조회된 기간을 응답에 포함
                'latestPrice': f"{latest_price_val:,.0f}",
                'priceChange': f"{price_change:+,.0f}",
                'changePercent': f"{change_percent:+.2f}",
                
                'marketCap': format_market_cap(info.get('marketCap')),
                'volume': f"{volume_val:,d}주",
                'fiftyTwoWeekHigh': f"₩{fifty_two_week_high:,.0f}",
                'fiftyTwoWeekLow': f"₩{fifty_two_week_low:,.0f}",
                
                'per_label': per_label,
                'per_value': f"{per_value:.2f}" if isinstance(per_value, (int, float)) else "N/A",
                'pbr_label': pbr_label,
                'pbr_value': pbr_value if pbr_value is not None else "N/A",

                'dayHigh': f"₩{day_high_val:,.0f}",
                'dayLow': f"₩{day_low_val:,.0f}",
                
                # 추가 정보
                'sector': info.get('sector', 'N/A'),
                'industry': info.get('industry', 'N/A'),
                'employees': f"{info.get('fullTimeEmployees', 0):,}" if info.get('fullTimeEmployees') else "N/A",
                'website': info.get('website', 'N/A'),
                'description': info.get('longBusinessSummary', 'N/A'),
                
                # 추가 주식 정보
                'fiftyTwoWeekChange': f"{fifty_two_week_change:+.2f}%",
                'tradingValue': f"₩{trading_value:,.0f}" if trading_value > 0 else "N/A",
                'beta': beta,
                'roe': roe_value,
                'roa': roa_value,
                'debtRatio': debt_ratio,
                'currentRatio': current_ratio_value,
                'payoutRatio': payout_ratio_value,
                

                
                # 인기 종목 정보
                'popular_stocks': popular_stocks_data,
                
                # 관련 종목 정보
                'relatedStocks': related_stocks_data,
                
                'chartData': {
                    'labels': chart_df.iloc[:, 0].tolist(),
                    'data': chart_close_series.tolist()
                }
            }
            return JsonResponse(response_data)

        except Exception as e:
            print(f"주식 정보 조회 중 오류 발생: {str(e)}")
            return JsonResponse({'success': False, 'error': f'서버 오류가 발생했습니다: {e}'})

    return JsonResponse({'success': False, 'error': 'Invalid request method'})

@csrf_exempt
def get_stock_info_by_code(request):
    """
    KRX 코드를 받아 주식 정보를 조회하고 JSON으로 반환하는 API 뷰.
    즐겨찾기 목록에서 클릭할 때 사용됩니다.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            krx_code = data.get('code', '').strip()
            period = data.get('period', '1m')  # 기본값 1개월

            if not krx_code:
                return JsonResponse({'success': False, 'error': 'KRX 코드를 입력해주세요.'})

            # KRX 코드에서 .KS, .KQ 등 제거
            if '.' in krx_code:
                krx_code = krx_code.split('.')[0]

            # 회사명 가져오기
            try:
                company_name = pykrx_stock.get_market_ticker_name(krx_code)
                if not company_name:
                    return JsonResponse({'success': False, 'error': '존재하지 않는 주식 코드입니다.'})
            except Exception as e:
                return JsonResponse({'success': False, 'error': '존재하지 않는 주식 코드입니다.'})

            # KOSPI/KOSDAQ 구분
            latest_day = pykrx_stock.get_nearest_business_day_in_a_week()
            kospi_tickers = pykrx_stock.get_market_ticker_list(date=latest_day, market="KOSPI")
            
            is_kospi = krx_code in kospi_tickers
            yahoo_code = f"{krx_code}.KS" if is_kospi else f"{krx_code}.KQ"
            
            # --- yfinance 상세 정보 조회 (안정성 강화) ---
            info = {}
            try:
                ticker = yf.Ticker(yahoo_code)
                info = ticker.info
            except Exception as e:
                print(f"!!! yfinance ticker.info 조회 중 오류 발생: {e}")
                print("!!! 상세 정보를 제외하고 차트 데이터만으로 응답을 구성합니다.")

            # --- 기본 정보 계산용 데이터 (항상 1년치) ---
            today = datetime.today()
            one_year_ago = today - timedelta(days=365)
            # yfinance는 종종 마지막 날 데이터를 누락하므로 하루를 더해줌
            history_df = yf.download(yahoo_code, start=one_year_ago, end=today + timedelta(days=1), progress=False, auto_adjust=True)

            if history_df.empty:
                return JsonResponse({"success": False, "error": "주가 데이터를 가져올 수 없습니다."})
            
            # multi-level column 처리
            full_close_series = history_df['Close'].iloc[:, 0] if isinstance(history_df['Close'], pd.DataFrame) else history_df['Close']
            full_high_series = history_df['High'].iloc[:, 0] if isinstance(history_df['High'], pd.DataFrame) else history_df['High']
            full_low_series = history_df['Low'].iloc[:, 0] if isinstance(history_df['Low'], pd.DataFrame) else history_df['Low']
            full_volume_series = history_df['Volume'].iloc[:, 0] if isinstance(history_df['Volume'], pd.DataFrame) else history_df['Volume']
            
            # 52주 최고/최저 및 등락률 등 계산
            fifty_two_week_high = full_high_series.max()
            fifty_two_week_low = full_low_series.min()
            latest_close = full_close_series.iloc[-1]
            previous_close = full_close_series.iloc[-2] if len(full_close_series) > 1 else latest_close
            price_change = latest_close - previous_close
            change_percent = (price_change / previous_close) * 100 if previous_close != 0 else 0

            # --- 차트용 데이터 (기간에 따라 조회) ---
            if period == '1d':
                chart_df = yf.download(yahoo_code, period="1d", interval="15m", progress=False, auto_adjust=True)
                # 한국 시간대로 변환하고 더 읽기 쉬운 형식으로 표시
                try:
                    chart_df.index = chart_df.index.tz_convert('Asia/Seoul').strftime('%H:%M')
                except:
                    chart_df.index = chart_df.index.strftime('%H:%M')
            elif period == '1w':
                chart_df = yf.download(yahoo_code, period="5d", interval="1h", progress=False, auto_adjust=True)
                # 한국 시간대로 변환
                try:
                    chart_df.index = chart_df.index.tz_convert('Asia/Seoul').strftime('%m-%d %H:%M')
                except:
                    chart_df.index = chart_df.index.strftime('%m-%d %H:%M')
            elif period == '1m':
                chart_df = yf.download(yahoo_code, period="1mo", interval="1d", progress=False, auto_adjust=True)
                chart_df.index = chart_df.index.strftime('%m-%d')
            elif period == '3m':
                chart_df = yf.download(yahoo_code, period="3mo", interval="1d", progress=False, auto_adjust=True)
                chart_df.index = chart_df.index.strftime('%m-%d')
            elif period == '6m':
                try:
                    chart_df = yf.download(yahoo_code, period="6mo", interval="1d", progress=False, auto_adjust=True)
                    if chart_df.empty:
                        print(f"6개월 데이터가 비어있음: {yahoo_code}")
                        # 3개월 데이터로 대체
                        chart_df = yf.download(yahoo_code, period="3mo", interval="1d", progress=False, auto_adjust=True)
                    chart_df.index = chart_df.index.strftime('%m-%d')
                except Exception as e:
                    print(f"6개월 데이터 가져오기 오류: {e}")
                    # 3개월 데이터로 대체
                    chart_df = yf.download(yahoo_code, period="3mo", interval="1d", progress=False, auto_adjust=True)
                    chart_df.index = chart_df.index.strftime('%m-%d')
            elif period == '1y':
                chart_df = yf.download(yahoo_code, period="1y", interval="1d", progress=False, auto_adjust=True)
                chart_df.index = chart_df.index.strftime('%m-%d')
            elif period == '5y':
                chart_df = yf.download(yahoo_code, period="5y", interval="1wk", progress=False, auto_adjust=True)
                chart_df.index = chart_df.index.strftime('%Y-%m')
            elif period == 'max':
                chart_df = yf.download(yahoo_code, period="max", interval="1mo", progress=False, auto_adjust=True)
                chart_df.index = chart_df.index.strftime('%Y-%m')
            else:
                # 기본값: 1개월
                chart_df = yf.download(yahoo_code, period="1mo", interval="1d", progress=False, auto_adjust=True)
                chart_df.index = chart_df.index.strftime('%m-%d')
            
            chart_df = chart_df.reset_index()
            
            # 차트 데이터가 비어있는지 확인
            if chart_df.empty:
                print(f"차트 데이터가 비어있음: {yahoo_code}, 기간: {period}")
                return JsonResponse({"success": False, "error": "해당 기간의 차트 데이터를 가져올 수 없습니다."})
            
            # 차트 데이터 포맷팅
            chart_data = []
            for index, row in chart_df.iterrows():
                chart_data.append({
                    'date': str(row['Date']) if 'Date' in row else str(index),
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': int(row['Volume'])
                })

            # 응답 데이터 구성 (기존 API와 동일한 형식으로 맞춤)
            response_data = {
                'success': True,
                'companyName': company_name,
                'code': krx_code,
                'period': period,
                'latestPrice': f"{latest_close:,.0f}",
                'priceChange': f"{price_change:+,.0f}",
                'changePercent': f"{change_percent:+.2f}",
                'marketCap': format_market_cap(info.get('marketCap')),
                'volume': f"{int(full_volume_series.iloc[-1]) if len(full_volume_series) > 0 else 0:,d}주",
                'fiftyTwoWeekHigh': f"₩{fifty_two_week_high:,.0f}",
                'fiftyTwoWeekLow': f"₩{fifty_two_week_low:,.0f}",
                'dayHigh': f"₩{full_high_series.iloc[-1]:,.0f}",
                'dayLow': f"₩{full_low_series.iloc[-1]:,.0f}",
                'per_label': 'PER',
                'per_value': f"{info.get('trailingPE', 0):.2f}" if info.get('trailingPE') else "N/A",
                'pbr_label': 'PBR',
                'pbr_value': f"{info.get('priceToBook', 0):.2f}" if info.get('priceToBook') else "N/A",
                'chartData': {
                    'labels': [item['date'] for item in chart_data],
                    'data': [item['close'] for item in chart_data]
                }
            }

            return JsonResponse(response_data)

        except Exception as e:
            print(f"get_stock_info_by_code 오류: {e}")
            return JsonResponse({'success': False, 'error': f'오류가 발생했습니다: {str(e)}'})

    return JsonResponse({'success': False, 'error': 'Invalid request method'})


@csrf_exempt
def crawl_naver_news(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            search_query = data.get('query', '')

            if not NAVER_CLIENT_ID or NAVER_CLIENT_ID == "YOUR_CLIENT_ID":
                raise ValueError("네이버 API Client ID가 설정되지 않았습니다.")
            if not NAVER_CLIENT_SECRET or NAVER_CLIENT_SECRET == "YOUR_CLIENT_SECRET":
                raise ValueError("네이버 API Client Secret이 설정되지 않았습니다.")

            url = 'https://openapi.naver.com/v1/search/news.json'
            headers = {
                "X-Naver-Client-Id": NAVER_CLIENT_ID,
                "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
            }
            params = {
                'query': search_query,
                'display': 10,  # 가져올 뉴스 개수
                'start': 1,
                'sort': 'date'  # 최신순 정렬
            }

            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()  # 오류 발생 시 예외 발생

            news_data = response.json()
            
            if 'items' in news_data and news_data['items']:
                title_matches = []
                other_matches = []

                for item in news_data['items']:
                    title = clean_html(item['title'])
                    description = clean_html(item['description'])
                    
                    news_item = {
                        'title': title,
                        'content': description,
                        'link': item['originallink'],
                        'press': guess_category(title, description),
                        'time': time_ago(item.get('pubDate', ''))
                    }

                    # 제목에 검색어가 포함된 경우 우선순위 리스트에 추가
                    if search_query.lower() in title.lower():
                        title_matches.append(news_item)
                    else:
                        other_matches.append(news_item)
                
                # 두 리스트를 합쳐 최종 결과 생성 (제목 일치 항목이 위로)
                news_list = title_matches + other_matches
                
                print(f"API 호출 성공: {len(title_matches)}개 제목 일치, 총 {len(news_list)}개 정렬")

                if not news_list:
                    # API 결과 자체가 없는 경우
                    news_list = [{'title': f'"{search_query}"에 대한 뉴스 결과가 없습니다.', 'content': '다른 검색어로 다시 시도해주세요.', 'link': '#', 'press': '시스템', 'time': '방금전'}]
                    return JsonResponse({'success': True, 'news': news_list, 'no_results': True})

                return JsonResponse({'success': True, 'news': news_list})
            else:
                # 검색 결과가 없을 때의 메시지
                news_list = [{'title': f'"{search_query}"에 대한 뉴스 검색 결과가 없습니다.', 'content': '다른 검색어로 다시 시도해주세요.', 'link': '#', 'press': '시스템', 'time': '방금전'}]
                return JsonResponse({'success': True, 'news': news_list, 'no_results': True})

        except ValueError as e:
            print(f"API 키 설정 오류: {e}")
            return JsonResponse({'success': False, 'error': str(e)})
        except requests.exceptions.RequestException as e:
            print(f"API 호출 오류: {e}")
            error_data = e.response.json() if e.response else {}
            return JsonResponse({'success': False, 'error': f"API 호출에 실패했습니다: {error_data.get('errorMessage', str(e))}"})
        except Exception as e:
            print(f"\n알 수 없는 오류 발생: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)})

    return JsonResponse({'success': False, 'error': 'Invalid request method'})


def get_stock_rag(request):
    data = json.loads(request.body.decode('utf-8'))
    print(f'{data["title"]=}')

    company_name = data["title"]  # 삼성전자

    answer = handle_analysis_node(company_name)

    return JsonResponse({
        'answer': answer
    })


# User 객체를 직렬화할 때 필요한 필드만 딕셔너리 형태로 변환
def user_to_dict(user):
    profile_picture = getattr(user, 'profile_picture', '')
    # ImageField 객체를 URL 문자열로 변환
    if profile_picture and hasattr(profile_picture, 'url'):
        profile_picture_url = profile_picture.url
    else:
        profile_picture_url = ''
    
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'nickname': getattr(user, 'nickname', ''),
        'name': getattr(user, 'name', ''),
        'profile_picture': profile_picture_url,
        'date_joined': user.date_joined.strftime('%Y-%m-%d %H:%M:%S') if user.date_joined else ''
    }


@csrf_exempt
@require_http_methods(["POST"])
@login_required
def chat_api(request):
    """RAG 챗봇 API 엔드포인트 - 로그인 필요"""
    try:
        data = json.loads(request.body)
        user_message = data.get('message', '')
        level = data.get('level', 'basic')  # basic, intermediate, advanced
        session_id = data.get('session_id', '')  # 세션 ID 받기
        chat_history = data.get('chat_history', [])  # 대화 기록 받기
        
        # 디버깅용 로그
        print(f"받은 데이터: message='{user_message}', level='{level}', session_id='{session_id}'")
        print(f"대화 기록 길이: {len(chat_history)}")
        
        if not user_message:
            return JsonResponse({'error': '메시지가 없습니다.'}, status=400)
        
        # 세션 ID가 없으면 새로 생성
        if not session_id:
            session_id = str(uuid.uuid4())
            # 새 세션 생성 (기본 제목으로)
            chat_session = ChatSession.objects.create(
                user=request.user,
                session_id=session_id,
                title="새로운 대화"
            )
        else:
            # 기존 세션 가져오기
            try:
                chat_session = ChatSession.objects.get(session_id=session_id, user=request.user)
            except ChatSession.DoesNotExist:
                return JsonResponse({'error': '세션을 찾을 수 없습니다.'}, status=404)
        
        # 첫 번째 메시지 체크
        is_first_message = chat_session.messages.count() == 0
        updated_title = None
        
        # 첫 번째 메시지인 경우 세션 제목 업데이트
        if is_first_message:
            first_line = user_message.split('\n')[0]
            updated_title = first_line[:50] + "..." if len(first_line) > 50 else first_line
            chat_session.title = updated_title
            chat_session.save()
        
        # DB에서 채팅 히스토리 가져오기 (최근 6개 메시지만, 현재 메시지 제외)
        # 실제로는 LangGraph에서 최근 4개만 사용하므로 여유분 포함하여 6개
        db_chat_history = []
        messages = ChatMessage.objects.filter(session=chat_session).order_by('-timestamp')[:6]
        # 시간순으로 다시 정렬 (오래된 것부터)
        messages = reversed(messages)
        
        for msg in messages:
            if msg.message_type == 'user':
                db_chat_history.append({"role": "user", "content": msg.content})
            else:
                db_chat_history.append({"role": "assistant", "content": msg.content})
        
        # 현재 사용자 메시지를 대화 기록에 추가 (RAG 처리용)
        db_chat_history.append({"role": "user", "content": user_message})
        
        # RAG 챗봇 실행 (실제 run_langraph 함수 연동)
        print(f"🤖 RAG 챗봇 호출: level='{level}', session_id='{session_id}', history_length={len(db_chat_history)}")
        print(f"📝 대화 기록 미리보기: {db_chat_history[-3:] if len(db_chat_history) >= 3 else db_chat_history}")
        
        # 사용자 메시지를 DB에 저장 (RAG 처리 후)
        ChatMessage.objects.create(
            session=chat_session,
            message_type='user',
            content=user_message,
            level=level.upper()
        )
        
        try:
            # utils2.main의 run_langraph 함수 임포트 시도
            response = run_langraph(user_message, session_id, level, db_chat_history)
            
            # 응답에서 실제 답변 추출
            if isinstance(response, dict):
                bot_message = response.get('answer', '죄송합니다. 응답을 생성할 수 없습니다.')
            else:
                bot_message = str(response)
        except ImportError:
            # run_langraph 함수를 찾을 수 없는 경우 대체 응답
            print("Warning: run_langraph 함수를 찾을 수 없습니다. 기본 응답을 반환합니다.")
            bot_message = f"안녕하세요! '{user_message}'에 대한 질문을 받았습니다. 현재 RAG 시스템이 설정되지 않아 기본 응답을 드립니다. utils2.main.run_langraph 함수를 확인해주세요."
        except Exception as e:
            # 기타 오류 발생 시
            print(f"RAG 챗봇 실행 중 오류 발생: {e}")
            bot_message = f"죄송합니다. 시스템 오류가 발생했습니다: {str(e)}"
        
        # 봇 메시지 저장
        ChatMessage.objects.create(
            session=chat_session,
            message_type='bot',
            content=bot_message,
            level=level.upper()
        )
        
        # 세션 업데이트 시간 갱신
        chat_session.save()
        
        # 현재 시간
        current_time = datetime.now().strftime("%H:%M")
        
        response_data = {
            'success': True,
            'bot_message': bot_message,
            'timestamp': current_time,
            'level': level,
            'session_id': session_id,  # 세션 ID 반환,
            'user': user_to_dict(request.user)
        }
        
        # 첫 번째 메시지인 경우 업데이트된 타이틀 정보 추가
        if is_first_message and updated_title:
            response_data['updated_title'] = updated_title
            response_data['is_first_message'] = True
        
        return JsonResponse(response_data)
        
    except Exception as e:
        return JsonResponse({
            'error': f'서버 오류가 발생했습니다: {str(e)}'
        }, status=500)


@csrf_exempt
@login_required
def get_chat_history(request, session_id):
    """특정 세션의 채팅 히스토리 가져오기"""
    try:
        chat_session = ChatSession.objects.get(session_id=session_id, user=request.user)
        messages = ChatMessage.objects.filter(session=chat_session).order_by('timestamp')
        
        messages_data = []
        for msg in messages:
            message_data = {
                'message_type': msg.message_type,  # JavaScript에서 기대하는 필드명
                'content': msg.content,
                'timestamp': msg.timestamp.strftime('%H:%M'),
                'level': msg.level.lower() if msg.level else 'basic'
            }
            messages_data.append(message_data)
        
        return JsonResponse({
            'success': True,
            'session_title': chat_session.title,
            'messages': messages_data  # JavaScript에서 기대하는 필드명
        })
        
    except ChatSession.DoesNotExist:
        return JsonResponse({'error': '세션을 찾을 수 없습니다.'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@login_required
def delete_session(request, session_id):
    """채팅 세션 삭제"""
    try:
        chat_session = ChatSession.objects.get(session_id=session_id, user=request.user)
        chat_session.is_active = False
        chat_session.save()
        
        return JsonResponse({'success': True})
        
    except ChatSession.DoesNotExist:
        return JsonResponse({'error': '세션을 찾을 수 없습니다.'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# =================================================================================================
# 즐겨찾기 관련 API
# =================================================================================================

@csrf_exempt
@login_required
def add_favorite(request):
    """주식을 즐겨찾기에 추가"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            stock_code = data.get('code', '').strip()
            stock_name = data.get('name', '').strip()
            
            if not stock_code or not stock_name:
                return JsonResponse({'success': False, 'error': '주식 코드와 이름이 필요합니다.'})
            
            # Yahoo Finance 코드에서 KRX 코드 추출 (예: 122350.KQ -> 122350)
            krx_code = stock_code.replace('.KS', '').replace('.KQ', '')
            
            print(f"즐겨찾기 추가: 원본 코드={stock_code}, KRX 코드={krx_code}, 이름={stock_name}")
            
            # Stock 객체 생성 또는 가져오기
            stock, created = Stock.objects.get_or_create(
                code=krx_code,
                defaults={'name': stock_name}
            )
            
            if created:
                print(f"새 주식 생성: {stock.name} ({stock.code})")
            else:
                print(f"기존 주식 사용: {stock.name} ({stock.code})")
                # 기존 주식이 제네릭 이름("주식_CODE")을 가지고 있다면 올바른 이름으로 업데이트
                if stock.name.startswith("주식_"):
                    print(f"제네릭 이름을 올바른 이름으로 업데이트: {stock.name} -> {stock_name}")
                    stock.name = stock_name
                    stock.save()
                    print(f"주식 이름 업데이트 완료: {stock.name} ({stock.code})")
            
            # 즐겨찾기 추가 (중복 방지)
            favorite, created = StockFavorite.objects.get_or_create(
                user=request.user,
                stock=stock
            )
            
            if created:
                return JsonResponse({'success': True, 'message': '즐겨찾기에 추가되었습니다.'})
            else:
                return JsonResponse({'success': False, 'error': '이미 즐겨찾기에 추가된 주식입니다.'})
                
        except Exception as e:
            print(f"즐겨찾기 추가 오류: {e}")
            return JsonResponse({'success': False, 'error': f'오류가 발생했습니다: {str(e)}'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})


@csrf_exempt
@login_required
def remove_favorite(request):
    """주식을 즐겨찾기에서 제거"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            stock_code = data.get('code', '').strip()
            
            if not stock_code:
                return JsonResponse({'success': False, 'error': '주식 코드가 필요합니다.'})
            
            # Yahoo Finance 코드에서 KRX 코드 추출 (예: 122350.KQ -> 122350)
            krx_code = stock_code.replace('.KS', '').replace('.KQ', '')
            
            print(f"즐겨찾기 제거: 원본 코드={stock_code}, KRX 코드={krx_code}")
            
            # 즐겨찾기에서 제거
            try:
                stock = Stock.objects.get(code=krx_code)
                favorite = StockFavorite.objects.get(user=request.user, stock=stock)
                favorite.delete()
                return JsonResponse({'success': True, 'message': '즐겨찾기에서 제거되었습니다.'})
            except (Stock.DoesNotExist, StockFavorite.DoesNotExist):
                return JsonResponse({'success': False, 'error': '즐겨찾기에 없는 주식입니다.'})
                
        except Exception as e:
            print(f"즐겨찾기 제거 오류: {e}")
            return JsonResponse({'success': False, 'error': f'오류가 발생했습니다: {str(e)}'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})


@csrf_exempt
@login_required
def get_favorites(request):
    """사용자의 즐겨찾기 목록 조회"""
    if request.method == 'GET':
        try:
            favorites = StockFavorite.objects.filter(user=request.user).select_related('stock')
            
            favorites_data = []
            for favorite in favorites:
                # 각 주식의 전체 즐겨찾기 수 조회
                total_favorite_count = StockFavorite.objects.filter(stock=favorite.stock).count()
                
                favorites_data.append({
                    'code': favorite.stock.code,
                    'name': favorite.stock.name,
                    'favorite_count': total_favorite_count
                })
            
            return JsonResponse({
                'success': True, 
                'favorites': favorites_data,
                'count': len(favorites_data)
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': f'오류가 발생했습니다: {str(e)}'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})


@csrf_exempt
@login_required
def check_favorite_status(request):
    """특정 주식의 즐겨찾기 상태 확인"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            stock_code = data.get('code', '').strip()
            
            print(f"=== 즐겨찾기 상태 확인 시작 ===")
            print(f"요청 데이터: {data}")
            print(f"원본 코드: '{stock_code}'")
            
            if not stock_code:
                print("주식 코드가 비어있음")
                return JsonResponse({'success': False, 'error': '주식 코드가 필요합니다.'})
            
            # Yahoo Finance 코드에서 KRX 코드 추출 (예: 122350.KQ -> 122350)
            krx_code = stock_code.replace('.KS', '').replace('.KQ', '')
            
            print(f"변환된 KRX 코드: '{krx_code}'")
            
            # DB에서 해당 코드로 주식이 존재하는지 확인
            try:
                stock = Stock.objects.get(code=krx_code)
                print(f"주식 찾음: {stock.name} ({stock.code})")
            except Stock.DoesNotExist:
                print(f"주식이 존재하지 않음: '{krx_code}'")
                # 주식이 없으면 자동으로 생성 (임시 이름 사용)
                stock_name = f"주식_{krx_code}"
                stock = Stock.objects.create(code=krx_code, name=stock_name)
                print(f"주식 자동 생성: {stock.name} ({stock.code})")
            
            is_favorite = StockFavorite.objects.filter(user=request.user, stock=stock).exists()
            print(f"즐겨찾기 상태: {is_favorite}")
            return JsonResponse({'success': True, 'is_favorite': is_favorite})
                
        except Exception as e:
            print(f"즐겨찾기 상태 확인 오류: {e}")
            return JsonResponse({'success': False, 'error': f'오류가 발생했습니다: {str(e)}'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})


@csrf_exempt
def get_stock_favorite_count(request):
    """특정 주식의 전체 즐겨찾기 수 조회"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            stock_code = data.get('code', '').strip()
            
            if not stock_code:
                return JsonResponse({'success': False, 'error': '주식 코드가 필요합니다.'})
            
            # Yahoo Finance 코드에서 KRX 코드 추출 (예: 122350.KQ -> 122350)
            krx_code = stock_code.replace('.KS', '').replace('.KQ', '')
            
            print(f"즐겨찾기 수 조회: 원본 코드={stock_code}, KRX 코드={krx_code}")
            
            # 즐겨찾기 수 조회
            try:
                stock = Stock.objects.get(code=krx_code)
                favorite_count = StockFavorite.objects.filter(stock=stock).count()
                return JsonResponse({'success': True, 'favorite_count': favorite_count})
            except Stock.DoesNotExist:
                print(f"주식이 존재하지 않음: {krx_code}")
                return JsonResponse({'success': False, 'error': '존재하지 않는 주식입니다.'})
                
        except Exception as e:
            print(f"즐겨찾기 수 조회 오류: {e}")
            return JsonResponse({'success': False, 'error': f'오류가 발생했습니다: {str(e)}'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})


@csrf_exempt
@login_required
def get_stock_reviews(request):
    """특정 주식의 댓글 목록 조회"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            stock_code = data.get('code', '').strip()
            
            if not stock_code:
                return JsonResponse({'success': False, 'error': '주식 코드가 필요합니다.'})
            
            # Yahoo Finance 코드에서 KRX 코드 추출 (예: 122350.KQ -> 122350)
            krx_code = stock_code.replace('.KS', '').replace('.KQ', '')
            
            try:
                stock = Stock.objects.get(code=krx_code)
            except Stock.DoesNotExist:
                return JsonResponse({'success': False, 'error': '존재하지 않는 주식입니다.'})
            
            # 댓글 목록 조회 (최신순)
            reviews = StockReview.objects.filter(stock=stock).select_related('user').order_by('-created_at')
            
            reviews_data = []
            for review in reviews:
                # 각 댓글의 좋아요 수 조회
                like_count = StockReviewLike.objects.filter(stock_review=review).count()
                
                # 현재 사용자가 이 댓글에 좋아요를 눌렀는지 확인
                is_liked = StockReviewLike.objects.filter(user=request.user, stock_review=review).exists()
                
                # 시간을 "~분전", "~시간전" 형태로 변환
                time_diff = datetime.now(timezone.utc) - review.created_at.replace(tzinfo=timezone.utc)
                if time_diff.days > 0:
                    time_ago = f"{time_diff.days}일전"
                elif time_diff.seconds >= 3600:
                    hours = time_diff.seconds // 3600
                    time_ago = f"{hours}시간전"
                else:
                    minutes = time_diff.seconds // 60
                    time_ago = f"{minutes}분전"
                
                # 프로필 이미지 URL 생성
                profile_picture_url = None
                if review.user.profile_picture and review.user.profile_picture.name != 'profile_pics/robot-icon.png':
                    profile_picture_url = review.user.profile_picture.url
                
                reviews_data.append({
                    'id': review.id,
                    'content': review.content,
                    'user_nickname': review.user.nickname,
                    'profile_picture_url': profile_picture_url,
                    'created_at': time_ago,
                    'like_count': like_count,
                    'is_liked': is_liked,
                    'can_delete': review.user == request.user  # 자신의 댓글만 삭제 가능
                })
            
            return JsonResponse({
                'success': True,
                'reviews': reviews_data,
                'review_count': len(reviews_data)
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': f'오류가 발생했습니다: {str(e)}'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})


@csrf_exempt
@login_required
def add_stock_review(request):
    """주식 댓글 추가"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            stock_code = data.get('code', '').strip()
            content = data.get('content', '').strip()
            
            if not stock_code:
                return JsonResponse({'success': False, 'error': '주식 코드가 필요합니다.'})
            
            if not content:
                return JsonResponse({'success': False, 'error': '댓글 내용을 입력해주세요.'})
            
            if len(content) > 1000:
                return JsonResponse({'success': False, 'error': '댓글은 1000자 이내로 작성해주세요.'})
            
            # Yahoo Finance 코드에서 KRX 코드 추출 (예: 122350.KQ -> 122350)
            krx_code = stock_code.replace('.KS', '').replace('.KQ', '')
            
            try:
                stock = Stock.objects.get(code=krx_code)
            except Stock.DoesNotExist:
                return JsonResponse({'success': False, 'error': '존재하지 않는 주식입니다.'})
            
            # 댓글 생성
            review = StockReview.objects.create(
                user=request.user,
                stock=stock,
                content=content
            )
            
            return JsonResponse({
                'success': True,
                'message': '댓글이 등록되었습니다.',
                'review_id': review.id
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': f'오류가 발생했습니다: {str(e)}'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})


@csrf_exempt
@login_required
def delete_stock_review(request):
    """주식 댓글 삭제"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            review_id = data.get('review_id')
            
            if not review_id:
                return JsonResponse({'success': False, 'error': '댓글 ID가 필요합니다.'})
            
            try:
                review = StockReview.objects.get(id=review_id)
            except StockReview.DoesNotExist:
                return JsonResponse({'success': False, 'error': '존재하지 않는 댓글입니다.'})
            
            # 자신의 댓글만 삭제 가능
            if review.user != request.user:
                return JsonResponse({'success': False, 'error': '삭제 권한이 없습니다.'})
            
            review.delete()
            
            return JsonResponse({
                'success': True,
                'message': '댓글이 삭제되었습니다.'
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': f'오류가 발생했습니다: {str(e)}'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})


@csrf_exempt
@login_required
def toggle_review_like(request):
    """댓글 좋아요 토글"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            review_id = data.get('review_id')
            
            if not review_id:
                return JsonResponse({'success': False, 'error': '댓글 ID가 필요합니다.'})
            
            try:
                review = StockReview.objects.get(id=review_id)
            except StockReview.DoesNotExist:
                return JsonResponse({'success': False, 'error': '존재하지 않는 댓글입니다.'})
            
            # 좋아요 토글
            like, created = StockReviewLike.objects.get_or_create(
                user=request.user,
                stock_review=review
            )
            
            if not created:
                # 이미 좋아요가 있으면 삭제
                like.delete()
                is_liked = False
                action = 'removed'
            else:
                is_liked = True
                action = 'added'
            
            # 현재 좋아요 수 조회
            like_count = StockReviewLike.objects.filter(stock_review=review).count()
            
            return JsonResponse({
                'success': True,
                'is_liked': is_liked,
                'like_count': like_count,
                'action': action
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': f'오류가 발생했습니다: {str(e)}'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})


@csrf_exempt
@login_required
def chat_sessions(request):
    """사용자의 채팅 세션 목록"""
    sessions = ChatSession.objects.filter(user=request.user, is_active=True).order_by('-updated_at')
    return JsonResponse({
        'sessions': list(sessions.values('id', 'session_id', 'title', 'created_at', 'updated_at'))
    })


@csrf_exempt
@login_required
def create_session(request):
    """새 채팅 세션 생성"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            title = data.get('title', '새로운 대화')
            
            session = ChatSession.objects.create(
                user=request.user,
                session_id=str(uuid.uuid4()),
                title=title
            )
            
            return JsonResponse({
                'success': True,
                'session': {
                    'id': session.id,
                    'session_id': session.session_id,
                    'title': session.title,
                    'created_at': session.created_at.isoformat()
                }
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'POST 요청만 허용됩니다.'}, status=405)