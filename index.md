---
layout: home
title: Franck's stuff
---


# Latest posts


{% for post in site.posts %}

## [{{ post.title }}]({{ post.url }})
{{ post.excerpt }}

{% endfor %}

# Interesting links I recently found 

{% for post in site.links %}

## [{{ post.title }}]({{ post.url }})
{{ post.excerpt }}

{% endfor %}

