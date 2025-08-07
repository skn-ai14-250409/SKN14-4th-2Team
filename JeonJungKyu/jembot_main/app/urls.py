from django.urls import path
from . import views
from . import auth_views

app_name = 'app'

urlpatterns = [
    # 메인 페이지
    path('', views.chatbot, name='chatbot'),
    path('stock/', views.stock, name='stock'),
    
    # 챗봇 API
    path('api/chat/', views.chat_api, name='chat_api'),
    
    # 인증 관련 URL
    path('login/', auth_views.google_login, name='login'),
    path('accounts/google/login/callback/', auth_views.google_callback, name='google_callback'),
    path('logout/', auth_views.logout_view, name='logout'),
    path('profile/', auth_views.user_profile, name='profile'),
    
    # 채팅 세션 관리
    path('api/sessions/', auth_views.chat_sessions, name='chat_sessions'),
    path('api/sessions/create/', auth_views.create_session, name='create_session'),
    path('api/sessions/<str:session_id>/history/', views.get_chat_history, name='get_chat_history'),
    path('api/sessions/<str:session_id>/delete/', views.delete_session, name='delete_session'),
    
    # 기존 주식 관련 API
    path('api/crawl-news/', views.crawl_naver_news, name='crawl_news'),
    path('api/get-stock-info/', views.get_stock_info, name='get_stock_info'),
    path('get-stock-rag/', views.get_stock_rag, name='get_stock_rag'),
]
