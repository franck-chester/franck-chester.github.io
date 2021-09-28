---
title: Generate Jekyll pages with GitHub actions
tags: github jekyll
---

Now that I have [customised Jekyll]({% link _posts/2021-09-28-customising jekyll.md%}) I want to simplify my workflow.

Although I am starting this with a bunch of actual posts, most of my content will be links. I usually share these as soon as I've followed the link and read the content, usually straight from my phone while browsing in the evening.

I therefore need the ability to generate *links* entries on my site as easily as possible, from my phone.

My plan is to use [GitHub actions with a manual trigger](https://github.blog/changelog/2020-07-06-github-actions-manual-triggers-with-workflow_dispatch/) to generate the markdown files, with [action inputs](https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions#inputs) matched to the required front-matter variables.

## Generate files with GitHub actions

First of all, what do I need to generate files in my repository from a GitHub action? 
We'll the [Write File Action](https://github.com/marketplace/actions/write-file), as echoing `echo` each line in a [`run` step](https://docs.github.com/en/actions/learn-github-actions/workflow-syntax-for-github-actions#jobsjob_idstepsrun) looks like a pain.

The content of the file is easier to define as a [multiline string](https://alisoftware.github.io/yaml/2021/08/19/yaml-part2-strings/), indicated wth a pipe `|`.

I also need to set the date in the filename. 
I'll do it as per this [SO answer](https://stackoverflow.com/a/60942437), which uses the [`::set-output::` workflow command](https://docs.github.com/en/actions/learn-github-actions/workflow-commands-for-github-actions).

Finally, we need to [commit the file back to main](https://lannonbr.com/blog/2019-12-09-git-commit-in-actions).
Unfortunately this doesn't trigger our jekyll build action, as explained [here](https://github.community/t/github-action-not-triggering-gh-pages-upon-push/16096) :sad:

At this stage I have not figured out why using a personal token hasn't worked around this issue.... To be coninues



