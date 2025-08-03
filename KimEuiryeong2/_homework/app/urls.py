from django.urls import path
from . import views

app_name = 'app'

urlpatterns = [
    path('', views.chatbot, name='chatbot'),
    path('stock/', views.stock, name='stock'),
    path('api/crawl-news/', views.crawl_naver_news, name='crawl_news'),
    path('api/get-stock-info/', views.get_stock_info, name='get_stock_info'),

    path('get-stock-rag/', views.get_stock_rag, name='get_stock_rag'),
]
