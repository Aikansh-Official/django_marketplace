from django.contrib import admin
from .models import Category, Listing, ListingImage, Offer, Wishlist

class ListingImageInline(admin.TabularInline):
    model = ListingImage
    extra = 1

class ListingAdmin(admin.ModelAdmin):
    list_display = ('title', 'seller', 'price', 'transaction_type', 'status', 'created_at')
    list_filter = ('transaction_type', 'status', 'condition', 'category')
    search_fields = ('title', 'description', 'seller__username')
    inlines = [ListingImageInline]

class OfferAdmin(admin.ModelAdmin):
    list_display = ('buyer', 'listing', 'offer_amount', 'status', 'created_at')
    list_filter = ('status',)

admin.site.register(Category)
admin.site.register(Listing, ListingAdmin)
admin.site.register(Offer, OfferAdmin)
admin.site.register(Wishlist)
