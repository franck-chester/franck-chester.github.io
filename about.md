---
layout: default
title: Franck's 'blog'
---
# Franck's 'blog'

Over the years I have strived to share any and all knowledge I gain through my endless browsing and googling, usually by simply posting links and comments in various forums, be it Twitter, LinkedIn or my current employer's intranet.

This works relatively well, but means I actually lose track of it all, making hard to revisit when I actually need the information for myself. It can also get quite noisy when I am deep in any specific subject.
Plus, as I hate cross-posting, I continuously have to second guess who could be interested in what, and more often than not target the wrong people, which is a shame.

A colleague of mine at Very (*hi Paul!*) does something similar, but with a better structured weekly 'things of note' blog he links us to on the intranet.

I have therefore decided to create this very basic blog site as a way to give some structure to it all.
I do not expect to generate particularly innovative content, I leave that to smarter people. 
Instead, I will document and comment on those tidbits I keep stumbling on during my day job, and my evening browsing. 

Hopefully this can also be useful to others, but really, I am really doing this for myself in the first place.

# Latest posts

{% for post in site.posts %}

##[{{ post.title }}]({{ post.url }})
{{ post.excerpt }}

{% endfor %}

