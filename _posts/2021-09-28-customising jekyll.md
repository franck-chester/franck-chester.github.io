---
title: Customising Jekyll
tags: jekyll github liquid
---

Following my initial setup of Jekyll (as per [Setting up my GitHub page with Jekyll]({% link _posts/2021-09-27-jekyll.md %})), I now want to customise the site to meet my personal requirements.

First of all, I do not intend to blog daily, not really my style. I am however a prolific internet browser, and like to share interesting links I stumble about. 
I do not like cross-posting, therefore I usually have to chose whether to share on twitter, linkedin or my current job's intranet. 
This means that 1) I might not reach the right audience and 2) I later cannot find these interesting links when their subject matter becomes relevant to the job at hand.

I therefore want to use this site to curate links, and make it as easy as possible for me to write and publish the information, ideally as easy as it would be when I share to social media. 
*Links* will be managed as a separate Jekyll [collection](https://jekyllrb.com/docs/collections/) so that:
- they do not appear in the main feed, as it would dilute it and make it boring
- get styled differently from *posts*, mainly to use [front-matter custom variables](https://jekyllrb.com/docs/front-matter/#custom-variables) to define the link, giving it a title, a url, a source and some optional descriptive content (although tbf, this is usually limited to '*hey, this is interesting*')

Second, I am keen on tagging content. Again, this is to allow me to find my own material at a later date. 
Now, unfortunately, Jekyll is not consistent in how it exposes tagged content, with `site.tags` only returning the tags used on *posts*, while *collections* need to be iterated separately to find the tags.  
I will therefore need to customise (aka hack) So-Solid's [tags layout](https://github.com/mmistakes/so-simple-theme#layout-tags) to include tagged *links*.

Finally, I want to emulate a colleague of mine (*hi Paul!*) who publishes a weekly summary of his reading/viewing/listening to our colleagues, which is a much better way to do it than my wanton posting on random intranet channels.
I will therefore create yet another collection, *weekending*, with its own custom layout, to group *posts* and *links* per week, with an optional blurb should I want to expand on my tech activities that week.

## Collections

As per the instructions, add this to my `_config.yaml`:

``` yaml
collections:
  thisWeek:
    output: true
  links:
    output: true
```

and this, to apply default layouts:

``` yaml
defaults:
  - 
    scope:
      path: "_thisWeek"
      layout: posts
    values:
      strip_title: true

  -
    scope:
      path: "_links" 
      type: "links" 
    values:
      layout: link
```

`strip_title: true` is used with the [jekyll-titles-from-headings](https://www.rubydoc.info/gems/jekyll-titles-from-headings/0.5.3) plugin to ensure that So-Simple doesn't display the collection name as well as the actual title.

## Link layout

Is a cut and paste from the So-Solid `post.html` layout (to display a single *post*), hacked to display the *link* variables:
- `target`: the actual URL I want to share
- `title`: a short description of the link
- `source`: where/how I found that link in the first place (free text)
- `source_url`: where/how I found that link in the first place (URL)
- `tags`: keywords associated with this link

See [the result](/links/)

## Week Ending layout

Another cut and paste, this time from the So-Solid  `posts.html` layout (to display multiple *posts*), hacked so that:
- it displays a standard title of 'Week ending' and the front-matter variable `date`
- it displays *posts* AND *links*, under separate headings
- it filter these based on their date being within 7 days of the front-matter variable `date`

The main difficulty here was filtering on dates. The trick is to use the [`capture` tag](https://shopify.github.io/liquid/tags/variable/) to create time variables in unix format (number of seconds) which can then be manipulated as integers:

{% raw %}
``` liquid
{% capture weekending %}{{page.date | date: "%s" }}{% endcapture %}
{% capture seven_days_ago %}{{weekending |minus: 604800}}{% endcapture %}
{% capture date %}{{entry.date | date: '%s'}}{% endcapture %}
{% if seven_days_ago < date  and date <= weekending %}
  ... show the post or link ...
{% endif %}
```
{% endraw %}

See [the result](/thisweek/)
## Tags layout

Another cut and paste, this time from the So-Solid `tags.html` layout (to display *posts* grouped by *tag*), hacked so that it considers tagged *posts* AND *links*.

The hardest bit here was to deal with Liquid arrays. An initial google of the issue led to all sort of outdated advice, until I figured out that [Jekyll version of Liquid](https://jekyllrb.com/docs/liquid/) provides additional array [filters](https://jekyllrb.com/docs/liquid/filters/) that make it slightly easier to manipulate them.

To initialise an empty array, you still need to split an empty string, but you can then use the `push` filter to add entries to it:

{% raw %}
``` liquid
{% assign items = "" | split: ',' %}
{% assign items = "" | push: 'a value' %}
```
{% endraw %}

That said, after a lot of faffing, I simply filtered down tag collections before concatenating them:
{% raw %}
``` liquid
{% assign taggedItems = "" | split: ',' %}
{% assign taggedItems = taggedItems  | concat: site.posts| where_exp : "post", "post.tags contains tag" %}
{% assign taggedItems = taggedItems  | concat: site.links | where_exp : "link", "link.tags contains tag" %}
```
{% endraw %}

What is really pants is that Liquid doesn't give us access to Map objects, other than through the `group_by` filter.
My logic therefore is forced to iterate through all tagged content multiple time in order to replicate the logic of the original layout, which itself could do with the built-in `site.tags` map, keyed on tag names.

## Includes

So-Solid makes heavy use of Jekyll [includes](https://jekyllrb.com/docs/includes/).  
Unfortunately, these stopped me making a simple cut and paste of the So-Solid's layouts, without cut and pasting the entire `include` folder into mine.
I will, later, try and see if I could reference the file within the `gemfile`.
I have also initially made a mess of things by cut and pasting the markup from these files into mines, which will lead to duplication and might stop me from picking up bug fixes in later releases of So-Solid. I will tidy this up later.

## Debugging Liquid

Worth remembering this trick : you can use Jekyll `inspect` [filter](https://jekyllrb.com/docs/liquid/filters/) to dump the value of any variable:

{% raw %}
``` liquid
myVariable = {{ myVariable| inspect }} 
```
{% endraw %}

