---
layout: weekending
tags: 
date: 2021-11-05
---

Not much to report this week, still working on the follow-up to [Terraform CDK part 1]({% post_url 2021-10-30-Terraform CDK part 1 %}), which is a slow slog, mainly because I refuse to take the shortcuts used in the tutorials. It's amazing how much harder everything gets once you do not use the AWS console or an admin user.

I've got as far as having created the API Gateway:

![](/assets/images/2021-11-11-day04-tfgraph.svg)

It now turns out I know need to create deployments and stages, etc, before I can actually access it over the internet.

My determination to separate infrastructure from code is also going to hurt me, as I want to be able to update the lambda's code independently from my terraform configuration, which is, again, not the way the tutorials do it.

Still, loads of fun. In other news, I am still reading [Release It! (2nd Edition) - Design and Deploy Production-Ready Software](https://pragprog.com/titles/mnee2/release-it-second-edition/), as well as [AWS Certified Solutions Architect Study Guide: Associate SAA-C01 Exam 2nd Edition](https://www.amazon.com/Certified-Solutions-Architect-Study-Guide/dp/111950421X), and doing a lot of googling around AWS infrastructure in general, and network entry points (Gateways, WAFs, ALBs, etc...) in general. And a bit of dynamodDB to support a project starting next week.  


