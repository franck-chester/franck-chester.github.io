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

At this stage I have not figured out why using a personal token hasn't worked around this issue.... To be continued

Plan B is to use a `repository_dispatch` event trigger as per [this article](https://blog.marcnuri.com/triggering-github-actions-across-different-repositories).

Which works!!

Final workflow definition looks like this (check the repo for the latest definition)

``` yaml
name: Generate a new file in the _links folder

on:
  workflow_dispatch:
    inputs:
      title:
        description: 'A user friendly name/description for the URL we are sharing'     
        required: true
      target:
        description: 'The URL we are sharing'     
        required: true
        default: ''
      source:
        description: 'Where (free text) did we find out about the URL we are sharing'     
        required: true
        default: 'the internet'
      source_url:
        description: 'Where (URL) did we find out about the URL we are sharing'     
        required: false
      tags:
        description: 'Space separated list of tags'     
        required: true
      blurb:
        description: 'Some text to explain why you are sharing'     
        required: true
        default: 'This looks interesting...'

jobs:
  newlink:
    runs-on: ubuntu-latest
    steps:
      - name: Clone repository
        uses: actions/checkout@v2

      - name: Generate the filename
        id: filename
        run: |
          date="$(date +'%Y-%m-%d')"
          filename="${date}-${{ github.event.inputs.title }}.md"
          echo "filename = ${filename}"
          echo "::set-output name=filename::${filename}"

      - name: Generate new link file
        uses: DamianReeves/write-file-action@v1.0
        with:
          path: _links/${{ steps.filename.outputs.filename }}
          write-mode: append
          contents: |
            ---
            title: ${{ github.event.inputs.title }}
            target : ${{ github.event.inputs.target }}
            source : ${{ github.event.inputs.source }}
            source_url : ${{ github.event.inputs.source_url }}
            tags: ${{ github.event.inputs.tags }}
            ---

            ${{ github.event.inputs.blurb }}

      - name: Commit and push files
        run: |
          git config user.name "NewLink GitHub Action"
          git config user.email "<>"
          git add _links/${{ steps.date.outputs.filename }}
          git commit -m "New link: ${{ steps.filename.outputs.filename }}"
          git push https://${{ secrets.MY_TOKEN }}@github.com/${{github.repository}}.git main

      - name: Trigger jekyll build
        run: |
          curl -X POST https://api.github.com/repos/${{github.repository}}/dispatches \
          -H 'Accept: application/vnd.github.everest-preview+json' \
          -u ${{ secrets.MY_TOKEN }} \
          --data '{"event_type": "New link: ${{ steps.filename.outputs.filename }}", "client_payload": { "customField": "customValue" }}'

```
