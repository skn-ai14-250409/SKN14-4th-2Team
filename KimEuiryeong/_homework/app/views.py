from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from urllib.parse import quote
import requests
import os
from bs4 import BeautifulSoup
import yfinance as yf
from pykrx import stock as pykrx_stock
import pandas as pd
from datetime import datetime, timedelta, timezone
import numpy as np
from .utils2.stock_node import handle_analysis_node

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
    return render(request, 'app/main.html')

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
            # 1. 별칭(alias) 및 대소문자 처리
            search_term = company_name.lower().replace(" ", "")
            if search_term in STOCK_ALIASES:
                company_name = STOCK_ALIASES[search_term]

            # 2. 정확한 이름으로 코드 찾기 (대소문자 무시)
            found_code = None
            found_name = None
            for name, code in name_to_code.items():
                if name.lower().replace(" ", "") == company_name.lower().replace(" ", ""):
                    found_code = code
                    found_name = name
                    break
            
            if not found_code:
                # 3. 일치하는 항목이 없으면, 유사한 기업명 찾기
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