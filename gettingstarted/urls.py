from django.urls import path, include

from django.contrib import admin

admin.autodiscover()

import hello.views
import match.views

urlpatterns = [
    path("", hello.views.index, name="index"),
    path("register/<game>/<ip>/<int:port>/", match.views.register, name="register"),
    path("lookup/<game>/<player_id>/", match.views.lookup, name="lookup"),
    path("db/", hello.views.db, name="db"),
    path("admin/", admin.site.urls),
]
