from django.urls import path
from . import views
from .views import chat_api



app_name = 'app'

urlpatterns = [
    path('', views.chatbot, name='chatbot'),
    path('api/crawl-news/', views.crawl_naver_news, name='crawl_news'),
    path('api/get-stock-info/', views.get_stock_info, name='get_stock_info'),
    path('chat_api/', views.chat_api, name='chat_api'),
]
   
   
    
    
    

