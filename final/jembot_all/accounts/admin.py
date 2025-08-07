from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from app.models import CustomUser, ChatSession, ChatMessage, Stock, StockFavorite, StockReview, StockReviewLike

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['email', 'username', 'nickname', 'name', 'is_staff', 'is_active']
    list_filter = ['is_staff', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('추가 정보', {'fields': ('nickname', 'name', 'profile_picture')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('추가 정보', {'fields': ('nickname', 'name', 'profile_picture')}),
    )
    search_fields = ['email', 'username', 'nickname', 'name']
    ordering = ['email']

admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(ChatSession)
admin.site.register(ChatMessage)
admin.site.register(Stock)
admin.site.register(StockFavorite)
admin.site.register(StockReview)
admin.site.register(StockReviewLike) 